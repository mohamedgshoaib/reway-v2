import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "../../types/database.generated.ts"
import { DurableWorkerError } from "./durable-worker-error.ts"
import type {
  ClaimedDurableWork,
  DurableClaimResult,
  DurableEnvelope,
  DurableFinishState,
  DurableQueueMessage,
  DurableQueueName,
  DurableWorkerAdapter,
  DurableWorkOutcome,
  PoisonMessageReason,
} from "./durable-worker-types.ts"

export type SupabaseDurableWorkerClient = SupabaseClient<Database>

export type SupabaseDurableWorkerFinisher<Result> = (
  client: SupabaseDurableWorkerClient,
  claim: ClaimedDurableWork,
  outcome: DurableWorkOutcome<Result>,
  retryAtMs: number | null
) => Promise<DurableFinishState>

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DECIMAL_PATTERN = /^[1-9][0-9]*$/
const CLAIM_STATUSES = new Set([
  "busy",
  "exhausted",
  "missing",
  "not_due",
  "stale_message",
  "terminal",
])

export const createDurableWorkerDatabaseError = (
  error: Pick<PostgrestError, "code">
): DurableWorkerError =>
  new DurableWorkerError(
    "database_unavailable",
    "The durable worker database request failed.",
    error.code !== "42501"
  )

export const createInvalidDurableWorkerResultError = (): DurableWorkerError =>
  new DurableWorkerError(
    "invalid_database_result",
    "The durable worker database result was invalid.",
    false
  )

const requireTimestamp = (value: string): number => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw createInvalidDurableWorkerResultError()
  return timestamp
}

const parseClaim = (value: Json): DurableClaimResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw createInvalidDurableWorkerResultError()
  }
  const status = value.status
  if (status === "claimed") {
    if (
      typeof value.lease_token !== "string" ||
      !UUID_PATTERN.test(value.lease_token) ||
      typeof value.attempt_count !== "number" ||
      !Number.isSafeInteger(value.attempt_count) ||
      value.attempt_count < 0 ||
      typeof value.max_attempts !== "number" ||
      !Number.isSafeInteger(value.max_attempts) ||
      value.max_attempts < 1
    ) {
      throw createInvalidDurableWorkerResultError()
    }
    return {
      attemptCount: value.attempt_count,
      leaseToken: value.lease_token,
      maxAttempts: value.max_attempts,
      status,
    }
  }
  if (typeof status === "string" && CLAIM_STATUSES.has(status)) {
    return {
      status: status as Exclude<DurableClaimResult["status"], "claimed">,
    }
  }
  throw createInvalidDurableWorkerResultError()
}

const toClaimArgs = (
  queueName: DurableQueueName,
  message: DurableQueueMessage,
  envelope: DurableEnvelope,
  leaseSeconds: number
) =>
  envelope.workKind === "enrichment"
    ? {
        functionName: "worker_claim_enrichment_message" as const,
        parameters: {
          lease_seconds: leaseSeconds,
          target_generation: envelope.generation,
          target_message_id: message.messageId,
          target_queue_name: queueName,
          target_request_id: envelope.requestId,
        },
      }
    : {
        functionName: "worker_claim_transfer_message" as const,
        parameters: {
          lease_seconds: leaseSeconds,
          target_job_id: envelope.jobId,
          target_message_id: message.messageId,
          target_queue_name: queueName,
          target_work_kind: envelope.workKind,
        },
      }

export const createSupabaseDurableWorkerAdapter = <Result>(
  client: SupabaseDurableWorkerClient,
  finishClaim: SupabaseDurableWorkerFinisher<Result>
): DurableWorkerAdapter<Result> => ({
  claim: async (queueName, message, envelope, leaseSeconds) => {
    const request = toClaimArgs(queueName, message, envelope, leaseSeconds)
    const response =
      request.functionName === "worker_claim_enrichment_message"
        ? await client.rpc(request.functionName, request.parameters)
        : await client.rpc(request.functionName, request.parameters)
    if (response.error) throw createDurableWorkerDatabaseError(response.error)
    return parseClaim(response.data)
  },
  deleteTerminal: async (queueName, messageId) => {
    const { data, error } = await client.rpc("worker_delete_terminal_message", {
      target_message_id: messageId,
      target_queue_name: queueName,
    })
    if (error) throw createDurableWorkerDatabaseError(error)
    return data ? "deleted" : "already_deleted"
  },
  finish: (claim, outcome, retryAtMs) =>
    finishClaim(client, claim, outcome, retryAtMs),
  read: async (queueName, visibilitySeconds, batchSize) => {
    const { data, error } = await client.rpc("worker_read_queue", {
      batch_size: batchSize,
      target_queue_name: queueName,
      visibility_seconds: visibilitySeconds,
    })
    if (error) throw createDurableWorkerDatabaseError(error)
    return data.map((message) => {
      if (
        !DECIMAL_PATTERN.test(message.message_id) ||
        !Number.isSafeInteger(message.delivery_count) ||
        message.delivery_count < 1
      ) {
        throw createInvalidDurableWorkerResultError()
      }
      return {
        deliveryCount: message.delivery_count,
        enqueuedAtMs: requireTimestamp(message.enqueued_at),
        envelope: message.envelope,
        messageId: message.message_id,
        visibleAtMs: requireTimestamp(message.visible_at),
      }
    })
  },
  rejectPoison: async (queueName, message, reason) => {
    const { data, error } = await client.rpc("worker_reject_poison_message", {
      target_delivery_count: message.deliveryCount,
      target_message_id: message.messageId,
      target_queue_name: queueName,
      target_reason_code: reason satisfies PoisonMessageReason,
    })
    if (error) throw createDurableWorkerDatabaseError(error)
    return data
  },
  renew: async (claim, leaseSeconds, visibilitySeconds) => {
    const { envelope, message, queueName } = claim
    if (envelope.workKind === "enrichment") {
      const { data, error } = await client.rpc(
        "worker_renew_enrichment_lease",
        {
          lease_seconds: leaseSeconds,
          target_generation: envelope.generation,
          target_lease_token: claim.leaseToken,
          target_message_id: message.messageId,
          target_queue_name: queueName,
          target_request_id: envelope.requestId,
          visibility_seconds: visibilitySeconds,
        }
      )
      if (error) throw createDurableWorkerDatabaseError(error)
      return data
    }
    const { data, error } = await client.rpc("worker_renew_transfer_lease", {
      lease_seconds: leaseSeconds,
      target_job_id: envelope.jobId,
      target_lease_token: claim.leaseToken,
      target_message_id: message.messageId,
      target_queue_name: queueName,
      visibility_seconds: visibilitySeconds,
    })
    if (error) throw createDurableWorkerDatabaseError(error)
    return data
  },
  startAttempt: async (claim) => {
    const { envelope } = claim
    if (envelope.workKind === "enrichment") {
      const { data, error } = await client.rpc(
        "worker_start_enrichment_attempt",
        {
          target_generation: envelope.generation,
          target_lease_token: claim.leaseToken,
          target_request_id: envelope.requestId,
        }
      )
      if (error) throw createDurableWorkerDatabaseError(error)
      return data
    }
    const { data, error } = await client.rpc("worker_start_transfer_attempt", {
      target_job_id: envelope.jobId,
      target_lease_token: claim.leaseToken,
    })
    if (error) throw createDurableWorkerDatabaseError(error)
    return data
  },
})
