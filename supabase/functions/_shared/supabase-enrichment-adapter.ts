import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import {
  BookmarkAssetProcessorError,
  type BookmarkAssetRegistry,
} from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"
import type {
  EnrichmentHandlerResult,
  EnrichmentWorkInput,
  EnrichmentWorkSource,
} from "../../../src/lib/bookmark-enrichment/enrichment-handler.ts"
import type {
  ClaimedDurableWork,
  DurableBatchFinishInput,
  DurableBatchFinishResult,
  DurableBatchPrepareResult,
  DurableFinishState,
  DurableWorkerBatchAdapter,
  DurableWorkOutcome,
} from "../../../src/lib/durable-worker/durable-worker-types.ts"
import {
  createDurableWorkerDatabaseError,
  createInvalidDurableWorkerResultError,
  type SupabaseDurableWorkerClient,
  type SupabaseDurableWorkerFinisher,
} from "../../../src/lib/durable-worker/supabase-durable-worker-adapter.ts"
import type { Database } from "../../../src/types/database.generated.ts"

type RpcResult = {
  data: unknown
  error: PostgrestError | null
}

type UntypedRpc = (
  functionName: string,
  parameters: Record<string, unknown>
) => Promise<RpcResult>

const DECIMAL_PATTERN = /^[1-9][0-9]*$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_PATTERN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u
const CLAIM_STATUSES = new Set([
  "busy",
  "exhausted",
  "missing",
  "not_due",
  "stale_message",
  "terminal",
])
const FINISH_STATES = new Set<DurableFinishState>([
  "cancelled",
  "completed",
  "completed_with_failures",
  "failed",
  "queued",
  "rejected",
])

const getRpc = (client: SupabaseClient<Database>): UntypedRpc =>
  client.rpc.bind(client) as unknown as UntypedRpc

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }
}

const throwDatabaseFailure = (error: PostgrestError): never => {
  throw createDurableWorkerDatabaseError(error)
}

const requireBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw createInvalidDurableWorkerResultError()
  }
  return value
}

const requireObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw createInvalidDurableWorkerResultError()
  }
  return value as Record<string, unknown>
}

const requireDecimalString = (value: unknown): string => {
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) {
    throw createInvalidDurableWorkerResultError()
  }
  return value
}

const requireUuid = (value: unknown): string => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw createInvalidDurableWorkerResultError()
  }
  return value
}

const requirePositiveInteger = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw createInvalidDurableWorkerResultError()
  }
  return value as number
}

const parseBatchPrepareResult = (
  value: unknown
): DurableBatchPrepareResult<EnrichmentWorkInput | null> => {
  const result = requireObject(value)
  const messageId = requireDecimalString(result.message_id)
  if (result.status === "claimed") {
    const fallbackTitle = result.fallback_title
    const url = result.url
    const bothMissing = fallbackTitle === null && url === null
    const bothPresent =
      typeof fallbackTitle === "string" &&
      fallbackTitle.trim().length > 0 &&
      typeof url === "string" &&
      url.length > 0
    if (!bothMissing && !bothPresent) {
      throw createInvalidDurableWorkerResultError()
    }
    return {
      attemptCount: requirePositiveInteger(result.attempt_count),
      leaseToken: requireUuid(result.lease_token),
      maxAttempts: requirePositiveInteger(result.max_attempts),
      messageId,
      preparedInput: bothMissing
        ? null
        : { fallbackTitle: fallbackTitle as string, url: url as string },
      status: "claimed",
    }
  }
  if (typeof result.status === "string" && CLAIM_STATUSES.has(result.status)) {
    return {
      messageId,
      status: result.status as Exclude<
        DurableBatchPrepareResult<never>["status"],
        "claimed"
      >,
    }
  }
  throw createInvalidDurableWorkerResultError()
}

