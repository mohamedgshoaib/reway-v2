export const DURABLE_QUEUE_NAMES = {
  bulkEnrichment: "reway_enrichment_bulk",
  exportTransfer: "reway_transfer_export",
  interactiveEnrichment: "reway_enrichment_interactive",
  mutatingTransfer: "reway_transfer_mutating",
} as const

export type DurableQueueName =
  (typeof DURABLE_QUEUE_NAMES)[keyof typeof DURABLE_QUEUE_NAMES]

export type DurableWorkKind = "enrichment" | "export" | "import" | "restore"

export interface EnrichmentEnvelope {
  generation: string
  requestId: string
  version: 1
  workKind: "enrichment"
}

export interface TransferEnvelope {
  jobId: string
  version: 1
  workKind: "export" | "import" | "restore"
}

export type DurableEnvelope = EnrichmentEnvelope | TransferEnvelope

export interface DurableQueueMessage {
  deliveryCount: number
  enqueuedAtMs: number
  envelope: unknown
  messageId: string
  visibleAtMs: number
}

export type DurableClaimStatus =
  | "busy"
  | "exhausted"
  | "missing"
  | "not_due"
  | "stale_message"
  | "terminal"

export type DurableClaimResult =
  | {
      attemptCount: number
      leaseToken: string
      maxAttempts: number
      status: "claimed"
    }
  | { status: DurableClaimStatus }

export type DurableBatchPrepareResult<PreparedInput> =
  | {
      attemptCount: number
      leaseToken: string
      maxAttempts: number
      messageId: string
      preparedInput: PreparedInput
      status: "claimed"
    }
  | { messageId: string; status: DurableClaimStatus }

export interface ClaimedDurableWork {
  attemptCount: number
  envelope: DurableEnvelope
  leaseToken: string
  maxAttempts: number
  message: DurableQueueMessage
  queueName: DurableQueueName
}

export interface DurableHandlerStageTimings {
  readonly assetProcessingMs: number
  readonly fetchMs: number
}

type DurableWorkResult<Result> =
  | { result: Result; status: "succeeded" }
  | {
      code: string
      retryAfterMs?: number
      status: "transient_failure"
    }
  | { code: string; status: "permanent_failure" }

export type DurableWorkOutcome<Result> = DurableWorkResult<Result> & {
  readonly stageTimings?: DurableHandlerStageTimings
}

export type DurableFinishState =
  | "cancelled"
  | "completed"
  | "completed_with_failures"
  | "failed"
  | "queued"
  | "rejected"

export type PoisonMessageReason =
  | "invalid_identifier"
  | "malformed_envelope"
  | "missing_request"
  | "stale_message"
  | "unknown_work_kind"
  | "unsupported_payload_version"

export type TerminalMessageDeleteOutcome = "already_deleted" | "deleted"

export interface DurableWorkerAdapter<Result> {
  claim(
    queueName: DurableQueueName,
    message: DurableQueueMessage,
    envelope: DurableEnvelope,
    leaseSeconds: number
  ): Promise<DurableClaimResult>
  deleteTerminal(
    queueName: DurableQueueName,
    messageId: string
  ): Promise<TerminalMessageDeleteOutcome>
  finish(
    claim: ClaimedDurableWork,
    outcome: DurableWorkOutcome<Result>,
    retryAtMs: number | null
  ): Promise<DurableFinishState>
  read(
    queueName: DurableQueueName,
    visibilitySeconds: number,
    batchSize: number
  ): Promise<DurableQueueMessage[]>
  rejectPoison(
    queueName: DurableQueueName,
    message: DurableQueueMessage,
    reason: PoisonMessageReason
  ): Promise<boolean>
  renew(
    claim: ClaimedDurableWork,
    leaseSeconds: number,
    visibilitySeconds: number
  ): Promise<boolean>
  startAttempt(claim: ClaimedDurableWork): Promise<boolean>
}

export interface DurableWorkerHandler<Result, PreparedInput = never> {
  run(
    envelope: DurableEnvelope,
    options: {
      attemptNumber: number
      leaseToken: string
      preparedInput?: PreparedInput
      signal: AbortSignal
    }
  ): Promise<DurableWorkOutcome<Result>>
}

export interface DurableBatchFinishInput<Result> {
  readonly claim: ClaimedDurableWork
  readonly outcome: DurableWorkOutcome<Result>
  readonly retryAtMs: number | null
}

export interface DurableBatchFinishResult {
  readonly finishState: DurableFinishState
  readonly messageId: string
  readonly terminalDeleteOutcome: TerminalMessageDeleteOutcome | null
}

export interface DurableWorkerBatchAdapter<Result, PreparedInput> {
  finish(
    inputs: readonly DurableBatchFinishInput<Result>[]
  ): Promise<readonly DurableBatchFinishResult[]>
  prepare(
    queueName: DurableQueueName,
    inputs: readonly {
      envelope: DurableEnvelope
      message: DurableQueueMessage
    }[],
    leaseSeconds: number
  ): Promise<readonly DurableBatchPrepareResult<PreparedInput>[]>
}

export interface DurableRetryInput {
  attemptCount: number
  maxAttempts: number
  nowMs: number
  requestKey: string
  retryAfterMs?: number
}

export interface DurableRetryPolicy {
  getRetryAt(input: DurableRetryInput): number | null
}

export interface DurableWorkerRequest {
  batchSize: number
  concurrency: number
  heartbeatIntervalMs: number
  leaseSeconds: number
  queueName: DurableQueueName
  visibilitySeconds: number
}

export interface DurableWorkerSummary {
  assetProcessingMs: number
  claimMs: number
  claimed: number
  completionMs: number
  completed: number
  deferred: number
  enqueueAgeP50Ms: number
  enqueueAgeP95Ms: number
  enqueueAgeP99Ms: number
  failed: number
  fetchMs: number
  leaseLost: number
  poisonDeleted: number
  queueReadMs: number
  read: number
  retried: number
  terminalAlreadyDeleted: number
  terminalDeletionMs: number
  terminalDeleted: number
  workerRunMs: number
}

export interface DurableWorkerDependencies<Result, PreparedInput = never> {
  adapter: DurableWorkerAdapter<Result>
  batchAdapter?: DurableWorkerBatchAdapter<Result, PreparedInput>
  handler: DurableWorkerHandler<Result, PreparedInput>
  monotonicNow?: () => number
  now?: () => number
  retryPolicy: DurableRetryPolicy
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<boolean>
}
