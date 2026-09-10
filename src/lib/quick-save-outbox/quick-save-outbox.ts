import type { NormalizedHttpUrl } from "@/lib/network-safety/url-policy"
import { normalizeHttpUrl } from "@/lib/network-safety/url-policy"

export const MAX_OUTBOX_ENTRIES = 1_000
export const MAX_OUTBOX_BYTES = 16 * 1_024 * 1_024

const MAX_CLAIM_BATCH_SIZE = 50
const MAX_LEASE_MS = 5 * 60 * 1_000
const MAX_RETRY_AFTER_MS = 5 * 60 * 1_000
const DEFAULT_CLAIM_BATCH_SIZE = 10
const DEFAULT_LEASE_MS = 30_000
const DEFAULT_RETRY_BASE_MS = 1_000
const FIXED_ENTRY_BYTES = 384
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FAILURE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/
const encoder = new TextEncoder()

export type QuickSavePersistenceState =
  | "queued_offline"
  | "save_failed"
  | "saved"
  | "saving"

export type QuickSaveNextAction = "create" | "reconcile"
export type BrowserPersistence = "best_effort" | "persistent"

export interface QuickSaveOutboxEntry {
  readonly attemptCount: number
  readonly clientRequestId: string
  readonly createdAtMs: number
  readonly failureCode: string | null
  readonly leaseExpiresAtMs: number | null
  readonly nextAction: QuickSaveNextAction
  readonly nextAttemptAtMs: number
  readonly state: QuickSavePersistenceState
  readonly updatedAtMs: number
  readonly url: string
}

export interface ClaimedQuickSave extends QuickSaveOutboxEntry {
  readonly leaseToken: string
  readonly state: "saving"
}

export interface EnqueueQuickSaveCommand {
  readonly clientRequestId: string
  readonly kind: "enqueue"
  readonly subjectId: string
  readonly url: NormalizedHttpUrl
}

export interface ClaimQuickSavesCommand {
  readonly kind: "claim"
  readonly ownerId: string
  readonly subjectId: string | null
}

export type SettleQuickSaveOutcome =
  | { readonly status: "saved" }
  | {
      readonly failureCode: string
      readonly status: "permanent_failure"
    }
  | {
      readonly response: "not_sent" | "uncertain"
      readonly retryAfterMs?: number
      readonly status: "retry"
    }

export interface SettleQuickSaveCommand {
  readonly clientRequestId: string
  readonly kind: "settle"
  readonly leaseToken: string
  readonly outcome: SettleQuickSaveOutcome
  readonly subjectId: string
}

export interface DismissFailedQuickSaveCommand {
  readonly clientRequestId: string
  readonly kind: "dismiss_failed"
  readonly subjectId: string
}

export interface ClearQuickSavesCommand {
  readonly kind: "clear_subject"
  readonly subjectId: string
}

export type QuickSaveOutboxCommand =
  | ClaimQuickSavesCommand
  | ClearQuickSavesCommand
  | DismissFailedQuickSaveCommand
  | EnqueueQuickSaveCommand
  | SettleQuickSaveCommand

export type QuickSaveOutboxMutationResult =
  | {
      readonly created: boolean
      readonly entry: QuickSaveOutboxEntry
      readonly kind: "enqueued"
      readonly persistence: BrowserPersistence
    }
  | {
      readonly entries: readonly ClaimedQuickSave[]
      readonly kind: "claimed"
    }
  | {
      readonly entry: QuickSaveOutboxEntry
      readonly kind: "settled"
    }
  | { readonly kind: "dismissed" }
  | { readonly count: number; readonly kind: "cleared" }

export interface QuickSaveOutboxReadRequest {
  readonly kind: "entries"
  readonly subjectId: string | null
}

export interface QuickSaveOutbox {
  mutate(
    command: QuickSaveOutboxCommand
  ): Promise<QuickSaveOutboxMutationResult>
  read(
    request: QuickSaveOutboxReadRequest
  ): Promise<readonly QuickSaveOutboxEntry[]>
}

export type QuickSaveOutboxErrorCode =
  | "capacity_exceeded"
  | "conflict"
  | "invalid_input"
  | "lease_lost"
  | "not_found"
  | "storage_unavailable"

export class QuickSaveOutboxError extends Error {
  readonly code: QuickSaveOutboxErrorCode
  readonly retrySafe: boolean

