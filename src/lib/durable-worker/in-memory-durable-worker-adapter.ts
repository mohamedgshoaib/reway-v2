import { getDurableEnvelopeKey } from "./durable-worker-envelope"
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
} from "./durable-worker-types"

export type InMemoryDurableState =
  | "cancelled"
  | "completed"
  | "failed"
  | "queued"
  | "running"

export interface InMemoryDurableWork<Result> {
  attemptCount?: number
  deliveryCount?: number
  envelope: DurableEnvelope
  enqueuedAtMs: number
  maxAttempts: number
  messageId: string
  nextAttemptAtMs?: number
  queueName: DurableQueueName
  result?: Result
  state?: InMemoryDurableState
  visibleAtMs: number
}

interface StoredDurableWork<Result> extends InMemoryDurableWork<Result> {
  attemptCount: number
  deliveryCount: number
  leaseExpiresAtMs: number | null
  leaseToken: string | null
  messagePresent: boolean
  nextAttemptAtMs: number
  state: InMemoryDurableState
}

export interface InMemoryDurableWorkerOptions {
  now: () => number
}

const toRawEnvelope = (envelope: DurableEnvelope): Record<string, unknown> =>
  envelope.workKind === "enrichment"
    ? {
        generation: envelope.generation,
        request_id: envelope.requestId,
        version: envelope.version,
        work_kind: envelope.workKind,
      }
    : {
        job_id: envelope.jobId,
        version: envelope.version,
        work_kind: envelope.workKind,
      }

const copyWork = <Result>(
  work: StoredDurableWork<Result>
): StoredDurableWork<Result> => ({ ...work })

export interface InMemoryDurableWorkerAdapter<
  Result,
> extends DurableWorkerAdapter<Result> {
  getIncidents(): readonly {
    messageId: string
    queueName: DurableQueueName
    reason: PoisonMessageReason
  }[]
  getWork(messageId: string): Readonly<StoredDurableWork<Result>> | null
}

