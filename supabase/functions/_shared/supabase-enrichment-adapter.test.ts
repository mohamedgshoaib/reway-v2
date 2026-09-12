import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, type Mock, vi } from "vitest"

import type { ClaimedDurableWork } from "../../../src/lib/durable-worker/durable-worker-types"
import { DURABLE_QUEUE_NAMES } from "../../../src/lib/durable-worker/durable-worker-types"
import type { Database } from "../../../src/types/database.generated"
import {
  createSupabaseBookmarkAssetRegistry,
  createSupabaseEnrichmentBatchAdapter,
  createSupabaseEnrichmentWorkSource,
  finishSupabaseEnrichmentClaim,
} from "./supabase-enrichment-adapter"

type RpcResult = { data: unknown; error: PostgrestError | null }
type RpcMock = (
  name: string,
  args: Record<string, unknown>
) => Promise<RpcResult>

const ENVELOPE = {
  generation: "3",
  requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  version: 1,
  workKind: "enrichment",
} as const
const LEASE_TOKEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const MESSAGE = {
  deliveryCount: 1,
  enqueuedAtMs: 0,
  envelope: {},
  messageId: "9007199254740993",
  visibleAtMs: 0,
}

const createClient = (
  rpc: Mock<RpcMock>,
  bookmark: { title: string; url: string } | null = null,
  onFrom?: () => void
): SupabaseClient<Database> =>
  ({
    from: vi.fn<(table: string) => unknown>(() => {
      onFrom?.()
      return {
        select: vi.fn<(columns: string) => unknown>(() => ({
          filter: vi.fn<
            (column: string, operator: string, value: unknown) => unknown
          >(() => ({
            maybeSingle: vi.fn<
              () => Promise<{ data: typeof bookmark; error: null }>
            >(async () => ({ data: bookmark, error: null })),
          })),
        })),
      }
    }),
    rpc,
  }) as unknown as SupabaseClient<Database>

