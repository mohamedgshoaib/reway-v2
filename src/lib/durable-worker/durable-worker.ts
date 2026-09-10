import {
  getDurableEnvelopeKey,
  parseDurableEnvelope,
} from "./durable-worker-envelope.ts"
import type {
  ClaimedDurableWork,
  DurableQueueMessage,
  DurableWorkOutcome,
  DurableWorkerDependencies,
  DurableWorkerRequest,
  DurableWorkerSummary,
} from "./durable-worker-types.ts"

const MAX_BATCH_SIZE = 100
const MAX_CONCURRENCY = 20
const MAX_LEASE_SECONDS = 600
const MAX_VISIBILITY_SECONDS = 900
const MAX_HEARTBEAT_INTERVAL_MS = 300_000

const createSummary = (): DurableWorkerSummary => ({
  claimed: 0,
  completed: 0,
  deferred: 0,
  failed: 0,
  leaseLost: 0,
  poisonDeleted: 0,
  queueWaitP50Ms: 0,
  queueWaitP95Ms: 0,
  queueWaitP99Ms: 0,
  read: 0,
  retried: 0,
  terminalDeleted: 0,
})

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}

const defaultWait = (
  milliseconds: number,
  signal: AbortSignal
): Promise<boolean> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false)
      return
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve(true)
    }, milliseconds)
    const onAbort = (): void => {
      clearTimeout(timeout)
      resolve(false)
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })

const validateRequest = (request: DurableWorkerRequest): void => {
  if (
    !Number.isSafeInteger(request.batchSize) ||
    request.batchSize < 1 ||
    request.batchSize > MAX_BATCH_SIZE ||
    !Number.isSafeInteger(request.concurrency) ||
    request.concurrency < 1 ||
    request.concurrency > MAX_CONCURRENCY ||
    !Number.isSafeInteger(request.leaseSeconds) ||
    request.leaseSeconds < 1 ||
    request.leaseSeconds > MAX_LEASE_SECONDS ||
    !Number.isSafeInteger(request.visibilitySeconds) ||
    request.visibilitySeconds <= request.leaseSeconds ||
    request.visibilitySeconds > MAX_VISIBILITY_SECONDS ||
    !Number.isSafeInteger(request.heartbeatIntervalMs) ||
    request.heartbeatIntervalMs < 1 ||
    request.heartbeatIntervalMs > MAX_HEARTBEAT_INTERVAL_MS ||
    request.heartbeatIntervalMs >= request.leaseSeconds * 1000
  ) {
    throw new Error("Durable worker limits are invalid.")
  }
}

const runWithHeartbeat = async <Result>(
  claim: ClaimedDurableWork,
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result>
): Promise<{ leaseLost: boolean; outcome?: DurableWorkOutcome<Result> }> => {
  const workController = new AbortController()
  const heartbeatController = new AbortController()
  const wait = dependencies.wait ?? defaultWait
  let leaseLost = false

  const heartbeat = async (): Promise<void> => {
    while (!heartbeatController.signal.aborted) {
      let elapsed = false
      try {
        elapsed = await wait(
          request.heartbeatIntervalMs,
          heartbeatController.signal
        )
      } catch {
        leaseLost = true
        workController.abort()
        return
      }
      if (!elapsed || heartbeatController.signal.aborted) {
        return
      }

      let renewed = false
      try {
        renewed = await dependencies.adapter.renew(
          claim,
          request.leaseSeconds,
          request.visibilitySeconds
        )
      } catch {
        renewed = false
      }

      if (!renewed) {
        leaseLost = true
        workController.abort()
        return
      }
    }
  }

  const heartbeatPromise = heartbeat()
  try {
    const outcome = await dependencies.handler.run(claim.envelope, {
      attemptNumber: claim.attemptCount,
      leaseToken: claim.leaseToken,
      signal: workController.signal,
    })
    return leaseLost ? { leaseLost: true } : { leaseLost: false, outcome }
  } finally {
    heartbeatController.abort()
    await heartbeatPromise
  }
}