const parseBatchFinishResult = (value: unknown): DurableBatchFinishResult => {
  const result = requireObject(value)
  const finishState = result.finish_state
  const terminalDeleteOutcome = result.terminal_delete_outcome
  if (
    typeof finishState !== "string" ||
    !FINISH_STATES.has(finishState as DurableFinishState)
  ) {
    throw createInvalidDurableWorkerResultError()
  }
  if (
    terminalDeleteOutcome !== null &&
    terminalDeleteOutcome !== "already_deleted" &&
    terminalDeleteOutcome !== "deleted"
  ) {
    throw createInvalidDurableWorkerResultError()
  }
  return {
    finishState: finishState as DurableFinishState,
    messageId: requireDecimalString(result.message_id),
    terminalDeleteOutcome,
  }
}

const toFinishParameters = (
  claim: ClaimedDurableWork,
  outcome: DurableWorkOutcome<EnrichmentHandlerResult>,
  retryAtMs: number | null
): Record<string, unknown> => {
  if (claim.envelope.workKind !== "enrichment") {
    throw createInvalidDurableWorkerResultError()
  }
  const succeeded = outcome.status === "succeeded"
  const result = succeeded ? outcome.result : null
  return {
    generation: claim.envelope.generation,
    lease_token: claim.leaseToken,
    message_id: claim.message.messageId,
    request_id: claim.envelope.requestId,
    result_domain: result?.domain ?? null,
    result_failure_class: succeeded
      ? null
      : outcome.status === "transient_failure"
        ? "transient"
        : "permanent",
    result_favicon_asset_id: result?.faviconAssetId ?? null,
    result_internal_error: succeeded ? null : outcome.code,
    result_og_image_asset_id: result?.ogImageAssetId ?? null,
    result_public_error_code: succeeded ? null : "metadata_fetch_failed",
    result_title: result?.title ?? null,
    retry_at: retryAtMs === null ? null : new Date(retryAtMs).toISOString(),
    succeeded,
  }
}

export const createSupabaseEnrichmentBatchAdapter = (
  client: SupabaseClient<Database>
): DurableWorkerBatchAdapter<
  EnrichmentHandlerResult,
  EnrichmentWorkInput | null
> => ({
  finish: async (
    inputs: readonly DurableBatchFinishInput<EnrichmentHandlerResult>[]
  ) => {
    if (inputs.length === 0) return []
    const queueName = inputs[0].claim.queueName
    if (inputs.some((input) => input.claim.queueName !== queueName)) {
      throw createInvalidDurableWorkerResultError()
    }
    const response = await getRpc(client)("worker_finish_enrichment_batch", {
      target_queue_name: queueName,
      target_results: inputs.map(({ claim, outcome, retryAtMs }) =>
        toFinishParameters(claim, outcome, retryAtMs)
      ),
    })
    if (response.error !== null) throwDatabaseFailure(response.error)
    if (!Array.isArray(response.data)) {
      throw createInvalidDurableWorkerResultError()
    }
    return response.data.map(parseBatchFinishResult)
  },
  prepare: async (queueName, inputs, leaseSeconds) => {
    if (inputs.some((input) => input.envelope.workKind !== "enrichment")) {
      throw createInvalidDurableWorkerResultError()
    }
    const response = await getRpc(client)("worker_prepare_enrichment_batch", {
      lease_seconds: leaseSeconds,
      target_messages: inputs.map(({ envelope, message }) => ({
        generation:
          envelope.workKind === "enrichment" ? envelope.generation : null,
        message_id: message.messageId,
        request_id:
          envelope.workKind === "enrichment" ? envelope.requestId : null,
      })),
      target_queue_name: queueName,
    })
    if (response.error !== null) throwDatabaseFailure(response.error)
    if (!Array.isArray(response.data)) {
      throw createInvalidDurableWorkerResultError()
    }
    return response.data.map(parseBatchPrepareResult)
  },
})

