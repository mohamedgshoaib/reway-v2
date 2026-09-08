import { describe, expect, it } from "vitest"

import {
  EDGE_WORKER_QUEUE_NAMES,
  handleDurableWorkerWake,
} from "./durable-worker-wake"

const TOKEN = "test-worker-wake-token"
const createRequest = (
  queueName: string = EDGE_WORKER_QUEUE_NAMES[0],
  token = TOKEN
): Request =>
  new Request("https://example.invalid/functions/v1/durable-worker", {
    body: JSON.stringify({ queue_name: queueName }),
    headers: {
      "Content-Type": "application/json",
      "x-reway-worker-wake": token,
    },
    method: "POST",
  })

describe("durable worker wake", () => {
  it("rejects a request when the worker token is not configured", async () => {
    const response = await handleDurableWorkerWake(createRequest(), {
      enabledQueues: new Set(),
      runQueue: async () => ({}),
      wakeToken: undefined,
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: "worker_not_configured",
    })
  })

  it("rejects the wrong wake token", async () => {
    const response = await handleDurableWorkerWake(
      createRequest(EDGE_WORKER_QUEUE_NAMES[0], "wrong"),
      {
        enabledQueues: new Set(),
        runQueue: async () => ({}),
        wakeToken: TOKEN,
      }
    )

    expect(response.status).toBe(401)
  })

  it("keeps every handler disabled during Phase 8E", async () => {
    const response = await handleDurableWorkerWake(createRequest(), {
      enabledQueues: new Set(),
      runQueue: async () => ({}),
      wakeToken: TOKEN,
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      code: "worker_not_enabled",
    })
  })

  it("runs only an explicitly enabled queue", async () => {
    const queueName = EDGE_WORKER_QUEUE_NAMES[0]
    const response = await handleDurableWorkerWake(createRequest(queueName), {
      enabledQueues: new Set([queueName]),
      runQueue: async () => ({ claimed: 2, completed: 2 }),
      wakeToken: TOKEN,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      code: "worker_run_complete",
      result: { claimed: 2, completed: 2 },
    })
  })

  it("rejects unknown queues and oversized bodies", async () => {
    const options = {
      enabledQueues: new Set([EDGE_WORKER_QUEUE_NAMES[0]]),
      runQueue: async () => ({}),
      wakeToken: TOKEN,
    }
    const unknownQueue = await handleDurableWorkerWake(
      createRequest("unknown"),
      options
    )
    const oversized = await handleDurableWorkerWake(
      new Request("https://example.invalid", {
        body: JSON.stringify({ queue_name: "x".repeat(300) }),
        headers: { "x-reway-worker-wake": TOKEN },
        method: "POST",
      }),
      options
    )

    expect(unknownQueue.status).toBe(400)
    expect(oversized.status).toBe(400)
  })
})
