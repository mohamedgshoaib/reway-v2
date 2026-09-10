import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import {
  BookmarkAssetProcessorError,
  type BookmarkAssetRegistry,
} from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"
import type {
  EnrichmentHandlerResult,
  EnrichmentWorkSource,
} from "../../../src/lib/bookmark-enrichment/enrichment-handler.ts"
import type { DurableFinishState } from "../../../src/lib/durable-worker/durable-worker-types.ts"
import {
  createDurableWorkerDatabaseError,
  createInvalidDurableWorkerResultError,
  type SupabaseDurableWorkerClient,
  type SupabaseDurableWorkerFinisher,
} from "../../../src/lib/durable-worker/supabase-durable-worker-adapter.ts"
import type { Database } from "../../../src/types/database.generated.ts"

type RpcResult = {
  data: unknown
  error: PostgrestError | null
}

type UntypedRpc = (
  functionName: string,
  parameters: Record<string, unknown>
) => Promise<RpcResult>

const DECIMAL_PATTERN = /^[1-9][0-9]*$/
const CONTROL_PATTERN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u
const FINISH_STATES = new Set<DurableFinishState>([
  "cancelled",
  "completed",
  "completed_with_failures",
  "failed",
  "queued",
  "rejected",
])

const getRpc = (client: SupabaseClient<Database>): UntypedRpc =>
  client.rpc.bind(client) as unknown as UntypedRpc

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }
}

const throwDatabaseFailure = (error: PostgrestError): never => {
  throw createDurableWorkerDatabaseError(error)
}

const requireBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw createInvalidDurableWorkerResultError()
  }
  return value
}

export const createSupabaseEnrichmentWorkSource = (
  client: SupabaseClient<Database>
): EnrichmentWorkSource => ({
  read: async (envelope, leaseToken, signal) => {
    requireActive(signal)
    const bookmarkIdResult = await getRpc(client)(
      "worker_read_enrichment_bookmark_id",
      {
        target_generation: envelope.generation,
        target_lease_token: leaseToken,
        target_request_id: envelope.requestId,
      }
    )
    if (bookmarkIdResult.error !== null) {
      throwDatabaseFailure(bookmarkIdResult.error)
    }
    requireActive(signal)
    if (bookmarkIdResult.data === null) return null
    if (
      typeof bookmarkIdResult.data !== "string" ||
      !DECIMAL_PATTERN.test(bookmarkIdResult.data)
    ) {
      throw createInvalidDurableWorkerResultError()
    }
    const bookmark = await client
      .from("bookmarks")
      .select("url,title")
      .filter("id", "eq", bookmarkIdResult.data)
      .maybeSingle()
    if (bookmark.error !== null) throwDatabaseFailure(bookmark.error)
    requireActive(signal)
    if (bookmark.data === null) return null
    if (
      typeof bookmark.data.url !== "string" ||
      bookmark.data.url.length === 0 ||
      typeof bookmark.data.title !== "string" ||
      bookmark.data.title.trim().length === 0
    ) {
      throw createInvalidDurableWorkerResultError()
    }
    return {
      fallbackTitle: bookmark.data.title,
      url: bookmark.data.url,
    }
  },
})

export const createSupabaseBookmarkAssetRegistry = (
  client: SupabaseClient<Database>
): BookmarkAssetRegistry => ({
  markReady: async (input) => {
    const response = await getRpc(client)("worker_mark_bookmark_asset_ready", {
      target_asset_id: input.assetId,
      target_byte_size: input.byteSize,
      target_checksum: input.checksumHex,
      target_generation: input.generation,
      target_height: input.height,
      target_lease_token: input.leaseToken,
      target_request_id: input.requestId,
      target_width: input.width,
    })
    if (response.error !== null) {
      throw new BookmarkAssetProcessorError(
        "asset_registry_failed",
        response.error.code !== "42501"
      )
    }
    return requireBoolean(response.data)
  },
  reserve: async (input) => {
    const response = await getRpc(client)("worker_reserve_bookmark_asset", {
      target_asset_id: input.assetId,
      target_content_type: input.contentType,
      target_generation: input.generation,
      target_kind: input.kind,
      target_lease_token: input.leaseToken,
      target_request_id: input.requestId,
    })
    if (response.error !== null) {
      throw new BookmarkAssetProcessorError(
        "asset_registry_failed",
        response.error.code !== "42501" && response.error.code !== "23505"
      )
    }
    if (
      typeof response.data !== "string" ||
      response.data.length === 0 ||
      response.data.length > 512 ||
      CONTROL_PATTERN.test(response.data)
    ) {
      throw new BookmarkAssetProcessorError("asset_registry_failed", false)
    }
    return response.data
  },
})

export const finishSupabaseEnrichmentClaim: SupabaseDurableWorkerFinisher<
  EnrichmentHandlerResult
> = async (client: SupabaseDurableWorkerClient, claim, outcome, retryAtMs) => {
  if (claim.envelope.workKind !== "enrichment") {
    throw createInvalidDurableWorkerResultError()
  }
  const succeeded = outcome.status === "succeeded"
  const result = succeeded ? outcome.result : null
  const failureClass = succeeded
    ? null
    : outcome.status === "transient_failure"
      ? "transient"
      : "permanent"
  const response = await getRpc(client)("worker_finish_enrichment_message", {
    result_domain: result?.domain ?? null,
    result_failure_class: failureClass,
    result_favicon_asset_id: result?.faviconAssetId ?? null,
    result_internal_error: succeeded ? null : outcome.code,
    result_og_image_asset_id: result?.ogImageAssetId ?? null,
    result_public_error_code: succeeded ? null : "metadata_fetch_failed",
    result_title: result?.title ?? null,
    retry_at: retryAtMs === null ? null : new Date(retryAtMs).toISOString(),
    succeeded,
    target_generation: claim.envelope.generation,
    target_lease_token: claim.leaseToken,
    target_message_id: claim.message.messageId,
    target_queue_name: claim.queueName,
    target_request_id: claim.envelope.requestId,
  })
  if (response.error !== null) throwDatabaseFailure(response.error)
  if (
    typeof response.data !== "string" ||
    !FINISH_STATES.has(response.data as DurableFinishState)
  ) {
    throw createInvalidDurableWorkerResultError()
  }
  return response.data as DurableFinishState
}