export const createSupabaseEnrichmentWorkSource = (
  client: SupabaseClient<Database>
): EnrichmentWorkSource => ({
  read: async (envelope, leaseToken, signal) => {
    requireActive(signal)
    const bookmarkIdResult = await getRpc(client)(
      "worker_read_enrichment_bookmark_id",
      {
        target_generation: envelope.generation,
        target_lease_token: leaseToken,
        target_request_id: envelope.requestId,
      }
    )
    if (bookmarkIdResult.error !== null) {
      throwDatabaseFailure(bookmarkIdResult.error)
    }
    requireActive(signal)
    if (bookmarkIdResult.data === null) return null
    if (
      typeof bookmarkIdResult.data !== "string" ||
      !DECIMAL_PATTERN.test(bookmarkIdResult.data)
    ) {
      throw createInvalidDurableWorkerResultError()
    }
    const bookmark = await client
      .from("bookmarks")
      .select("url,title")
      .filter("id", "eq", bookmarkIdResult.data)
      .maybeSingle()
    if (bookmark.error !== null) throwDatabaseFailure(bookmark.error)
    requireActive(signal)
    if (bookmark.data === null) return null
    if (
      typeof bookmark.data.url !== "string" ||
      bookmark.data.url.length === 0 ||
      typeof bookmark.data.title !== "string" ||
      bookmark.data.title.trim().length === 0
    ) {
      throw createInvalidDurableWorkerResultError()
    }
    return {
      fallbackTitle: bookmark.data.title,
      url: bookmark.data.url,
    }
  },
})

export const createSupabaseBookmarkAssetRegistry = (
  client: SupabaseClient<Database>
): BookmarkAssetRegistry => ({
  markReady: async (input) => {
    const response = await getRpc(client)("worker_mark_bookmark_asset_ready", {
      target_asset_id: input.assetId,
      target_byte_size: input.byteSize,
      target_checksum: input.checksumHex,
      target_generation: input.generation,
      target_height: input.height,
      target_lease_token: input.leaseToken,
      target_request_id: input.requestId,
      target_width: input.width,
    })
    if (response.error !== null) {
      throw new BookmarkAssetProcessorError(
        "asset_registry_failed",
        response.error.code !== "42501"
      )
    }
    return requireBoolean(response.data)
  },
  reserve: async (input) => {
    const response = await getRpc(client)("worker_reserve_bookmark_asset", {
      target_asset_id: input.assetId,
      target_content_type: input.contentType,
      target_generation: input.generation,
      target_kind: input.kind,
      target_lease_token: input.leaseToken,
      target_request_id: input.requestId,
    })
    if (response.error !== null) {
      throw new BookmarkAssetProcessorError(
        "asset_registry_failed",
        response.error.code !== "42501" && response.error.code !== "23505"
      )
    }
    if (
      typeof response.data !== "string" ||
      response.data.length === 0 ||
      response.data.length > 512 ||
      CONTROL_PATTERN.test(response.data)
    ) {
      throw new BookmarkAssetProcessorError("asset_registry_failed", false)
    }
    return response.data
  },
})

export const finishSupabaseEnrichmentClaim: SupabaseDurableWorkerFinisher<
  EnrichmentHandlerResult
> = async (client: SupabaseDurableWorkerClient, claim, outcome, retryAtMs) => {
  const parameters = toFinishParameters(claim, outcome, retryAtMs)
  const response = await getRpc(client)("worker_finish_enrichment_message", {
    result_domain: parameters.result_domain,
    result_failure_class: parameters.result_failure_class,
    result_favicon_asset_id: parameters.result_favicon_asset_id,
    result_internal_error: parameters.result_internal_error,
    result_og_image_asset_id: parameters.result_og_image_asset_id,
    result_public_error_code: parameters.result_public_error_code,
    result_title: parameters.result_title,
    retry_at: parameters.retry_at,
    succeeded: parameters.succeeded,
    target_generation: parameters.generation,
    target_lease_token: parameters.lease_token,
    target_message_id: parameters.message_id,
    target_queue_name: claim.queueName,
    target_request_id: parameters.request_id,
  })
  if (response.error !== null) throwDatabaseFailure(response.error)
  if (
    typeof response.data !== "string" ||
    !FINISH_STATES.has(response.data as DurableFinishState)
  ) {
    throw createInvalidDurableWorkerResultError()
  }
  return response.data as DurableFinishState
}
