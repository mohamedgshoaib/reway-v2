import { describe, expect, it } from "vitest"

import {
  createPinnedHttpFetcher,
  PinnedHttpFetchError,
} from "./pinned-http-fetch"
import { createSsrfPolicy } from "./ssrf-policy"

const encoder = new TextEncoder()

const createHarness = (
  responses: readonly string[],
  addresses: Readonly<Record<string, string>> = {}
) => {
  const requests: string[] = []
  let responseIndex = 0
  const ssrfPolicy = createSsrfPolicy({
    connections: {
      open: async ({ ipAddress }) => {
        const response = responses[responseIndex]
        responseIndex += 1
        if (response === undefined) throw new Error("Missing test response.")
        let requestBytes = new Uint8Array()
        return {
          close: () => {},
          readable: new ReadableStream({
            start: (controller) => {
              controller.enqueue(encoder.encode(response))
              controller.close()
            },
          }),
          remoteAddress: ipAddress,
          writable: new WritableStream<Uint8Array>({
            write: (chunk) => {
              const combined = new Uint8Array(
                requestBytes.length + chunk.length
              )
              combined.set(requestBytes)
              combined.set(chunk, requestBytes.length)
              requestBytes = combined
              requests.push(new TextDecoder().decode(requestBytes))
            },
          }),
        }
      },
    },
    dns: {
      resolve: async (hostname) => [
        {
          address: addresses[hostname] ?? "93.184.216.34",
          family: "ipv4" as const,
        },
      ],
    },
  })
  return {
    fetcher: createPinnedHttpFetcher({ requestTimeoutMs: 1_000, ssrfPolicy }),
    requests,
  }
}

const fetchHtml = (
  fetcher: ReturnType<typeof createPinnedHttpFetcher>,
  overrides: Partial<Parameters<typeof fetcher.fetch>[0]> = {}
) =>
  fetcher.fetch({
    acceptedContentTypes: new Set(["text/html"]),
    maxBodyBytes: 1_024,
    signal: new AbortController().signal,
    url: "https://example.com/page",
    ...overrides,
  })

describe("pinned HTTP fetch", () => {
  it("fetches a bounded identity-encoded response through the checked peer", async () => {
    const body = "<title>Safe</title>"
    const harness = createHarness([
      `HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${body.length}\r\n\r\n${body}`,
    ])

    const result = await fetchHtml(harness.fetcher)

    expect(new TextDecoder().decode(result.body)).toBe(body)
    expect(result.finalUrl).toBe("https://example.com/page")
    expect(harness.requests[0]).toContain("GET /page HTTP/1.1\r\n")
    expect(harness.requests[0]).toContain("Accept-Encoding: identity\r\n")
  })

  it("keeps a connection open after writing until the response is read", async () => {
    const body = "<title>Deno stream</title>"
    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${body.length}\r\n\r\n${body}`
    let readableController: ReadableStreamDefaultController<Uint8Array>
    let writableClosed = false
    const ssrfPolicy = createSsrfPolicy({
      connections: {
        open: async ({ ipAddress }) => ({
          close: () => {},
          readable: new ReadableStream({
            start: (controller) => {
              readableController = controller
            },
          }),
          remoteAddress: ipAddress,
          writable: new WritableStream<Uint8Array>({
            close: () => {
              writableClosed = true
              readableController.error(new Error("Connection closed."))
            },
            write: () => {
              setTimeout(() => {
                if (writableClosed) return
                readableController.enqueue(encoder.encode(response))
                readableController.close()
              }, 0)
            },
          }),
        }),
      },
      dns: {
        resolve: async () => [
          { address: "93.184.216.34", family: "ipv4" as const },
        ],
      },
    })
    const fetcher = createPinnedHttpFetcher({
      requestTimeoutMs: 1_000,
      ssrfPolicy,
    })

    const result = await fetchHtml(fetcher)

    expect(new TextDecoder().decode(result.body)).toBe(body)
  })

  it("decodes a bounded chunked response", async () => {
    const harness = createHarness([
      "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n6\r\n world\r\n0\r\n\r\n",
    ])

    const result = await fetchHtml(harness.fetcher)

    expect(new TextDecoder().decode(result.body)).toBe("hello world")
  })

  it("validates and pins every redirect target", async () => {
    const harness = createHarness(
      [
        "HTTP/1.1 302 Found\r\nLocation: https://blocked.example/private\r\nContent-Length: 0\r\n\r\n",
      ],
      { "blocked.example": "127.0.0.1" }
    )

    await expect(fetchHtml(harness.fetcher)).rejects.toMatchObject({
      code: "network_failed",
      retrySafe: false,
    })
  })

  it("rejects an oversized declared body before returning bytes", async () => {
    const harness = createHarness([
      "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 2048\r\n\r\n",
    ])

    await expect(fetchHtml(harness.fetcher)).rejects.toMatchObject({
      code: "body_too_large",
      retrySafe: false,
    })
  })

  it("classifies rate limits and bounds Retry-After through the retry policy", async () => {
    const harness = createHarness([
      "HTTP/1.1 429 Too Many Requests\r\nRetry-After: 12\r\nContent-Length: 0\r\n\r\n",
    ])

    await expect(fetchHtml(harness.fetcher)).rejects.toMatchObject({
      code: "remote_rejected",
      retryAfterMs: 12_000,
      retrySafe: true,
    })
  })

  it("rejects compressed responses so expansion cannot bypass the byte cap", async () => {
    const harness = createHarness([
      "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Encoding: gzip\r\nContent-Length: 0\r\n\r\n",
    ])

    const error = fetchHtml(harness.fetcher)
    await expect(error).rejects.toBeInstanceOf(PinnedHttpFetchError)
    await expect(error).rejects.toMatchObject({
      code: "unsupported_content_encoding",
    })
  })
})