describe("Supabase enrichment adapters", () => {
  it("prepares a checked enrichment window in one RPC", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: [
        {
          attempt_count: 1,
          fallback_title: "Fallback",
          lease_token: LEASE_TOKEN,
          max_attempts: 3,
          message_id: MESSAGE.messageId,
          status: "claimed",
          url: "https://example.com",
        },
      ],
      error: null,
    })
    const adapter = createSupabaseEnrichmentBatchAdapter(createClient(rpc))

    await expect(
      adapter.prepare(
        DURABLE_QUEUE_NAMES.interactiveEnrichment,
        [{ envelope: ENVELOPE, message: MESSAGE }],
        60
      )
    ).resolves.toEqual([
      {
        attemptCount: 1,
        leaseToken: LEASE_TOKEN,
        maxAttempts: 3,
        messageId: MESSAGE.messageId,
        preparedInput: {
          fallbackTitle: "Fallback",
          url: "https://example.com",
        },
        status: "claimed",
      },
    ])
    expect(rpc).toHaveBeenCalledWith("worker_prepare_enrichment_batch", {
      lease_seconds: 60,
      target_messages: [
        {
          generation: "3",
          message_id: MESSAGE.messageId,
          request_id: ENVELOPE.requestId,
        },
      ],
      target_queue_name: DURABLE_QUEUE_NAMES.interactiveEnrichment,
    })
  })

  it("commits a progressive result batch with terminal deletion", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: [
        {
          finish_state: "completed",
          message_id: MESSAGE.messageId,
          terminal_delete_outcome: "deleted",
        },
      ],
      error: null,
    })
    const adapter = createSupabaseEnrichmentBatchAdapter(createClient(rpc))
    const claim: ClaimedDurableWork = {
      attemptCount: 1,
      envelope: ENVELOPE,
      leaseToken: LEASE_TOKEN,
      maxAttempts: 3,
      message: MESSAGE,
      queueName: DURABLE_QUEUE_NAMES.bulkEnrichment,
    }

    await expect(
      adapter.finish([
        {
          claim,
          outcome: {
            result: {
              domain: "example.com",
              faviconAssetId: null,
              ogImageAssetId: null,
              title: "Title",
            },
            status: "succeeded",
          },
          retryAtMs: null,
        },
      ])
    ).resolves.toEqual([
      {
        finishState: "completed",
        messageId: MESSAGE.messageId,
        terminalDeleteOutcome: "deleted",
      },
    ])
    expect(rpc).toHaveBeenCalledWith(
      "worker_finish_enrichment_batch",
      expect.objectContaining({
        target_queue_name: DURABLE_QUEUE_NAMES.bulkEnrichment,
        target_results: [
          expect.objectContaining({
            message_id: MESSAGE.messageId,
            result_title: "Title",
            succeeded: true,
          }),
        ],
      })
    )
  })

  it("reads the bookmark only after the database accepts the active lease", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({ data: "42", error: null })
    const client = createClient(rpc, {
      title: "URL fallback",
      url: "https://example.com/path",
    })

    await expect(
      createSupabaseEnrichmentWorkSource(client).read(
        ENVELOPE,
        LEASE_TOKEN,
        new AbortController().signal
      )
    ).resolves.toEqual({
      fallbackTitle: "URL fallback",
      url: "https://example.com/path",
    })
    expect(rpc).toHaveBeenCalledWith("worker_read_enrichment_bookmark_id", {
      target_generation: "3",
      target_lease_token: LEASE_TOKEN,
      target_request_id: ENVELOPE.requestId,
    })
  })

  it("does not read a bookmark after a stale lease", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({ data: null, error: null })
    const from = vi.fn<() => void>()
    const client = createClient(rpc, null, from)

    await expect(
      createSupabaseEnrichmentWorkSource(client).read(
        ENVELOPE,
        LEASE_TOKEN,
        new AbortController().signal
      )
    ).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("reserves and marks one checked private asset", async () => {
    const rpc = vi
      .fn<RpcMock>()
      .mockResolvedValueOnce({
        data: "owner/bookmark-assets/id.webp",
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
    const registry = createSupabaseBookmarkAssetRegistry(createClient(rpc))

    await expect(
      registry.reserve({
        assetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        attemptNumber: 1,
        contentType: "image/webp",
        generation: "3",
        kind: "favicon",
        leaseToken: LEASE_TOKEN,
        requestId: ENVELOPE.requestId,
      })
    ).resolves.toContain("bookmark-assets")
    await expect(
      registry.markReady({
        assetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        byteSize: 100,
        checksumHex: "00".repeat(32),
        generation: "3",
        height: 16,
        leaseToken: LEASE_TOKEN,
        requestId: ENVELOPE.requestId,
        width: 16,
      })
    ).resolves.toBe(true)
  })

  it("maps a successful handler result to the asset-aware finish call", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: "completed",
      error: null,
    })
    const claim: ClaimedDurableWork = {
      attemptCount: 1,
      envelope: ENVELOPE,
      leaseToken: LEASE_TOKEN,
      maxAttempts: 3,
      message: {
        deliveryCount: 1,
        enqueuedAtMs: 0,
        envelope: {},
        messageId: "9",
        visibleAtMs: 0,
      },
      queueName: DURABLE_QUEUE_NAMES.bulkEnrichment,
    }

    await expect(
      finishSupabaseEnrichmentClaim(
        createClient(rpc),
        claim,
        {
          result: {
            domain: "example.com",
            faviconAssetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            ogImageAssetId: null,
            title: "Title",
          },
          status: "succeeded",
        },
        null
      )
    ).resolves.toBe("completed")
    expect(rpc).toHaveBeenCalledWith(
      "worker_finish_enrichment_message",
      expect.objectContaining({
        result_domain: "example.com",
        result_favicon_asset_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        result_og_image_asset_id: null,
        result_title: "Title",
        succeeded: true,
        target_queue_name: DURABLE_QUEUE_NAMES.bulkEnrichment,
      })
    )
  })

  it("maps bounded retry timing without exposing a raw error", async () => {
    const rpc = vi
      .fn<RpcMock>()
      .mockResolvedValue({ data: "queued", error: null })
    const claim: ClaimedDurableWork = {
      attemptCount: 1,
      envelope: ENVELOPE,
      leaseToken: LEASE_TOKEN,
      maxAttempts: 3,
      message: {
        deliveryCount: 1,
        enqueuedAtMs: 0,
        envelope: {},
        messageId: "9",
        visibleAtMs: 0,
      },
      queueName: DURABLE_QUEUE_NAMES.interactiveEnrichment,
    }

    await expect(
      finishSupabaseEnrichmentClaim(
        createClient(rpc),
        claim,
        { code: "timeout", status: "transient_failure" },
        10_000
      )
    ).resolves.toBe("queued")
    expect(rpc).toHaveBeenCalledWith(
      "worker_finish_enrichment_message",
      expect.objectContaining({
        result_failure_class: "transient",
        result_internal_error: "timeout",
        result_public_error_code: "metadata_fetch_failed",
        retry_at: "1970-01-01T00:00:10.000Z",
      })
    )
  })
})