  constructor(
    code: QuickSaveOutboxErrorCode,
    message: string,
    retrySafe: boolean
  ) {
    super(message)
    this.name = "QuickSaveOutboxError"
    this.code = code
    this.retrySafe = retrySafe
  }
}

export interface BrowserPersistenceAdapter {
  request(): Promise<boolean>
}

export interface QuickSaveOutboxLimits {
  readonly claimBatchSize: number
  readonly leaseMs: number
  readonly maxBytes: number
  readonly maxEntries: number
  readonly retryBaseMs: number
}

export interface QuickSaveOutboxOptions {
  readonly createLeaseToken?: () => string
  readonly limits?: Partial<QuickSaveOutboxLimits>
  readonly now?: () => number
  readonly persistence?: BrowserPersistenceAdapter
}

export interface ResolvedQuickSaveOutboxOptions {
  readonly createLeaseToken: () => string
  readonly limits: QuickSaveOutboxLimits
  readonly now: () => number
  readonly requestPersistence: () => Promise<BrowserPersistence>
}

export interface StoredQuickSaveOutboxEntry {
  attemptCount: number
  byteSize: number
  clientRequestId: string
  createdAtMs: number
  failureCode: string | null
  leaseExpiresAtMs: number | null
  leaseOwnerId: string | null
  leaseToken: string | null
  nextAction: QuickSaveNextAction
  nextAttemptAtMs: number
  readyAtMs: number
  state: Exclude<QuickSavePersistenceState, "saved">
  subjectId: string
  updatedAtMs: number
  url: string
}

const invalidInput = (message: string): QuickSaveOutboxError =>
  new QuickSaveOutboxError("invalid_input", message, false)

export const requireUuid = (value: string, name: string): void => {
  if (!UUID_PATTERN.test(value)) throw invalidInput(`${name} must be a UUID.`)
}

export const requireFailureCode = (value: string): void => {
  if (!FAILURE_CODE_PATTERN.test(value)) {
    throw invalidInput("The failure code is invalid.")
  }
}

const requirePositiveInteger = (
  value: number,
  name: string,
  maximum: number
): number => {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw invalidInput(`${name} is outside the supported range.`)
  }
  return value
}

export const requireTimestamp = (value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw invalidInput("The outbox timestamp is invalid.")
  }
}

const requireNormalizedUrl = (value: NormalizedHttpUrl): void => {
  const result = normalizeHttpUrl(value.href)
  if (
    !result.ok ||
    result.value.href !== value.href ||
    result.value.hostname !== value.hostname ||
    result.value.port !== value.port ||
    result.value.protocol !== value.protocol
  ) {
    throw invalidInput("The outbox URL is invalid.")
  }
}

const createPersistenceReader = (
  adapter: BrowserPersistenceAdapter | undefined
): (() => Promise<BrowserPersistence>) => {
  let request: Promise<BrowserPersistence> | undefined
  return () => {
    request ??= (async () => {
      if (adapter === undefined) return "best_effort"
      try {
        return (await adapter.request()) ? "persistent" : "best_effort"
      } catch {
        return "best_effort"
      }
    })()
    return request
  }
}

export const resolveQuickSaveOutboxOptions = (
  options: QuickSaveOutboxOptions = {}
): ResolvedQuickSaveOutboxOptions => {
  const limits: QuickSaveOutboxLimits = {
    claimBatchSize: options.limits?.claimBatchSize ?? DEFAULT_CLAIM_BATCH_SIZE,
    leaseMs: options.limits?.leaseMs ?? DEFAULT_LEASE_MS,
    maxBytes: options.limits?.maxBytes ?? MAX_OUTBOX_BYTES,
    maxEntries: options.limits?.maxEntries ?? MAX_OUTBOX_ENTRIES,
    retryBaseMs: options.limits?.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
  }
  requirePositiveInteger(
    limits.claimBatchSize,
    "claimBatchSize",
    MAX_CLAIM_BATCH_SIZE
  )
  requirePositiveInteger(limits.leaseMs, "leaseMs", MAX_LEASE_MS)
  requirePositiveInteger(limits.maxBytes, "maxBytes", MAX_OUTBOX_BYTES)
  requirePositiveInteger(limits.maxEntries, "maxEntries", MAX_OUTBOX_ENTRIES)
  requirePositiveInteger(limits.retryBaseMs, "retryBaseMs", MAX_RETRY_AFTER_MS)

  return {
    createLeaseToken: options.createLeaseToken ?? (() => crypto.randomUUID()),
    limits,
    now: options.now ?? Date.now,
    requestPersistence: createPersistenceReader(options.persistence),
  }
}

