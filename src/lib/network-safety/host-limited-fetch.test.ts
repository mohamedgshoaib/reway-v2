import { describe, expect, it, vi } from "vitest"

import { createHostLimitedFetcher } from "./host-limited-fetch"
import type { PinnedHttpFetcher } from "./pinned-http-fetch"

const REQUEST = {
  acceptedContentTypes: new Set(["text/html"]),
  maxBodyBytes: 10,
  signal: new AbortController().signal,
  url: "https://same.example/page",
}

describe("host-limited fetch", () => {
  it("limits one host without blocking a different host", async () => {
    const releases: Array<() => void> = []
    let active = 0
    let maximumActive = 0
    const base: PinnedHttpFetcher = {
      fetch: vi.fn<PinnedHttpFetcher["fetch"]>(async ({ url }) => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await new Promise<void>((resolve) => releases.push(resolve))
        active -= 1
        return {
          body: new Uint8Array(),
          contentType: "text/html",
          finalUrl: url,
        }
      }),
    }
    const fetcher = createHostLimitedFetcher(base, 1)

    const first = fetcher.fetch(REQUEST)
    const second = fetcher.fetch({
      ...REQUEST,
      url: "https://same.example/two",
    })
    const other = fetcher.fetch({ ...REQUEST, url: "https://other.example/" })
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    expect(maximumActive).toBe(2)
    releases.shift()?.()
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    releases.shift()?.()
    releases.shift()?.()

    await expect(Promise.all([first, second, other])).resolves.toHaveLength(3)
  })

  it("removes an aborted waiter", async () => {
    let releaseFirst: (() => void) | undefined
    const base: PinnedHttpFetcher = {
      fetch: async ({ url }) => {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve
        })
        return {
          body: new Uint8Array(),
          contentType: "text/html",
          finalUrl: url,
        }
      },
    }
    const fetcher = createHostLimitedFetcher(base, 1)
    const first = fetcher.fetch(REQUEST)
    const controller = new AbortController()
    const second = fetcher.fetch({ ...REQUEST, signal: controller.signal })
    controller.abort()

    await expect(second).rejects.toMatchObject({ name: "AbortError" })
    releaseFirst?.()
    await expect(first).resolves.toBeDefined()
  })
})
