import type { SupabaseClient } from "@supabase/supabase-js"

import {
  BookmarkAssetProcessorError,
  type PrivateAssetStorage,
  type PrivateAssetStorageRequest,
} from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"
import type { Database } from "../../../src/types/database.generated.ts"

const BOOKMARK_ASSET_BUCKET = "bookmark-assets"
const PRIVATE_CACHE_SECONDS = "3600"

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }
}

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.byteLength !== right.byteLength) return false
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

const reconcileDuplicate = async (
  request: PrivateAssetStorageRequest,
  client: Pick<SupabaseClient<Database>, "storage">
): Promise<"matched"> => {
  const result = await client.storage
    .from(BOOKMARK_ASSET_BUCKET)
    .download(request.objectPath)
  if (result.error !== null) {
    throw new BookmarkAssetProcessorError("storage_read_failed", true)
  }
  requireActive(request.signal)
  const existingBytes = new Uint8Array(await result.data.arrayBuffer())
  requireActive(request.signal)
  if (!bytesEqual(existingBytes, request.bytes)) {
    throw new BookmarkAssetProcessorError("storage_conflict", false)
  }
  return "matched"
}

export const createSupabasePrivateAssetStorage = (
  client: Pick<SupabaseClient<Database>, "storage">
): PrivateAssetStorage => ({
  putImmutable: async (request) => {
    requireActive(request.signal)
    const result = await client.storage
      .from(BOOKMARK_ASSET_BUCKET)
      .upload(request.objectPath, request.bytes, {
        cacheControl: PRIVATE_CACHE_SECONDS,
        contentType: request.contentType,
        upsert: false,
      })
    requireActive(request.signal)

    if (result.error !== null) {
      if (result.error.status === 409) {
        return reconcileDuplicate(request, client)
      }
      throw new BookmarkAssetProcessorError("storage_upload_failed", true)
    }
    if (result.data.path !== request.objectPath) {
      throw new BookmarkAssetProcessorError("storage_upload_failed", true)
    }
    return "stored"
  },
})
