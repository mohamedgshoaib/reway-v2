import { describe, expect, it, vi } from "vitest"

import { runDurableWorker } from "../durable-worker/durable-worker"
import { createDurableRetryPolicy } from "../durable-worker/durable-worker-retry"
import { DURABLE_QUEUE_NAMES } from "../durable-worker/durable-worker-types"
import { createInMemoryDurableWorkerAdapter } from "../durable-worker/in-memory-durable-worker-adapter"
import {
  PinnedHttpFetchError,
  type PinnedHttpFetcher,
} from "../network-safety/pinned-http-fetch"
import type { BookmarkAssetProcessor } from "./bookmark-asset-processor"
import {
  createEnrichmentHandler,
  type EnrichmentWorkSource,
} from "./enrichment-handler"

const ENVELOPE = {
  generation: "3",
  requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  version: 1,
  workKind: "enrichment",
} as const
const OPTIONS = {
  attemptNumber: 2,
  leaseToken: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  signal: new AbortController().signal,
}

const createFetcher = (): PinnedHttpFetcher => ({
  fetch: vi.fn<PinnedHttpFetcher["fetch"]>(async ({ url }) => {
    if (url.endsWith("favicon.png")) {
      return {
        body: new Uint8Array([1]),
        contentType: "image/png",
        finalUrl: url,
      }
    }
    if (url.endsWith("image.jpg")) {
      return {
        body: new Uint8Array([2]),
        contentType: "image/jpeg",
        finalUrl: url,
      }
    }
    return {
      body: new TextEncoder().encode(
        '<title>Document title</title><link rel="icon" href="/favicon.png"><meta property="og:title" content="Page title"><meta property="og:image" content="/image.jpg">'
      ),
      contentType: "text/html; charset=utf-8",
      finalUrl: "https://final.example/article",
    }
  }),
})

