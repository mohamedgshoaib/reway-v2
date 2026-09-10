import type {
  PinnedHttpFetcher,
  PinnedHttpFetchRequest,
  PinnedHttpFetchResult,
} from "./pinned-http-fetch.ts"
import { normalizeHttpUrl } from "./url-policy.ts"

interface HostWaiter {
  readonly reject: (error: unknown) => void
  readonly resolve: (release: () => void) => void
  readonly signal: AbortSignal
}

interface HostState {
  active: number
  readonly waiters: HostWaiter[]
}

const abortError = (): DOMException =>
  new DOMException("The operation was aborted.", "AbortError")

export const createHostLimitedFetcher = (
  fetcher: PinnedHttpFetcher,
  maxConcurrencyPerHost: number
): PinnedHttpFetcher => {
  if (
    !Number.isSafeInteger(maxConcurrencyPerHost) ||
    maxConcurrencyPerHost < 1
  ) {
    throw new Error("The per-host concurrency limit is invalid.")
  }
  const hosts = new Map<string, HostState>()

  const releaseHost = (hostname: string, state: HostState): void => {
    state.active -= 1
    while (state.waiters.length > 0) {
      const waiter = state.waiters.shift()
      if (waiter === undefined) break
      if (waiter.signal.aborted) {
        waiter.reject(abortError())
        continue
      }
      state.active += 1
      waiter.resolve(() => releaseHost(hostname, state))
      return
    }
    if (state.active === 0) hosts.delete(hostname)
  }

  const acquireHost = (
    hostname: string,
    signal: AbortSignal
  ): Promise<() => void> => {
    if (signal.aborted) return Promise.reject(abortError())
    const state = hosts.get(hostname) ?? { active: 0, waiters: [] }
    hosts.set(hostname, state)
    if (state.active < maxConcurrencyPerHost) {
      state.active += 1
      return Promise.resolve(() => releaseHost(hostname, state))
    }
    return new Promise((resolve, reject) => {
      const waiter: HostWaiter = {
        reject,
        resolve: (release) => {
          signal.removeEventListener("abort", onAbort)
          resolve(release)
        },
        signal,
      }
      const onAbort = (): void => {
        const index = state.waiters.indexOf(waiter)
        if (index >= 0) state.waiters.splice(index, 1)
        reject(abortError())
      }
      signal.addEventListener("abort", onAbort, { once: true })
      state.waiters.push(waiter)
    })
  }

  return {
    fetch: async (
      request: PinnedHttpFetchRequest
    ): Promise<PinnedHttpFetchResult> => {
      const normalized = normalizeHttpUrl(request.url)
      if (!normalized.ok) return fetcher.fetch(request)
      const release = await acquireHost(
        normalized.value.hostname,
        request.signal
      )
      try {
        return await fetcher.fetch(request)
      } finally {
        release()
      }
    },
  }
}
