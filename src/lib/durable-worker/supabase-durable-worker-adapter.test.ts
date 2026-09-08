import type { PostgrestError } from "@supabase/supabase-js"
import { describe, expect, it, type Mock, vi } from "vitest"

import {
  DURABLE_QUEUE_NAMES,
  type ClaimedDurableWork,
} from "./durable-worker-types"
import {
  createSupabaseDurableWorkerAdapter,
  type SupabaseDurableWorkerFinisher,
  type SupabaseDurableWorkerClient,
} from "./supabase-durable-worker-adapter.server"

type RpcResult = { data: unknown; error: PostgrestError | null }
type RpcMock = (
  name: string,
  args: Record<string, unknown>
) => Promise<RpcResult>

const createClient = (rpc: Mock<RpcMock>): SupabaseDurableWorkerClient =>
  ({ rpc }) as unknown as SupabaseDurableWorkerClient

const message = {
  deliveryCount: 1,
  enqueuedAtMs: 1_000,
  envelope: {
    generation: "1",
    request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    version: 1,
    work_kind: "enrichment",
  },
  messageId: "9007199254740993",
  visibleAtMs: 91_000,
}

describe("Supabase durable worker adapter", () => {
  it("keeps opaque message IDs as strings", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: [
        {
          delivery_count: 1,
          enqueued_at: "1970-01-01T00:00:01.000Z",
          envelope: message.envelope,
          message_id: message.messageId,
          visible_at: "1970-01-01T00:01:31.000Z",
        },
      ],
      error: null,
    })
    const adapter = createSupabaseDurableWorkerAdapter(
      createClient(rpc),
      vi.fn()
    )

    await expect(
      adapter.read(DURABLE_QUEUE_NAMES.interactiveEnrichment, 90, 1)
    ).resolves.toEqual([message])
  })

  it("claims an enrichment generation through the narrow RPC", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: {
        attempt_count: 0,
        lease_token: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        max_attempts: 3,
        status: "claimed",
      },
      error: null,
    })
    const adapter = createSupabaseDurableWorkerAdapter(
      createClient(rpc),
      vi.fn()
    )

    await expect(
      adapter.claim(
        DURABLE_QUEUE_NAMES.interactiveEnrichment,
        message,
        {
          generation: "1",
          requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version: 1,
          workKind: "enrichment",
        },
        60
      )
    ).resolves.toMatchObject({ status: "claimed" })
    expect(rpc).toHaveBeenCalledWith("worker_claim_enrichment_message", {
      lease_seconds: 60,
      target_generation: "1",
      target_message_id: "9007199254740993",
      target_queue_name: DURABLE_QUEUE_NAMES.interactiveEnrichment,
      target_request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    })
  })

  it("delegates queue-specific completion without exposing raw errors", async () => {
    const rpc = vi.fn<RpcMock>()
    const finishClaim = vi
      .fn<SupabaseDurableWorkerFinisher<string>>()
      .mockResolvedValue("completed")
    const client = createClient(rpc)
    const adapter = createSupabaseDurableWorkerAdapter(client, finishClaim)
    const claim: ClaimedDurableWork = {
      attemptCount: 1,
      envelope: {
        jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version: 1,
        workKind: "export",
      },
      leaseToken: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      maxAttempts: 3,
      message,
      queueName: DURABLE_QUEUE_NAMES.exportTransfer,
    }
    const outcome = { result: "file", status: "succeeded" } as const

    await expect(adapter.finish(claim, outcome, null)).resolves.toBe(
      "completed"
    )
    expect(finishClaim).toHaveBeenCalledWith(client, claim, outcome, null)
  })
})
