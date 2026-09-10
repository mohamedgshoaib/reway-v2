import { describe, expect, it, vi } from "vitest"

import {
  createBookmarkAssetProcessor,
  type BookmarkAssetReadyInput,
  type BookmarkAssetReservation,
  type ImageRasterizerRequest,
  type PrivateAssetStorageRequest,
  type StaticImageDerivative,
} from "./bookmark-asset-processor"

const STATIC_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ),
  (character) => character.charCodeAt(0)
)

const createInput = (
  overrides: Partial<{
    bytes: Uint8Array
    declaredContentType: string
    kind: "favicon" | "og_image"
  }> = {}
) => ({
  assetId: "10000000-0000-4000-8000-000000000001",
  attemptNumber: 1,
  bytes: STATIC_PNG,
  declaredContentType: "image/png",
  generation: "1",
  kind: "favicon" as const,
  leaseToken: "20000000-0000-4000-8000-000000000001",
  requestId: "30000000-0000-4000-8000-000000000001",
  signal: new AbortController().signal,
  ...overrides,
})

const createDependencies = (
  derivative: StaticImageDerivative = {
    bytes: STATIC_PNG,
    contentType: "image/png",
    height: 1,
    width: 1,
  }
) => {
  const createStaticDerivative = vi
    .fn<(request: ImageRasterizerRequest) => Promise<StaticImageDerivative>>()
    .mockResolvedValue(derivative)
  const reserve = vi
    .fn<(input: BookmarkAssetReservation) => Promise<string>>()
    .mockResolvedValue(
      "40000000-0000-4000-8000-000000000001/bookmark-assets/10000000-0000-4000-8000-000000000001.png"
    )
  const putImmutable = vi
    .fn<
      (request: PrivateAssetStorageRequest) => Promise<"matched" | "stored">
    >()
    .mockResolvedValue("stored")
  const markReady = vi
    .fn<(input: BookmarkAssetReadyInput) => Promise<boolean>>()
    .mockResolvedValue(true)
  return {
    dependencies: {
      rasterizer: { createStaticDerivative },
      registry: { markReady, reserve },
      storage: { putImmutable },
    },
    markReady,
    putImmutable,
    reserve,
    createStaticDerivative,
  }
}

