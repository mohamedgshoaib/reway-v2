import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import type { Database } from "../../../src/types/database.generated"
import { createSupabasePrivateAssetStorage } from "./supabase-private-asset-storage"

const OBJECT_PATH =
  "40000000-0000-4000-8000-000000000001/bookmark-assets/10000000-0000-4000-8000-000000000001.webp"

interface StorageResult {
  readonly data: { readonly path: string } | null
  readonly error: { readonly status?: number } | null
}

interface DownloadResult {
  readonly data: Blob | null
  readonly error: { readonly status?: number } | null
}

const createClient = (options: {
  download?: DownloadResult
  upload: StorageResult
}) => {
  const upload = vi
    .fn<
      (
        path: string,
        bytes: Uint8Array,
        options: {
          cacheControl: string
          contentType: string
          upsert: boolean
        }
      ) => Promise<StorageResult>
    >()
    .mockResolvedValue(options.upload)
  const download = vi
    .fn<(path: string) => Promise<DownloadResult>>()
    .mockResolvedValue(
      options.download ?? { data: null, error: { status: 500 } }
    )
  const from = vi
    .fn<
      (bucket: string) => { download: typeof download; upload: typeof upload }
    >()
    .mockReturnValue({ download, upload })
  const client = { storage: { from } } as unknown as Pick<
    SupabaseClient<Database>,
    "storage"
  >
  return { client, download, from, upload }
}

const createRequest = (bytes = Uint8Array.from([1, 2, 3])) => ({
  bytes,
  contentType: "image/webp" as const,
  objectPath: OBJECT_PATH,
  signal: new AbortController().signal,
})

describe("Supabase private asset storage", () => {
  it("uploads once to the private bucket without overwrite", async () => {
    const context = createClient({
      upload: { data: { path: OBJECT_PATH }, error: null },
    })
    const storage = createSupabasePrivateAssetStorage(context.client)

    await expect(storage.putImmutable(createRequest())).resolves.toBe("stored")
    expect(context.from).toHaveBeenCalledWith("bookmark-assets")
    expect(context.upload).toHaveBeenCalledWith(
      OBJECT_PATH,
      Uint8Array.from([1, 2, 3]),
      {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      }
    )
  })

  it("accepts an uncertain prior upload only when stored bytes match", async () => {
    const context = createClient({
      download: { data: new Blob([Uint8Array.from([1, 2, 3])]), error: null },
      upload: { data: null, error: { status: 409 } },
    })
    const storage = createSupabasePrivateAssetStorage(context.client)

    await expect(storage.putImmutable(createRequest())).resolves.toBe("matched")
    expect(context.download).toHaveBeenCalledWith(OBJECT_PATH)
  })

  it("rejects a conflicting immutable object", async () => {
    const context = createClient({
      download: { data: new Blob([Uint8Array.from([9])]), error: null },
      upload: { data: null, error: { status: 409 } },
    })
    const storage = createSupabasePrivateAssetStorage(context.client)

    await expect(storage.putImmutable(createRequest())).rejects.toEqual(
      expect.objectContaining({
        code: "storage_conflict",
        retrySafe: false,
      })
    )
  })

  it("maps upload and duplicate-read failures without raw errors", async () => {
    const uploadFailure = createClient({
      upload: { data: null, error: { status: 503 } },
    })
    await expect(
      createSupabasePrivateAssetStorage(uploadFailure.client).putImmutable(
        createRequest()
      )
    ).rejects.toEqual(
      expect.objectContaining({
        code: "storage_upload_failed",
        retrySafe: true,
      })
    )

    const readFailure = createClient({
      download: { data: null, error: { status: 503 } },
      upload: { data: null, error: { status: 409 } },
    })
    await expect(
      createSupabasePrivateAssetStorage(readFailure.client).putImmutable(
        createRequest()
      )
    ).rejects.toEqual(
      expect.objectContaining({ code: "storage_read_failed", retrySafe: true })
    )
  })

  it("does not call Storage after cancellation", async () => {
    const context = createClient({
      upload: { data: { path: OBJECT_PATH }, error: null },
    })
    const controller = new AbortController()
    controller.abort()

    await expect(
      createSupabasePrivateAssetStorage(context.client).putImmutable({
        ...createRequest(),
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" })
    expect(context.upload).not.toHaveBeenCalled()
  })
})