export const getEntryByteSize = (
  subjectId: string,
  clientRequestId: string,
  url: string
): number =>
  FIXED_ENTRY_BYTES +
  encoder.encode(subjectId + clientRequestId + url).byteLength

export const createStoredEntry = (
  command: EnqueueQuickSaveCommand,
  options: ResolvedQuickSaveOutboxOptions
): StoredQuickSaveOutboxEntry => {
  requireUuid(command.subjectId, "subjectId")
  requireUuid(command.clientRequestId, "clientRequestId")
  requireNormalizedUrl(command.url)
  const nowMs = options.now()
  requireTimestamp(nowMs)

  return {
    attemptCount: 0,
    byteSize: getEntryByteSize(
      command.subjectId,
      command.clientRequestId,
      command.url.href
    ),
    clientRequestId: command.clientRequestId,
    createdAtMs: nowMs,
    failureCode: null,
    leaseExpiresAtMs: null,
    leaseOwnerId: null,
    leaseToken: null,
    nextAction: "create",
    nextAttemptAtMs: nowMs,
    readyAtMs: nowMs,
    state: "queued_offline",
    subjectId: command.subjectId,
    updatedAtMs: nowMs,
    url: command.url.href,
  }
}

export const toPublicEntry = (
  entry: StoredQuickSaveOutboxEntry,
  state: QuickSavePersistenceState = entry.state
): QuickSaveOutboxEntry => ({
  attemptCount: entry.attemptCount,
  clientRequestId: entry.clientRequestId,
  createdAtMs: entry.createdAtMs,
  failureCode: entry.failureCode,
  leaseExpiresAtMs: state === "saving" ? entry.leaseExpiresAtMs : null,
  nextAction: entry.nextAction,
  nextAttemptAtMs: entry.nextAttemptAtMs,
  state,
  updatedAtMs: entry.updatedAtMs,
  url: entry.url,
})

const compareEntries = (
  left: StoredQuickSaveOutboxEntry,
  right: StoredQuickSaveOutboxEntry
): number =>
  left.createdAtMs - right.createdAtMs ||
  left.clientRequestId.localeCompare(right.clientRequestId)

export const claimStoredEntries = (
  entries: readonly StoredQuickSaveOutboxEntry[],
  subjectId: string,
  ownerId: string,
  options: ResolvedQuickSaveOutboxOptions,
  nowMs: number = options.now()
): readonly {
  claimed: ClaimedQuickSave
  stored: StoredQuickSaveOutboxEntry
}[] => {
  requireUuid(subjectId, "subjectId")
  requireUuid(ownerId, "ownerId")
  requireTimestamp(nowMs)

  return entries
    .filter(
      (entry) =>
        entry.subjectId === subjectId &&
        ((entry.state === "queued_offline" && entry.nextAttemptAtMs <= nowMs) ||
          (entry.state === "saving" &&
            entry.leaseExpiresAtMs !== null &&
            entry.leaseExpiresAtMs <= nowMs))
    )
    .sort(compareEntries)
    .slice(0, options.limits.claimBatchSize)
    .map((entry) => {
      const leaseToken = options.createLeaseToken()
      requireUuid(leaseToken, "leaseToken")
      const attemptCount = entry.attemptCount + 1
      const leaseExpiresAtMs = nowMs + options.limits.leaseMs
      requirePositiveInteger(
        attemptCount,
        "attemptCount",
        Number.MAX_SAFE_INTEGER
      )
      requireTimestamp(leaseExpiresAtMs)
      const stored: StoredQuickSaveOutboxEntry = {
        ...entry,
        attemptCount,
        failureCode: null,
        leaseExpiresAtMs,
        leaseOwnerId: ownerId,
        leaseToken,
        readyAtMs: leaseExpiresAtMs,
        state: "saving",
        updatedAtMs: nowMs,
      }
      return {
        claimed: { ...toPublicEntry(stored), leaseToken, state: "saving" },
        stored,
      }
    })
}

const getStableUnit = (value: string): number => {
  let hash = 2_166_136_261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619) >>> 0
  }
  return hash / 4_294_967_295
}

