import {
  DURABLE_QUEUE_NAMES,
  type DurableEnvelope,
  type DurableQueueName,
  type PoisonMessageReason,
} from "./durable-worker-types"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const GENERATION_PATTERN = /^[1-9][0-9]{0,18}$/
const MAX_GENERATION = 9_223_372_036_854_775_807n
const MAX_ENVELOPE_KEYS = 4

type EnvelopeParseResult =
  | { envelope: DurableEnvelope; ok: true }
  | { ok: false; reason: PoisonMessageReason }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasBoundedKeyCount = (value: Record<string, unknown>): boolean => {
  let keyCount = 0
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue
    keyCount += 1
    if (keyCount > MAX_ENVELOPE_KEYS) return false
  }
  return true
}

const isGeneration = (value: unknown): value is string =>
  typeof value === "string" &&
  GENERATION_PATTERN.test(value) &&
  BigInt(value) <= MAX_GENERATION

const acceptsWorkKind = (
  queueName: DurableQueueName,
  workKind: unknown
): boolean => {
  if (
    queueName === DURABLE_QUEUE_NAMES.interactiveEnrichment ||
    queueName === DURABLE_QUEUE_NAMES.bulkEnrichment
  ) {
    return workKind === "enrichment"
  }

  if (queueName === DURABLE_QUEUE_NAMES.exportTransfer) {
    return workKind === "export"
  }

  return workKind === "import" || workKind === "restore"
}

export const parseDurableEnvelope = (
  value: unknown,
  queueName: DurableQueueName
): EnvelopeParseResult => {
  if (!isRecord(value) || !hasBoundedKeyCount(value)) {
    return { ok: false, reason: "malformed_envelope" }
  }

  if (value.version !== 1) {
    return { ok: false, reason: "unsupported_payload_version" }
  }

  if (typeof value.work_kind !== "string") {
    return { ok: false, reason: "unknown_work_kind" }
  }

  if (!acceptsWorkKind(queueName, value.work_kind)) {
    return { ok: false, reason: "unknown_work_kind" }
  }

  if (value.work_kind === "enrichment") {
    if (
      typeof value.request_id !== "string" ||
      !UUID_PATTERN.test(value.request_id) ||
      !isGeneration(value.generation)
    ) {
      return { ok: false, reason: "invalid_identifier" }
    }

    return {
      envelope: {
        generation: value.generation,
        requestId: value.request_id,
        version: 1,
        workKind: "enrichment",
      },
      ok: true,
    }
  }

  if (typeof value.job_id !== "string" || !UUID_PATTERN.test(value.job_id)) {
    return { ok: false, reason: "invalid_identifier" }
  }

  if (
    value.work_kind !== "export" &&
    value.work_kind !== "import" &&
    value.work_kind !== "restore"
  ) {
    return { ok: false, reason: "unknown_work_kind" }
  }

  return {
    envelope: {
      jobId: value.job_id,
      version: 1,
      workKind: value.work_kind,
    },
    ok: true,
  }
}

export const getDurableEnvelopeKey = (envelope: DurableEnvelope): string =>
  envelope.workKind === "enrichment"
    ? `${envelope.requestId}:${envelope.generation}`
    : envelope.jobId