const processMessage = async <Result>(
  message: DurableQueueMessage,
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result>,
  summary: DurableWorkerSummary
): Promise<void> => {
  const parsed = parseDurableEnvelope(message.envelope, request.queueName)
  if (!parsed.ok) {
    const deleted = await dependencies.adapter.rejectPoison(
      request.queueName,
      message,
      parsed.reason
    )
    if (deleted) summary.poisonDeleted += 1
    return
  }

  const claimResult = await dependencies.adapter.claim(
    request.queueName,
    message,
    parsed.envelope,
    request.leaseSeconds
  )

  if (
    claimResult.status === "missing" ||
    claimResult.status === "stale_message"
  ) {
    const deleted = await dependencies.adapter.rejectPoison(
      request.queueName,
      message,
      claimResult.status === "missing" ? "missing_request" : "stale_message"
    )
    if (deleted) summary.poisonDeleted += 1
    return
  }

  if (claimResult.status === "terminal") {
    const deleted = await dependencies.adapter.deleteTerminal(
      request.queueName,
      message.messageId
    )
    if (deleted) summary.terminalDeleted += 1
    return
  }

  if (claimResult.status !== "claimed") {
    summary.deferred += 1
    return
  }

  summary.claimed += 1
  const claim: ClaimedDurableWork = {
    attemptCount: claimResult.attemptCount,
    envelope: parsed.envelope,
    leaseToken: claimResult.leaseToken,
    maxAttempts: claimResult.maxAttempts,
    message,
    queueName: request.queueName,
  }

  const started = await dependencies.adapter.startAttempt(claim)
  if (!started) {
    summary.leaseLost += 1
    return
  }
  claim.attemptCount += 1

  let runResult: {
    leaseLost: boolean
    outcome?: DurableWorkOutcome<Result>
  }
  try {
    runResult = await runWithHeartbeat(claim, request, dependencies)
  } catch {
    runResult = {
      leaseLost: false,
      outcome: { code: "worker_exception", status: "transient_failure" },
    }
  }

  if (runResult.leaseLost || runResult.outcome === undefined) {
    summary.leaseLost += 1
    return
  }

  const retryAtMs =
    runResult.outcome.status === "transient_failure"
      ? dependencies.retryPolicy.getRetryAt({
          attemptCount: claim.attemptCount,
          maxAttempts: claim.maxAttempts,
          nowMs: (dependencies.now ?? Date.now)(),
          requestKey: getDurableEnvelopeKey(claim.envelope),
          retryAfterMs: runResult.outcome.retryAfterMs,
        })
      : null
  const finishState = await dependencies.adapter.finish(
    claim,
    runResult.outcome,
    retryAtMs
  )

  if (finishState === "queued") {
    summary.retried += 1
    return
  }
  if (finishState === "rejected") {
    summary.leaseLost += 1
    return
  }
  if (finishState === "completed") {
    summary.completed += 1
  } else {
    summary.failed += 1
  }

  const deleted = await dependencies.adapter.deleteTerminal(
    request.queueName,
    message.messageId
  )
  if (deleted) summary.terminalDeleted += 1
}

export const runDurableWorker = async <Result>(
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result>
): Promise<DurableWorkerSummary> => {
  validateRequest(request)
  const messages = await dependencies.adapter.read(
    request.queueName,
    request.visibilitySeconds,
    request.batchSize
  )
  if (messages.length > request.batchSize) {
    throw new Error("Durable worker adapter exceeded the batch limit.")
  }
  const summary = createSummary()
  summary.read = messages.length
  const readAtMs = (dependencies.now ?? Date.now)()
  const queueWaitSamples = messages.map((message) =>
    Math.max(0, readAtMs - message.enqueuedAtMs)
  )
  summary.queueWaitP50Ms = percentile(queueWaitSamples, 0.5)
  summary.queueWaitP95Ms = percentile(queueWaitSamples, 0.95)
  summary.queueWaitP99Ms = percentile(queueWaitSamples, 0.99)

  let nextMessageIndex = 0
  const workerCount = Math.min(request.concurrency, messages.length)
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextMessageIndex < messages.length) {
      const message = messages[nextMessageIndex]
      nextMessageIndex += 1
      await processMessage(message, request, dependencies, summary)
    }
  })
  await Promise.all(workers)

  return summary
}
