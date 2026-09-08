import type {
  DurableRetryInput,
  DurableRetryPolicy,
} from "./durable-worker-types"

export interface DurableRetryPolicyOptions {
  baseDelayMs: number
  jitterRatio: number
  maximumDelayMs: number
}

const UINT32_MAX = 4_294_967_295
const FNV_OFFSET_BASIS = 2_166_136_261
const FNV_PRIME = 16_777_619

const getStableUnit = (value: string): number => {
  let hash = FNV_OFFSET_BASIS
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash / UINT32_MAX
}

const requireFiniteInteger = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`)
  }
  return value
}

export const createDurableRetryPolicy = ({
  baseDelayMs,
  jitterRatio,
  maximumDelayMs,
}: DurableRetryPolicyOptions): DurableRetryPolicy => {
  requireFiniteInteger(baseDelayMs, "baseDelayMs")
  requireFiniteInteger(maximumDelayMs, "maximumDelayMs")
  if (baseDelayMs === 0 || maximumDelayMs < baseDelayMs) {
    throw new Error("Retry delay bounds are invalid.")
  }
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 0.5) {
    throw new Error("jitterRatio must be between 0 and 0.5.")
  }

  return {
    getRetryAt: ({
      attemptCount,
      maxAttempts,
      nowMs,
      requestKey,
      retryAfterMs,
    }: DurableRetryInput): number | null => {
      requireFiniteInteger(attemptCount, "attemptCount")
      requireFiniteInteger(maxAttempts, "maxAttempts")
      requireFiniteInteger(nowMs, "nowMs")

      if (attemptCount >= maxAttempts) {
        return null
      }

      const exponent = Math.max(0, attemptCount - 1)
      const exponentialDelay = Math.min(
        maximumDelayMs,
        baseDelayMs * 2 ** exponent
      )
      const unit = getStableUnit(`${requestKey}:${attemptCount}`)
      const jitterFactor = 1 - jitterRatio + unit * jitterRatio * 2
      const jitteredDelay = Math.round(exponentialDelay * jitterFactor)
      const boundedRetryAfter =
        retryAfterMs === undefined
          ? 0
          : Math.min(
              maximumDelayMs,
              requireFiniteInteger(retryAfterMs, "retryAfterMs")
            )
      const delay = Math.min(
        maximumDelayMs,
        Math.max(jitteredDelay, boundedRetryAfter)
      )

      return nowMs + delay
    },
  }
}
