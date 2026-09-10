import { describe, expect, it } from "vitest"

import { runDurableWorker } from "./durable-worker"
import { createDurableRetryPolicy } from "./durable-worker-retry"
import {
  DURABLE_QUEUE_NAMES,
  type DurableQueueMessage,
  type DurableWorkerAdapter,
  type DurableWorkerRequest,
} from "./durable-worker-types"
import {
  createInMemoryDurableWorkerAdapter,
  type InMemoryDurableWork,
} from "./in-memory-durable-worker-adapter"

const NOW = 1_000_000
const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const queueName = DURABLE_QUEUE_NAMES.interactiveEnrichment
const request: DurableWorkerRequest = {
  batchSize: 4,
  concurrency: 2,
  heartbeatIntervalMs: 20_000,
  leaseSeconds: 60,
  queueName,
  visibilitySeconds: 90,
}
const retryPolicy = createDurableRetryPolicy({
  baseDelayMs: 5_000,
  jitterRatio: 0.2,
  maximumDelayMs: 300_000,
})

const createSeed = <Result>(
  overrides: Partial<InMemoryDurableWork<Result>> = {}
): InMemoryDurableWork<Result> => ({
  envelope: {
    generation: "1",
    requestId: REQUEST_ID,
    version: 1,
    workKind: "enrichment",
  },
  enqueuedAtMs: NOW - 1_000,
  maxAttempts: 3,
  messageId: "1",
  queueName,
  visibleAtMs: NOW,
  ...overrides,
})