export const createInMemoryDurableWorkerAdapter = <Result>(
  seed: readonly InMemoryDurableWork<Result>[],
  { now }: InMemoryDurableWorkerOptions
): InMemoryDurableWorkerAdapter<Result> => {
  const workByMessageId = new Map<string, StoredDurableWork<Result>>()
  const incidents: {
    messageId: string
    queueName: DurableQueueName
    reason: PoisonMessageReason
  }[] = []
  let leaseSequence = 0

  for (const work of seed) {
    if (workByMessageId.has(work.messageId)) {
      throw new Error("Durable worker message IDs must be unique.")
    }
    workByMessageId.set(work.messageId, {
      ...work,
      attemptCount: work.attemptCount ?? 0,
      deliveryCount: work.deliveryCount ?? 0,
      leaseExpiresAtMs: null,
      leaseToken: null,
      messagePresent: true,
      nextAttemptAtMs: work.nextAttemptAtMs ?? work.visibleAtMs,
      state: work.state ?? "queued",
    })
  }

  const adapter: InMemoryDurableWorkerAdapter<Result> = {
    claim: async (
      queueName: DurableQueueName,
      message: DurableQueueMessage,
      envelope: DurableEnvelope,
      leaseSeconds: number
    ): Promise<DurableClaimResult> => {
      const work = workByMessageId.get(message.messageId)
      if (!work) return { status: "missing" }
      if (
        work.queueName !== queueName ||
        getDurableEnvelopeKey(work.envelope) !== getDurableEnvelopeKey(envelope)
      ) {
        return { status: "stale_message" }
      }
      if (
        work.state === "completed" ||
        work.state === "failed" ||
        work.state === "cancelled"
      ) {
        return { status: "terminal" }
      }
      if (work.state !== "queued") return { status: "busy" }
      if (work.nextAttemptAtMs > now()) return { status: "not_due" }
      if (work.attemptCount >= work.maxAttempts) return { status: "exhausted" }

      leaseSequence += 1
      work.leaseToken = `lease-${leaseSequence}`
      work.leaseExpiresAtMs = now() + leaseSeconds * 1000
      work.state = "running"
      return {
        attemptCount: work.attemptCount,
        leaseToken: work.leaseToken,
        maxAttempts: work.maxAttempts,
        status: "claimed",
      }
    },
    deleteTerminal: async (
      queueName: DurableQueueName,
      messageId: string
    ): Promise<boolean> => {
      const work = workByMessageId.get(messageId)
      if (!work || work.queueName !== queueName || !work.messagePresent) {
        return false
      }
      if (
        work.state !== "completed" &&
        work.state !== "failed" &&
        work.state !== "cancelled"
      ) {
        throw new Error("Message is not terminal.")
      }
      work.messagePresent = false
      return true
    },
    finish: async (
      claim: ClaimedDurableWork,
      outcome: DurableWorkOutcome<Result>,
      retryAtMs: number | null
    ): Promise<DurableFinishState> => {
      const work = workByMessageId.get(claim.message.messageId)
      if (
        !work ||
        work.state !== "running" ||
        work.leaseToken !== claim.leaseToken ||
        work.leaseExpiresAtMs === null ||
        work.leaseExpiresAtMs <= now()
      ) {
        return "rejected"
      }

      work.leaseToken = null
      work.leaseExpiresAtMs = null
      if (
        outcome.status === "transient_failure" &&
        retryAtMs !== null &&
        work.attemptCount < work.maxAttempts
      ) {
        work.state = "queued"
        work.nextAttemptAtMs = retryAtMs
        work.visibleAtMs = retryAtMs
        return "queued"
      }

      if (outcome.status === "succeeded") {
        work.result = outcome.result
        work.state = "completed"
        return "completed"
      }

      work.state = "failed"
      return "failed"
    },
    getIncidents: () => incidents.map((incident) => ({ ...incident })),
    getWork: (messageId: string) => {
      const work = workByMessageId.get(messageId)
      return work ? copyWork(work) : null
    },
    read: async (
      queueName: DurableQueueName,
      visibilitySeconds: number,
      batchSize: number
    ): Promise<DurableQueueMessage[]> => {
      const selected = [...workByMessageId.values()]
        .filter(
          (work) =>
            work.queueName === queueName &&
            work.messagePresent &&
            work.visibleAtMs <= now()
        )
        .sort(
          (left, right) =>
            left.enqueuedAtMs - right.enqueuedAtMs ||
            left.messageId.localeCompare(right.messageId)
        )
        .slice(0, batchSize)

      return selected.map((work) => {
        work.deliveryCount += 1
        work.visibleAtMs = now() + visibilitySeconds * 1000
        return {
          deliveryCount: work.deliveryCount,
          enqueuedAtMs: work.enqueuedAtMs,
          envelope: toRawEnvelope(work.envelope),
          messageId: work.messageId,
          visibleAtMs: work.visibleAtMs,
        }
      })
    },
    rejectPoison: async (
      queueName: DurableQueueName,
      message: DurableQueueMessage,
      reason: PoisonMessageReason
    ): Promise<boolean> => {
      const work = workByMessageId.get(message.messageId)
      incidents.push({ messageId: message.messageId, queueName, reason })
      if (!work || !work.messagePresent) return false
      work.messagePresent = false
      work.state = "failed"
      work.leaseToken = null
      work.leaseExpiresAtMs = null
      return true
    },
    renew: async (
      claim: ClaimedDurableWork,
      leaseSeconds: number,
      visibilitySeconds: number
    ): Promise<boolean> => {
      const work = workByMessageId.get(claim.message.messageId)
      if (
        !work ||
        work.state !== "running" ||
        work.leaseToken !== claim.leaseToken ||
        work.leaseExpiresAtMs === null ||
        work.leaseExpiresAtMs <= now()
      ) {
        return false
      }
      work.leaseExpiresAtMs = now() + leaseSeconds * 1000
      work.visibleAtMs = now() + visibilitySeconds * 1000
      return true
    },
    startAttempt: async (claim: ClaimedDurableWork): Promise<boolean> => {
      const work = workByMessageId.get(claim.message.messageId)
      if (
        !work ||
        work.state !== "running" ||
        work.leaseToken !== claim.leaseToken ||
        work.leaseExpiresAtMs === null ||
        work.leaseExpiresAtMs <= now() ||
        work.attemptCount >= work.maxAttempts
      ) {
        return false
      }
      work.attemptCount += 1
      return true
    },
  }

  return adapter
}
