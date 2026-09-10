import { PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon/node"

import type {
  ImageRasterizer,
  ImageRasterizerRequest,
  StaticImageDerivative,
} from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"

const MAX_ENCODING_ATTEMPTS = 8
const OUTPUT_SHRINK_FACTOR = 0.82

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }
}

const fitWithin = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { height: number; width: number } => {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    height: Math.max(1, Math.floor(height * scale)),
    width: Math.max(1, Math.floor(width * scale)),
  }
}

const encodeAtSize = (
  source: PhotonImage,
  width: number,
  height: number
): Uint8Array => {
  if (source.get_width() === width && source.get_height() === height) {
    return source.get_bytes_webp()
  }
  const resized = resize(source, width, height, SamplingFilter.Lanczos3)
  try {
    return resized.get_bytes_webp()
  } finally {
    resized.free()
  }
}

const createDerivative = (
  request: ImageRasterizerRequest
): StaticImageDerivative => {
  requireActive(request.signal)
  const source = PhotonImage.new_from_byteslice(request.bytes)
  try {
    if (
      source.get_width() !== request.width ||
      source.get_height() !== request.height
    ) {
      throw new Error("The decoded image dimensions changed.")
    }

    let target = fitWithin(
      request.width,
      request.height,
      request.maxWidth,
      request.maxHeight
    )
    let lastDerivative: StaticImageDerivative | null = null
    for (let attempt = 0; attempt < MAX_ENCODING_ATTEMPTS; attempt += 1) {
      requireActive(request.signal)
      const bytes = encodeAtSize(source, target.width, target.height)
      lastDerivative = {
        bytes,
        contentType: "image/webp",
        height: target.height,
        width: target.width,
      }
      if (bytes.byteLength <= request.maxOutputBytes) {
        return lastDerivative
      }
      if (target.width === 1 && target.height === 1) break
      target = {
        height: Math.max(1, Math.floor(target.height * OUTPUT_SHRINK_FACTOR)),
        width: Math.max(1, Math.floor(target.width * OUTPUT_SHRINK_FACTOR)),
      }
    }
    if (lastDerivative === null) {
      throw new Error("The image could not be encoded.")
    }
    return lastDerivative
  } finally {
    source.free()
  }
}

export const createPhotonImageRasterizer = (): ImageRasterizer => ({
  createStaticDerivative: async (request) => createDerivative(request),
})
