import {
  getDurableEnvelopeKey,
  parseDurableEnvelope,
} from "./durable-worker-envelope.ts"
import type {
  ClaimedDurableWork,
  DurableBatchFinishInput,
  DurableBatchPrepareResult,
  DurableClaimResult,
  DurableEnvelope,
  DurableFinishState,
  DurableQueueMessage,
  TerminalMessageDeleteOutcome,
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
const BATCH_RESULT_LINGER_MS = 20

const createSummary = (): DurableWorkerSummary => ({
  assetProcessingMs: 0,
  claimMs: 0,
  claimed: 0,
  completionMs: 0,
  completed: 0,
  deferred: 0,
  enqueueAgeP50Ms: 0,
  enqueueAgeP95Ms: 0,
  enqueueAgeP99Ms: 0,
  failed: 0,
  fetchMs: 0,
  leaseLost: 0,
  poisonDeleted: 0,
  queueReadMs: 0,
  read: 0,
  retried: 0,
  terminalAlreadyDeleted: 0,
  terminalDeletionMs: 0,
  terminalDeleted: 0,
  workerRunMs: 0,
})

const defaultMonotonicNow = (): number => performance.now()

const elapsedMilliseconds = (startedAt: number, now: () => number): number =>
  Math.max(0, now() - startedAt)

const measure = async <Result>(
  now: () => number,
  record: (durationMs: number) => void,
  operation: () => Promise<Result>
): Promise<Result> => {
  const startedAt = now()
  try {
    return await operation()
  } finally {
    record(elapsedMilliseconds(startedAt, now))
  }
}

const recordTerminalDeletion = async <Result, PreparedInput = never>(
  queueName: DurableWorkerRequest["queueName"],
  messageId: string,
  dependencies: DurableWorkerDependencies<Result, PreparedInput>,
  summary: DurableWorkerSummary,
  monotonicNow: () => number
): Promise<void> => {
  const outcome = await measure(
    monotonicNow,
    (durationMs) => {
      summary.terminalDeletionMs += durationMs
    },
    () => dependencies.adapter.deleteTerminal(queueName, messageId)
  )
  if (outcome === "deleted") {
    summary.terminalDeleted += 1
  } else {
    summary.terminalAlreadyDeleted += 1
  }
}

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

const runWithHeartbeat = async <Result, PreparedInput = never>(
  claim: ClaimedDurableWork,
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result, PreparedInput>,
  preparedInput?: PreparedInput
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
      preparedInput,
      signal: workController.signal,
    })
    return leaseLost ? { leaseLost: true } : { leaseLost: false, outcome }
  } finally {
    heartbeatController.abort()
    await heartbeatPromise
  }
}

