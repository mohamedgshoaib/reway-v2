import { PhotonImage } from "@cf-wasm/photon/node"
import { describe, expect, it, vi } from "vitest"

import {
  createPhotonImageRasterizer,
  type PhotonImageRasterizerDependencies,
} from "./photon-image-rasterizer"

type PhotonLoader = NonNullable<PhotonImageRasterizerDependencies["loadPhoton"]>

const createImage = (
  width: number,
  height: number,
  contentType: "image/jpeg" | "image/png" | "image/webp" = "image/png"
): Uint8Array => {
  const pixels = new Uint8Array(width * height * 4)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = index % 251
    pixels[index + 1] = 120
    pixels[index + 2] = 220
    pixels[index + 3] = 255
  }
  const image = new PhotonImage(pixels, width, height)
  try {
    if (contentType === "image/jpeg") return image.get_bytes_jpeg(90)
    if (contentType === "image/webp") return image.get_bytes_webp()
    return image.get_bytes()
  } finally {
    image.free()
  }
}

describe("Photon image rasterizer", () => {
  it("does not load Photon until image work starts", async () => {
    const loadPhoton = vi.fn<PhotonLoader>(async () => {
      throw new Error("load requested")
    })
    const rasterizer = createPhotonImageRasterizer({
      loadPhoton,
    })

    expect(loadPhoton).not.toHaveBeenCalled()
    await expect(
      rasterizer.createStaticDerivative({
        bytes: new Uint8Array(),
        contentType: "image/png",
        height: 1,
        maxHeight: 64,
        maxOutputBytes: 32 * 1024,
        maxWidth: 64,
        signal: new AbortController().signal,
        width: 1,
      })
    ).rejects.toThrow("load requested")
    expect(loadPhoton).toHaveBeenCalledOnce()
  })

  it("creates a bounded static WebP derivative", async () => {
    const sourceBytes = createImage(128, 64)
    const rasterizer = createPhotonImageRasterizer()

    const result = await rasterizer.createStaticDerivative({
      bytes: sourceBytes,
      contentType: "image/png",
      height: 64,
      maxHeight: 64,
      maxOutputBytes: 32 * 1024,
      maxWidth: 64,
      signal: new AbortController().signal,
      width: 128,
    })

    expect(result.contentType).toBe("image/webp")
    expect(result.width).toBe(64)
    expect(result.height).toBe(32)
    expect(result.bytes.byteLength).toBeLessThanOrEqual(32 * 1024)
    expect(String.fromCharCode(...result.bytes.subarray(0, 4))).toBe("RIFF")
    expect(String.fromCharCode(...result.bytes.subarray(8, 12))).toBe("WEBP")
  })

  it.each(["image/jpeg", "image/webp"] as const)(
    "decodes %s source bytes",
    async (contentType) => {
      const sourceBytes = createImage(4, 3, contentType)

      const result = await createPhotonImageRasterizer().createStaticDerivative(
        {
          bytes: sourceBytes,
          contentType,
          height: 3,
          maxHeight: 64,
          maxOutputBytes: 32 * 1024,
          maxWidth: 64,
          signal: new AbortController().signal,
          width: 4,
        }
      )

      expect(result).toEqual(
        expect.objectContaining({
          contentType: "image/webp",
          height: 3,
          width: 4,
        })
      )
    }
  )

  it("drops source metadata by decoding and re-encoding pixels", async () => {
    const marker = new TextEncoder().encode("reway-private-source-marker")
    const sourceBytes = createImage(2, 2)
    const bytesWithTrailingMetadata = new Uint8Array(
      sourceBytes.byteLength + marker.byteLength
    )
    bytesWithTrailingMetadata.set(sourceBytes)
    bytesWithTrailingMetadata.set(marker, sourceBytes.byteLength)

    const result = await createPhotonImageRasterizer().createStaticDerivative({
      bytes: bytesWithTrailingMetadata,
      contentType: "image/png",
      height: 2,
      maxHeight: 64,
      maxOutputBytes: 32 * 1024,
      maxWidth: 64,
      signal: new AbortController().signal,
      width: 2,
    })

    expect(new TextDecoder().decode(result.bytes)).not.toContain(
      "reway-private-source-marker"
    )
  })

  it("rejects a decoded dimension mismatch", async () => {
    const rasterizer = createPhotonImageRasterizer()

    await expect(
      rasterizer.createStaticDerivative({
        bytes: createImage(2, 2),
        contentType: "image/png",
        height: 3,
        maxHeight: 64,
        maxOutputBytes: 32 * 1024,
        maxWidth: 64,
        signal: new AbortController().signal,
        width: 2,
      })
    ).rejects.toThrow("decoded image dimensions")
  })

  it("honors cancellation before decode", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      createPhotonImageRasterizer().createStaticDerivative({
        bytes: createImage(1, 1),
        contentType: "image/png",
        height: 1,
        maxHeight: 64,
        maxOutputBytes: 32 * 1024,
        maxWidth: 64,
        signal: controller.signal,
        width: 1,
      })
    ).rejects.toMatchObject({ name: "AbortError" })
  })
})