describe("enrichment handler", () => {
  it("fetches page metadata and stores both checked asset derivatives", async () => {
    const process = vi.fn<BookmarkAssetProcessor["process"]>(async (input) => ({
      assetId: input.assetId,
      byteSize: 10,
      checksumHex: "00".repeat(32),
      contentType: "image/webp",
      height: 1,
      objectPath: `private/${input.assetId}.webp`,
      status: "ready",
      upload: "stored",
      width: 1,
    }))
    const ids = [
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    ]
    const handler = createEnrichmentHandler({
      assets: { process },
      createAssetId: () => ids.shift() ?? "missing",
      fetcher: createFetcher(),
      monotonicNow: (() => {
        let tick = 0
        return () => tick++
      })(),
      source: {
        read: async () => ({
          fallbackTitle: "Fallback",
          url: "https://source.example/article",
        }),
      },
    })

    const result = await handler.run(ENVELOPE, OPTIONS)

    expect(result).toEqual({
      result: {
        domain: "final.example",
        faviconAssetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ogImageAssetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        title: "Page title",
      },
      stageTimings: { assetProcessingMs: 2, fetchMs: 3 },
      status: "succeeded",
    })
    expect(process).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        attemptNumber: 2,
        generation: "3",
        kind: "favicon",
        leaseToken: OPTIONS.leaseToken,
        requestId: ENVELOPE.requestId,
      })
    )
  })

  it("keeps a valid metadata result when an image is permanently rejected", async () => {
    const baseFetcher = createFetcher()
    const fetcher: PinnedHttpFetcher = {
      fetch: vi.fn<PinnedHttpFetcher["fetch"]>(async (request) => {
        if (request.url.endsWith("favicon.png")) {
          throw new PinnedHttpFetchError("unsupported_content_type", false)
        }
        return baseFetcher.fetch(request)
      }),
    }
    const handler = createEnrichmentHandler({
      assets: {
        process: async (input) => ({
          assetId: input.assetId,
          byteSize: 10,
          checksumHex: "00".repeat(32),
          contentType: "image/webp",
          height: 1,
          objectPath: "private/image.webp",
          status: "ready",
          upload: "stored",
          width: 1,
        }),
      },
      createAssetId: () => "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      fetcher,
      source: {
        read: async () => ({
          fallbackTitle: "Fallback",
          url: "https://source.example",
        }),
      },
    })

    await expect(handler.run(ENVELOPE, OPTIONS)).resolves.toMatchObject({
      result: { faviconAssetId: null, title: "Page title" },
      status: "succeeded",
    })
  })

  it("returns a bounded transient failure for a temporary page error", async () => {
    const handler = createEnrichmentHandler({
      assets: { process: vi.fn<BookmarkAssetProcessor["process"]>() },
      createAssetId: () => crypto.randomUUID(),
      fetcher: {
        fetch: async () => {
          throw new PinnedHttpFetchError("timeout", true)
        },
      },
      monotonicNow: () => 0,
      source: {
        read: async () => ({
          fallbackTitle: "Fallback",
          url: "https://source.example",
        }),
      },
    })

    await expect(handler.run(ENVELOPE, OPTIONS)).resolves.toEqual({
      code: "timeout",
      retryAfterMs: undefined,
      stageTimings: { assetProcessingMs: 0, fetchMs: 0 },
      status: "transient_failure",
    })
  })

  it("does no remote work after a stale generation", async () => {
    const fetch = vi.fn<PinnedHttpFetcher["fetch"]>()
    const handler = createEnrichmentHandler({
      assets: { process: vi.fn<BookmarkAssetProcessor["process"]>() },
      createAssetId: () => crypto.randomUUID(),
      fetcher: { fetch },
      monotonicNow: () => 0,
      source: { read: async () => null },
    })

    await expect(handler.run(ENVELOPE, OPTIONS)).resolves.toEqual({
      code: "stale_generation",
      stageTimings: { assetProcessingMs: 0, fetchMs: 0 },
      status: "permanent_failure",
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("uses prepared input without another database read", async () => {
    const read = vi.fn<EnrichmentWorkSource["read"]>(async () => null)
    const handler = createEnrichmentHandler({
      assets: { process: vi.fn<BookmarkAssetProcessor["process"]>() },
      createAssetId: () => crypto.randomUUID(),
      fetcher: {
        fetch: async ({ url }) => ({
          body: new TextEncoder().encode("<title>Prepared title</title>"),
          contentType: "text/html",
          finalUrl: url,
        }),
      },
      source: { read },
    })

    await expect(
      handler.run(ENVELOPE, {
        ...OPTIONS,
        preparedInput: {
          fallbackTitle: "Prepared fallback",
          url: "https://prepared.example",
        },
      })
    ).resolves.toMatchObject({
      result: { domain: "prepared.example", title: "Prepared title" },
      status: "succeeded",
    })
    expect(read).not.toHaveBeenCalled()
  })

  it.each([
    DURABLE_QUEUE_NAMES.interactiveEnrichment,
    DURABLE_QUEUE_NAMES.bulkEnrichment,
  ])("runs through the durable worker on %s", async (queueName) => {
    const handler = createEnrichmentHandler({
      assets: { process: vi.fn<BookmarkAssetProcessor["process"]>() },
      createAssetId: () => crypto.randomUUID(),
      fetcher: {
        fetch: async ({ url }) => ({
          body: new TextEncoder().encode("<title>Stored title</title>"),
          contentType: "text/html",
          finalUrl: url,
        }),
      },
      source: {
        read: async () => ({
          fallbackTitle: "Fallback",
          url: "https://example.com",
        }),
      },
    })
    const adapter = createInMemoryDurableWorkerAdapter(
      [
        {
          envelope: ENVELOPE,
          enqueuedAtMs: 0,
          maxAttempts: 3,
          messageId: "1",
          queueName,
          visibleAtMs: 1,
        },
      ],
      { now: () => 1 }
    )

    const summary = await runDurableWorker(
      {
        batchSize: 1,
        concurrency: 1,
        heartbeatIntervalMs: 20_000,
        leaseSeconds: 60,
        queueName,
        visibilitySeconds: 90,
      },
      {
        adapter,
        handler,
        now: () => 1,
        retryPolicy: createDurableRetryPolicy({
          baseDelayMs: 5_000,
          jitterRatio: 0.2,
          maximumDelayMs: 300_000,
        }),
      }
    )

    expect(summary.completed).toBe(1)
    expect(adapter.getWork("1")?.result).toMatchObject({
      domain: "example.com",
      title: "Stored title",
    })
  })
})