const processMessage = async <Result, PreparedInput = never>(
  message: DurableQueueMessage,
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result, PreparedInput>,
  summary: DurableWorkerSummary,
  monotonicNow: () => number
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

  const claimResult: DurableClaimResult = await measure(
    monotonicNow,
    (durationMs) => {
      summary.claimMs += durationMs
    },
    () =>
      dependencies.adapter.claim(
        request.queueName,
        message,
        parsed.envelope,
        request.leaseSeconds
      )
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
    await recordTerminalDeletion(
      request.queueName,
      message.messageId,
      dependencies,
      summary,
      monotonicNow
    )
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
  const outcome = runResult.outcome

  if (outcome.stageTimings) {
    summary.assetProcessingMs += outcome.stageTimings.assetProcessingMs
    summary.fetchMs += outcome.stageTimings.fetchMs
  }

  const retryAtMs =
    outcome.status === "transient_failure"
      ? dependencies.retryPolicy.getRetryAt({
          attemptCount: claim.attemptCount,
          maxAttempts: claim.maxAttempts,
          nowMs: (dependencies.now ?? Date.now)(),
          requestKey: getDurableEnvelopeKey(claim.envelope),
          retryAfterMs: outcome.retryAfterMs,
        })
      : null
  const finishState = await measure(
    monotonicNow,
    (durationMs) => {
      summary.completionMs += durationMs
    },
    () => dependencies.adapter.finish(claim, outcome, retryAtMs)
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

  await recordTerminalDeletion(
    request.queueName,
    message.messageId,
    dependencies,
    summary,
    monotonicNow
  )
}

interface ParsedQueueMessage {
  envelope: DurableEnvelope
  message: DurableQueueMessage
}

const applyBatchFinishResult = (
  result: {
    finishState: DurableFinishState
    terminalDeleteOutcome: TerminalMessageDeleteOutcome | null
  },
  summary: DurableWorkerSummary
): void => {
  if (result.finishState === "queued") {
    if (result.terminalDeleteOutcome !== null) {
      throw new Error("Durable worker batch adapter returned an invalid retry.")
    }
    summary.retried += 1
    return
  }
  if (result.finishState === "rejected") {
    if (result.terminalDeleteOutcome !== null) {
      throw new Error(
        "Durable worker batch adapter returned an invalid rejection."
      )
    }
    summary.leaseLost += 1
    return
  }
  if (result.terminalDeleteOutcome === null) {
    throw new Error("Durable worker batch adapter omitted terminal deletion.")
  }
  if (result.finishState === "completed") {
    summary.completed += 1
  } else {
    summary.failed += 1
  }
  if (result.terminalDeleteOutcome === "deleted") {
    summary.terminalDeleted += 1
  } else {
    summary.terminalAlreadyDeleted += 1
  }
}

const processBatchWindow = async <Result, PreparedInput>(
  inputs: readonly ParsedQueueMessage[],
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result, PreparedInput>,
  summary: DurableWorkerSummary,
  monotonicNow: () => number
): Promise<void> => {
  const batchAdapter = dependencies.batchAdapter
  if (!batchAdapter) {
    throw new Error("Durable worker batch adapter is missing.")
  }
  const prepared = await measure(
    monotonicNow,
    (durationMs) => {
      summary.claimMs += durationMs
    },
    () => batchAdapter.prepare(request.queueName, inputs, request.leaseSeconds)
  )
  if (prepared.length !== inputs.length) {
    throw new Error("Durable worker batch adapter returned the wrong count.")
  }

  const preparedByMessageId = new Map<
    string,
    DurableBatchPrepareResult<PreparedInput>
  >()
  for (const result of prepared) {
    if (preparedByMessageId.has(result.messageId)) {
      throw new Error("Durable worker batch adapter repeated a message.")
    }
    preparedByMessageId.set(result.messageId, result)
  }

  const claimed: {
    claim: ClaimedDurableWork
    preparedInput: PreparedInput
  }[] = []
  for (const input of inputs) {
    const result = preparedByMessageId.get(input.message.messageId)
    if (!result) {
      throw new Error("Durable worker batch adapter omitted a message.")
    }
    if (result.status === "missing" || result.status === "stale_message") {
      const deleted = await dependencies.adapter.rejectPoison(
        request.queueName,
        input.message,
        result.status === "missing" ? "missing_request" : "stale_message"
      )
      if (deleted) summary.poisonDeleted += 1
      continue
    }
    if (result.status === "terminal") {
      await recordTerminalDeletion(
        request.queueName,
        input.message.messageId,
        dependencies,
        summary,
        monotonicNow
      )
      continue
    }
    if (result.status !== "claimed") {
      summary.deferred += 1
      continue
    }
    summary.claimed += 1
    claimed.push({
      claim: {
        attemptCount: result.attemptCount,
        envelope: input.envelope,
        leaseToken: result.leaseToken,
        maxAttempts: result.maxAttempts,
        message: input.message,
        queueName: request.queueName,
      },
      preparedInput: result.preparedInput,
    })
  }

  const finishQueue: DurableBatchFinishInput<Result>[] = []
  let settledHandlerCount = 0
  let resolveNextCompletion: (() => void) | null = null
  const handlerPromises = claimed.map(
    async ({ claim, preparedInput }): Promise<void> => {
      try {
        let runResult: {
          leaseLost: boolean
          outcome?: DurableWorkOutcome<Result>
        }
        try {
          runResult = await runWithHeartbeat(
            claim,
            request,
            dependencies,
            preparedInput
          )
        } catch {
          runResult = {
            leaseLost: false,
            outcome: {
              code: "worker_exception",
              status: "transient_failure",
            },
          }
        }
        if (runResult.leaseLost || runResult.outcome === undefined) {
          summary.leaseLost += 1
          return
        }
        const outcome = runResult.outcome
        if (outcome.stageTimings) {
          summary.assetProcessingMs += outcome.stageTimings.assetProcessingMs
          summary.fetchMs += outcome.stageTimings.fetchMs
        }
        const retryAtMs =
          outcome.status === "transient_failure"
            ? dependencies.retryPolicy.getRetryAt({
                attemptCount: claim.attemptCount,
                maxAttempts: claim.maxAttempts,
                nowMs: (dependencies.now ?? Date.now)(),
                requestKey: getDurableEnvelopeKey(claim.envelope),
                retryAfterMs: outcome.retryAfterMs,
              })
            : null
        finishQueue.push({
          claim,
          outcome,
          retryAtMs,
        })
      } finally {
        settledHandlerCount += 1
        resolveNextCompletion?.()
      }
    }
  )

  let finishError: unknown
  try {
    while (settledHandlerCount < claimed.length || finishQueue.length > 0) {
      if (finishQueue.length === 0) {
        await new Promise<void>((resolve) => {
          resolveNextCompletion = resolve
        })
        resolveNextCompletion = null
      }
      if (finishQueue.length === 0) continue
      if (settledHandlerCount < claimed.length) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, BATCH_RESULT_LINGER_MS)
        })
      }
      const finishInputs = finishQueue.splice(0, request.concurrency)
      const finished = await measure(
        monotonicNow,
        (durationMs) => {
          summary.completionMs += durationMs
        },
        () => batchAdapter.finish(finishInputs)
      )
      if (finished.length !== finishInputs.length) {
        throw new Error(
          "Durable worker batch adapter returned the wrong count."
        )
      }
      const finishedByMessageId = new Map(
        finished.map((result) => [result.messageId, result] as const)
      )
      if (finishedByMessageId.size !== finished.length) {
        throw new Error("Durable worker batch adapter repeated a message.")
      }
      for (const input of finishInputs) {
        const result = finishedByMessageId.get(input.claim.message.messageId)
        if (!result) {
          throw new Error("Durable worker batch adapter omitted a message.")
        }
        applyBatchFinishResult(result, summary)
      }
    }
  } catch (error) {
    finishError = error
  }
  await Promise.all(handlerPromises)
  if (finishError !== undefined) {
    throw finishError
  }
}