describe("durable worker", () => {
  it("completes work and deletes its terminal message", async () => {
    const adapter = createInMemoryDurableWorkerAdapter([createSeed<string>()], {
      now: () => NOW,
    })

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async () => ({
          result: "done",
          stageTimings: { assetProcessingMs: 11, fetchMs: 7 },
          status: "succeeded",
        }),
      },
      monotonicNow: (() => {
        const values = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50]
        return () => values.shift() ?? 50
      })(),
      now: () => NOW,
      retryPolicy,
    })

    expect(summary).toEqual({
      assetProcessingMs: 11,
      claimMs: 5,
      claimed: 1,
      completionMs: 5,
      completed: 1,
      deferred: 0,
      failed: 0,
      fetchMs: 7,
      leaseLost: 0,
      poisonDeleted: 0,
      queueReadMs: 5,
      queueWaitP50Ms: 1_000,
      queueWaitP95Ms: 1_000,
      queueWaitP99Ms: 1_000,
      read: 1,
      retried: 0,
      terminalAlreadyDeleted: 0,
      terminalDeletionMs: 5,
      terminalDeleted: 1,
      workerRunMs: 50,
    })
    expect(adapter.getWork("1")).toMatchObject({
      attemptCount: 1,
      messagePresent: false,
      result: "done",
      state: "completed",
    })
  })

  it("accounts for a terminal message removed by an overlapping wake", async () => {
    const message: DurableQueueMessage = {
      deliveryCount: 1,
      enqueuedAtMs: NOW - 1_000,
      envelope: {
        generation: "1",
        request_id: REQUEST_ID,
        version: 1,
        work_kind: "enrichment",
      },
      messageId: "1",
      visibleAtMs: NOW + 90_000,
    }
    let claimCalls = 0
    let messagePresent = true
    let finishRun: (() => void) | undefined
    const finished = new Promise<void>((resolve) => {
      finishRun = resolve
    })
    let releaseFirstDelete: (() => void) | undefined
    const secondDeleteStarted = new Promise<void>((resolve) => {
      releaseFirstDelete = resolve
    })
    let deleteCalls = 0
    const adapter: DurableWorkerAdapter<string> = {
      claim: async () => {
        claimCalls += 1
        if (claimCalls === 1) {
          return {
            attemptCount: 0,
            leaseToken: "lease-1",
            maxAttempts: 3,
            status: "claimed",
          }
        }
        await finished
        return { status: "terminal" }
      },
      deleteTerminal: async () => {
        deleteCalls += 1
        if (deleteCalls === 1) {
          await secondDeleteStarted
        } else {
          releaseFirstDelete?.()
        }
        if (!messagePresent) return "already_deleted"
        messagePresent = false
        return "deleted"
      },
      finish: async () => {
        finishRun?.()
        return "completed"
      },
      read: async () => [message],
      rejectPoison: async () => true,
      renew: async () => true,
      startAttempt: async () => true,
    }
    const dependencies = {
      adapter,
      handler: {
        run: async () => ({ result: "done", status: "succeeded" as const }),
      },
      monotonicNow: () => 0,
      now: () => NOW,
      retryPolicy,
    }

    const [first, second] = await Promise.all([
      runDurableWorker(request, dependencies),
      runDurableWorker(request, dependencies),
    ])

    expect(first.completed + second.completed).toBe(1)
    expect(first.terminalDeleted + second.terminalDeleted).toBe(1)
    expect(first.terminalAlreadyDeleted + second.terminalAlreadyDeleted).toBe(1)
    expect(messagePresent).toBe(false)
  })

  it("reports queue-wait percentiles for the messages it reads", async () => {
    const waits = [10, 20, 30, 40]
    const adapter = createInMemoryDurableWorkerAdapter(
      waits.map((wait, index) =>
        createSeed<string>({
          enqueuedAtMs: NOW - wait,
          envelope: {
            generation: "1",
            requestId: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
            version: 1,
            workKind: "enrichment",
          },
          messageId: String(index + 1),
        })
      ),
      { now: () => NOW }
    )

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async () => ({ result: "done", status: "succeeded" }),
      },
      now: () => NOW,
      retryPolicy,
    })

    expect(summary.queueWaitP50Ms).toBe(20)
    expect(summary.queueWaitP95Ms).toBe(40)
    expect(summary.queueWaitP99Ms).toBe(40)
  })

  it("keeps the same message for a bounded transient retry", async () => {
    const adapter = createInMemoryDurableWorkerAdapter([createSeed<never>()], {
      now: () => NOW,
    })

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async () => ({ code: "timeout", status: "transient_failure" }),
      },
      now: () => NOW,
      retryPolicy,
    })

    expect(summary.retried).toBe(1)
    expect(summary.terminalDeleted).toBe(0)
    expect(adapter.getWork("1")).toMatchObject({
      attemptCount: 1,
      messageId: "1",
      messagePresent: true,
      state: "queued",
    })
    expect(adapter.getWork("1")?.visibleAtMs).toBeGreaterThan(NOW)
  })

  it("deletes terminal redelivery without running the handler", async () => {
    const adapter = createInMemoryDurableWorkerAdapter(
      [createSeed<string>({ result: "done", state: "completed" })],
      { now: () => NOW }
    )
    let handlerCalls = 0

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async () => {
          handlerCalls += 1
          return { result: "unexpected", status: "succeeded" }
        },
      },
      retryPolicy,
    })

    expect(handlerCalls).toBe(0)
    expect(summary.terminalDeleted).toBe(1)
  })

  it("fails closed when heartbeat renewal loses the lease", async () => {
    const baseAdapter = createInMemoryDurableWorkerAdapter(
      [createSeed<string>()],
      { now: () => NOW }
    )
    let finishCalls = 0
    const adapter: DurableWorkerAdapter<string> = {
      ...baseAdapter,
      finish: async (...arguments_) => {
        finishCalls += 1
        return baseAdapter.finish(...arguments_)
      },
      renew: async () => false,
    }

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async (_envelope, { signal }) => {
          if (!signal.aborted) {
            await new Promise<void>((resolve) => {
              signal.addEventListener("abort", () => resolve(), { once: true })
            })
          }
          return { result: "late", status: "succeeded" }
        },
      },
      retryPolicy,
      wait: async () => true,
    })

    expect(summary.leaseLost).toBe(1)
    expect(finishCalls).toBe(0)
  })

  it("rejects an unsupported envelope once", async () => {
    const baseAdapter = createInMemoryDurableWorkerAdapter(
      [createSeed<string>()],
      { now: () => NOW }
    )
    const badMessage: DurableQueueMessage = {
      deliveryCount: 1,
      enqueuedAtMs: NOW,
      envelope: { version: 2, work_kind: "enrichment" },
      messageId: "1",
      visibleAtMs: NOW + 90_000,
    }
    const adapter: DurableWorkerAdapter<string> = {
      ...baseAdapter,
      read: async () => [badMessage],
    }

    const summary = await runDurableWorker(request, {
      adapter,
      handler: {
        run: async () => ({ result: "unexpected", status: "succeeded" }),
      },
      retryPolicy,
    })

    expect(summary.poisonDeleted).toBe(1)
    expect(baseAdapter.getIncidents()).toEqual([
      {
        messageId: "1",
        queueName,
        reason: "unsupported_payload_version",
      },
    ])
  })

  it("rejects unbounded run limits before reading", async () => {
    const adapter = createInMemoryDurableWorkerAdapter([createSeed<string>()], {
      now: () => NOW,
    })

    await expect(
      runDurableWorker(
        { ...request, batchSize: 101 },
        {
          adapter,
          handler: {
            run: async () => ({ result: "done", status: "succeeded" }),
          },
          retryPolicy,
        }
      )
    ).rejects.toThrow("Durable worker limits are invalid.")
  })

  it("rejects an adapter result above the requested batch bound", async () => {
    const baseAdapter = createInMemoryDurableWorkerAdapter(
      [createSeed<string>()],
      { now: () => NOW }
    )
    const messages = await baseAdapter.read(queueName, 90, 1)
    const adapter: DurableWorkerAdapter<string> = {
      ...baseAdapter,
      read: async () => [messages[0], { ...messages[0], messageId: "2" }],
    }

    await expect(
      runDurableWorker(
        { ...request, batchSize: 1 },
        {
          adapter,
          handler: {
            run: async () => ({ result: "done", status: "succeeded" }),
          },
          retryPolicy,
        }
      )
    ).rejects.toThrow("Durable worker adapter exceeded the batch limit.")
  })
})
