import { describe, expect, it } from "vitest"

import { createDurableRetryPolicy } from "./durable-worker-retry"

const policy = createDurableRetryPolicy({
  baseDelayMs: 5_000,
  jitterRatio: 0.2,
  maximumDelayMs: 300_000,
})

describe("durable retry policy", () => {
  it("returns a stable bounded retry time", () => {
    const input = {
      attemptCount: 1,
      maxAttempts: 3,
      nowMs: 1_000_000,
      requestKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:1",
    }
    const first = policy.getRetryAt(input)
    const second = policy.getRetryAt(input)

    expect(first).toBe(second)
    expect(first).toBeGreaterThanOrEqual(input.nowMs + 4_000)
    expect(first).toBeLessThanOrEqual(input.nowMs + 6_000)
  })

  it("respects Retry-After within the maximum", () => {
    expect(
      policy.getRetryAt({
        attemptCount: 1,
        maxAttempts: 3,
        nowMs: 1_000,
        requestKey: "request",
        retryAfterMs: 120_000,
      })
    ).toBe(121_000)
    expect(
      policy.getRetryAt({
        attemptCount: 1,
        maxAttempts: 3,
        nowMs: 1_000,
        requestKey: "request",
        retryAfterMs: 900_000,
      })
    ).toBe(301_000)
  })

  it("stops after the attempt limit", () => {
    expect(
      policy.getRetryAt({
        attemptCount: 3,
        maxAttempts: 3,
        nowMs: 1_000,
        requestKey: "request",
      })
    ).toBeNull()
  })
})