export const runDurableWorker = async <Result, PreparedInput = never>(
  request: DurableWorkerRequest,
  dependencies: DurableWorkerDependencies<Result, PreparedInput>
): Promise<DurableWorkerSummary> => {
  const monotonicNow = dependencies.monotonicNow ?? defaultMonotonicNow
  const workerStartedAt = monotonicNow()
  validateRequest(request)
  const summary = createSummary()
  const messages = await measure(
    monotonicNow,
    (durationMs) => {
      summary.queueReadMs += durationMs
    },
    () =>
      dependencies.adapter.read(
        request.queueName,
        request.visibilitySeconds,
        request.batchSize
      )
  )
  if (messages.length > request.batchSize) {
    throw new Error("Durable worker adapter exceeded the batch limit.")
  }
  summary.read = messages.length
  const readAtMs = (dependencies.now ?? Date.now)()
  const enqueueAgeSamples = messages.map((message) =>
    Math.max(0, readAtMs - message.enqueuedAtMs)
  )
  summary.enqueueAgeP50Ms = percentile(enqueueAgeSamples, 0.5)
  summary.enqueueAgeP95Ms = percentile(enqueueAgeSamples, 0.95)
  summary.enqueueAgeP99Ms = percentile(enqueueAgeSamples, 0.99)

  if (dependencies.batchAdapter) {
    const parsedMessages: ParsedQueueMessage[] = []
    for (const message of messages) {
      const parsed = parseDurableEnvelope(message.envelope, request.queueName)
      if (!parsed.ok) {
        const deleted = await dependencies.adapter.rejectPoison(
          request.queueName,
          message,
          parsed.reason
        )
        if (deleted) summary.poisonDeleted += 1
        continue
      }
      parsedMessages.push({ envelope: parsed.envelope, message })
    }
    for (
      let start = 0;
      start < parsedMessages.length;
      start += request.concurrency
    ) {
      await processBatchWindow(
        parsedMessages.slice(start, start + request.concurrency),
        request,
        dependencies,
        summary,
        monotonicNow
      )
    }
  } else {
    let nextMessageIndex = 0
    const workerCount = Math.min(request.concurrency, messages.length)
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextMessageIndex < messages.length) {
        const message = messages[nextMessageIndex]
        nextMessageIndex += 1
        await processMessage(
          message,
          request,
          dependencies,
          summary,
          monotonicNow
        )
      }
    })
    await Promise.all(workers)
  }
  summary.workerRunMs = elapsedMilliseconds(workerStartedAt, monotonicNow)

  return summary
}