const getNextAttemptAt = (
  entry: StoredQuickSaveOutboxEntry,
  nowMs: number,
  retryAfterMs: number | undefined,
  options: ResolvedQuickSaveOutboxOptions
): number => {
  if (
    retryAfterMs !== undefined &&
    (!Number.isSafeInteger(retryAfterMs) ||
      retryAfterMs < 0 ||
      retryAfterMs > MAX_RETRY_AFTER_MS)
  ) {
    throw invalidInput("retryAfterMs is outside the supported range.")
  }
  const exponent = Math.min(8, Math.max(0, entry.attemptCount - 1))
  const baseDelay = Math.min(
    MAX_RETRY_AFTER_MS,
    options.limits.retryBaseMs * 2 ** exponent
  )
  const stableUnit = getStableUnit(
    `${entry.clientRequestId}:${entry.attemptCount}`
  )
  const jitteredDelay = Math.round(baseDelay * (0.8 + stableUnit * 0.4))
  const nextAttemptAtMs = nowMs + Math.max(jitteredDelay, retryAfterMs ?? 0)
  requireTimestamp(nextAttemptAtMs)
  return nextAttemptAtMs
}

export type SettledStoredEntry =
  | {
      readonly publicEntry: QuickSaveOutboxEntry
      readonly remove: true
    }
  | {
      readonly publicEntry: QuickSaveOutboxEntry
      readonly remove: false
      readonly stored: StoredQuickSaveOutboxEntry
    }

export const settleStoredEntry = (
  entry: StoredQuickSaveOutboxEntry,
  command: SettleQuickSaveCommand,
  options: ResolvedQuickSaveOutboxOptions
): SettledStoredEntry => {
  requireUuid(command.subjectId, "subjectId")
  requireUuid(command.clientRequestId, "clientRequestId")
  requireUuid(command.leaseToken, "leaseToken")
  const nowMs = options.now()
  requireTimestamp(nowMs)
  if (
    entry.state !== "saving" ||
    entry.leaseToken !== command.leaseToken ||
    entry.leaseExpiresAtMs === null ||
    entry.leaseExpiresAtMs <= nowMs
  ) {
    throw new QuickSaveOutboxError(
      "lease_lost",
      "The outbox claim is no longer active.",
      true
    )
  }

  const base: StoredQuickSaveOutboxEntry = {
    ...entry,
    failureCode: null,
    leaseExpiresAtMs: null,
    leaseOwnerId: null,
    leaseToken: null,
    updatedAtMs: nowMs,
  }
  if (command.outcome.status === "saved") {
    return { publicEntry: toPublicEntry(base, "saved"), remove: true }
  }
  if (command.outcome.status === "permanent_failure") {
    requireFailureCode(command.outcome.failureCode)
    const stored: StoredQuickSaveOutboxEntry = {
      ...base,
      failureCode: command.outcome.failureCode,
      readyAtMs: Number.MAX_SAFE_INTEGER,
      state: "save_failed",
    }
    return { publicEntry: toPublicEntry(stored), remove: false, stored }
  }

  const stored: StoredQuickSaveOutboxEntry = {
    ...base,
    nextAction:
      command.outcome.response === "uncertain" ? "reconcile" : base.nextAction,
    nextAttemptAtMs: getNextAttemptAt(
      entry,
      nowMs,
      command.outcome.retryAfterMs,
      options
    ),
    readyAtMs: 0,
    state: "queued_offline",
  }
  stored.readyAtMs = stored.nextAttemptAtMs
  return { publicEntry: toPublicEntry(stored), remove: false, stored }
}

export const outboxNotFound = (): QuickSaveOutboxError =>
  new QuickSaveOutboxError(
    "not_found",
    "The outbox entry was not found.",
    false
  )

export const outboxConflict = (): QuickSaveOutboxError =>
  new QuickSaveOutboxError(
    "conflict",
    "The request ID belongs to a different quick save.",
    false
  )

export const outboxCapacityExceeded = (): QuickSaveOutboxError =>
  new QuickSaveOutboxError(
    "capacity_exceeded",
    "This device cannot queue another quick save.",
    false
  )

export const outboxStorageUnavailable = (): QuickSaveOutboxError =>
  new QuickSaveOutboxError(
    "storage_unavailable",
    "This device could not preserve the quick save.",
    true
  )
