import type {
  ImageRasterizer,
  ImageRasterizerRequest,
  StaticImageDerivative,
} from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"

const MAX_ENCODING_ATTEMPTS = 8
const OUTPUT_SHRINK_FACTOR = 0.82
type PhotonModule = typeof import("@cf-wasm/photon/node")
type PhotonImage = ReturnType<PhotonModule["PhotonImage"]["new_from_byteslice"]>

export interface PhotonImageRasterizerDependencies {
  readonly loadPhoton?: () => Promise<PhotonModule>
}

const loadPhotonModule = (): Promise<PhotonModule> =>
  import("@cf-wasm/photon/node")

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
  photon: PhotonModule,
  source: PhotonImage,
  width: number,
  height: number
): Uint8Array => {
  if (source.get_width() === width && source.get_height() === height) {
    return source.get_bytes_webp()
  }
  const resized = photon.resize(
    source,
    width,
    height,
    photon.SamplingFilter.Lanczos3
  )
  try {
    return resized.get_bytes_webp()
  } finally {
    resized.free()
  }
}

const createDerivative = async (
  request: ImageRasterizerRequest,
  loadPhoton: () => Promise<PhotonModule>
): Promise<StaticImageDerivative> => {
  requireActive(request.signal)
  const photon = await loadPhoton()
  requireActive(request.signal)
  const source = photon.PhotonImage.new_from_byteslice(request.bytes)
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
      const bytes = encodeAtSize(photon, source, target.width, target.height)
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

export const createPhotonImageRasterizer = (
  dependencies: PhotonImageRasterizerDependencies = {}
): ImageRasterizer => {
  let photonPromise: Promise<PhotonModule> | undefined
  const loadPhoton = (): Promise<PhotonModule> => {
    photonPromise ??= (dependencies.loadPhoton ?? loadPhotonModule)()
    return photonPromise
  }

  return {
    createStaticDerivative: (request) => createDerivative(request, loadPhoton),
  }
}