const writeUint32BigEndian = (
  bytes: Uint8Array,
  offset: number,
  value: number
): void => {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

const createAnimatedWebp = (): Uint8Array => {
  const bytes = new Uint8Array(30)
  bytes.set(new TextEncoder().encode("RIFF"), 0)
  bytes[4] = 22
  bytes.set(new TextEncoder().encode("WEBPVP8X"), 8)
  bytes[16] = 10
  bytes[20] = 0x02
  return bytes
}

describe("bookmark asset processor", () => {
  it("validates, hashes, reserves, uploads, and marks a derivative ready", async () => {
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    const result = await processor.process(createInput())

    expect(result).toEqual({
      assetId: "10000000-0000-4000-8000-000000000001",
      byteSize: STATIC_PNG.byteLength,
      checksumHex:
        "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
      contentType: "image/png",
      height: 1,
      objectPath:
        "40000000-0000-4000-8000-000000000001/bookmark-assets/10000000-0000-4000-8000-000000000001.png",
      status: "ready",
      upload: "stored",
      width: 1,
    })
    expect(context.createStaticDerivative).toHaveBeenCalledOnce()
    expect(context.reserve).toHaveBeenCalledOnce()
    expect(context.putImmutable).toHaveBeenCalledOnce()
    expect(context.markReady).toHaveBeenCalledWith(
      expect.objectContaining({
        byteSize: STATIC_PNG.byteLength,
        height: 1,
        width: 1,
      })
    )
  })

  it("returns stale when the checked registry rejects readiness", async () => {
    const context = createDependencies()
    context.markReady.mockResolvedValue(false)
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(processor.process(createInput())).resolves.toEqual({
      status: "stale",
    })
  })

  it("rejects a declared type mismatch before decode", async () => {
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process(createInput({ declaredContentType: "image/jpeg" }))
    ).resolves.toEqual({ code: "content_type_mismatch", status: "rejected" })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("rejects GIF data without decoding a frame", async () => {
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process(
        createInput({
          bytes: new TextEncoder().encode("GIF89a"),
          declaredContentType: "image/gif",
        })
      )
    ).resolves.toEqual({ code: "animated_image", status: "rejected" })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("rejects APNG animation before decode", async () => {
    const endOffset = STATIC_PNG.lastIndexOf(0x49) - 4
    const animationChunk = Uint8Array.from([
      0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    const bytes = new Uint8Array(STATIC_PNG.length + animationChunk.length)
    bytes.set(STATIC_PNG.subarray(0, endOffset), 0)
    bytes.set(animationChunk, endOffset)
    bytes.set(STATIC_PNG.subarray(endOffset), endOffset + animationChunk.length)
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(processor.process(createInput({ bytes }))).resolves.toEqual({
      code: "animated_image",
      status: "rejected",
    })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("rejects animated WebP before decode", async () => {
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process(
        createInput({
          bytes: createAnimatedWebp(),
          declaredContentType: "image/webp",
        })
      )
    ).resolves.toEqual({ code: "animated_image", status: "rejected" })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("rejects decoded pixel counts above the exact cap", async () => {
    const bytes = STATIC_PNG.slice()
    writeUint32BigEndian(bytes, 16, 5_000)
    writeUint32BigEndian(bytes, 20, 5_000)
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(processor.process(createInput({ bytes }))).resolves.toEqual({
      code: "pixel_limit_exceeded",
      status: "rejected",
    })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("accepts the exact 20-megapixel limit", async () => {
    const bytes = STATIC_PNG.slice()
    writeUint32BigEndian(bytes, 16, 5_000)
    writeUint32BigEndian(bytes, 20, 4_000)
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(processor.process(createInput({ bytes }))).resolves.toEqual(
      expect.objectContaining({ status: "ready" })
    )
    expect(context.createStaticDerivative).toHaveBeenCalledOnce()
  })

  it("rejects a favicon source above 512 KiB", async () => {
    const bytes = new Uint8Array(512 * 1024 + 1)
    bytes.set(STATIC_PNG)
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(processor.process(createInput({ bytes }))).resolves.toEqual({
      code: "source_too_large",
      status: "rejected",
    })
  })

  it("accepts the exact favicon source and derivative byte caps", async () => {
    const sourceBytes = new Uint8Array(512 * 1024)
    sourceBytes.set(STATIC_PNG)
    const derivativeBytes = new Uint8Array(32 * 1024)
    derivativeBytes.set(STATIC_PNG)
    const context = createDependencies({
      bytes: derivativeBytes,
      contentType: "image/png",
      height: 1,
      width: 1,
    })
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process(createInput({ bytes: sourceBytes }))
    ).resolves.toEqual(
      expect.objectContaining({ byteSize: 32 * 1024, status: "ready" })
    )
  })

  it("rejects invalid image bytes", async () => {
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process(createInput({ bytes: Uint8Array.from([1, 2, 3]) }))
    ).resolves.toEqual({
      code: "unsupported_image_type",
      status: "rejected",
    })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })

  it("rejects a derivative above its byte or pixel bounds", async () => {
    const oversizedBytes = new Uint8Array(32 * 1024 + 1)
    oversizedBytes.set(STATIC_PNG)
    const bytesContext = createDependencies({
      bytes: oversizedBytes,
      contentType: "image/png",
      height: 1,
      width: 1,
    })
    await expect(
      createBookmarkAssetProcessor(bytesContext.dependencies).process(
        createInput()
      )
    ).resolves.toEqual({ code: "derivative_too_large", status: "rejected" })

    const dimensionsContext = createDependencies({
      bytes: STATIC_PNG,
      contentType: "image/png",
      height: 65,
      width: 65,
    })
    await expect(
      createBookmarkAssetProcessor(dimensionsContext.dependencies).process(
        createInput()
      )
    ).resolves.toEqual({ code: "derivative_invalid", status: "rejected" })
  })

  it("does no work after cancellation", async () => {
    const controller = new AbortController()
    controller.abort()
    const context = createDependencies()
    const processor = createBookmarkAssetProcessor(context.dependencies)

    await expect(
      processor.process({ ...createInput(), signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" })
    expect(context.createStaticDerivative).not.toHaveBeenCalled()
  })
})
