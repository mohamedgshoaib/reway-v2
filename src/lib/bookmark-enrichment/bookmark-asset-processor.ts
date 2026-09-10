export const MAX_DECODED_IMAGE_PIXELS = 20_000_000

const IMAGE_LIMITS = {
  favicon: {
    maxHeight: 64,
    maxOutputBytes: 32 * 1024,
    maxSourceBytes: 512 * 1024,
    maxWidth: 64,
  },
  og_image: {
    maxHeight: 630,
    maxOutputBytes: 256 * 1024,
    maxSourceBytes: 5 * 1024 * 1024,
    maxWidth: 1_200,
  },
} as const

export type BookmarkAssetKind = keyof typeof IMAGE_LIMITS
export type StaticImageContentType = "image/jpeg" | "image/png" | "image/webp"

export type BookmarkAssetRejectionCode =
  | "animated_image"
  | "content_type_mismatch"
  | "decode_failed"
  | "derivative_invalid"
  | "derivative_too_large"
  | "invalid_image"
  | "pixel_limit_exceeded"
  | "source_too_large"
  | "unsupported_image_type"

export type BookmarkAssetProcessorErrorCode =
  | "asset_registry_failed"
  | "storage_conflict"
  | "storage_read_failed"
  | "storage_upload_failed"

export class BookmarkAssetProcessorError extends Error {
  readonly code: BookmarkAssetProcessorErrorCode
  readonly retrySafe: boolean

  constructor(code: BookmarkAssetProcessorErrorCode, retrySafe: boolean) {
    super("The bookmark asset could not be stored.")
    this.name = "BookmarkAssetProcessorError"
    this.code = code
    this.retrySafe = retrySafe
  }
}

export interface InspectedStaticImage {
  readonly contentType: StaticImageContentType
  readonly height: number
  readonly width: number
}

export interface StaticImageDerivative extends InspectedStaticImage {
  readonly bytes: Uint8Array
}

export interface ImageRasterizerRequest extends InspectedStaticImage {
  readonly bytes: Uint8Array
  readonly maxHeight: number
  readonly maxOutputBytes: number
  readonly maxWidth: number
  readonly signal: AbortSignal
}

export interface ImageRasterizer {
  createStaticDerivative(
    request: ImageRasterizerRequest
  ): Promise<StaticImageDerivative>
}

export interface PrivateAssetStorageRequest {
  readonly bytes: Uint8Array
  readonly contentType: StaticImageContentType
  readonly objectPath: string
  readonly signal: AbortSignal
}

export interface PrivateAssetStorage {
  putImmutable(
    request: PrivateAssetStorageRequest
  ): Promise<"matched" | "stored">
}

export interface BookmarkAssetReservation {
  readonly assetId: string
  readonly attemptNumber: number
  readonly contentType: StaticImageContentType
  readonly generation: string
  readonly kind: BookmarkAssetKind
  readonly leaseToken: string
  readonly requestId: string
}

export interface BookmarkAssetReadyInput {
  readonly assetId: string
  readonly byteSize: number
  readonly checksumHex: string
  readonly generation: string
  readonly height: number
  readonly leaseToken: string
  readonly requestId: string
  readonly width: number
}

export interface BookmarkAssetRegistry {
  markReady(input: BookmarkAssetReadyInput): Promise<boolean>
  reserve(input: BookmarkAssetReservation): Promise<string>
}

export interface ProcessBookmarkAssetInput {
  readonly assetId: string
  readonly attemptNumber: number
  readonly bytes: Uint8Array
  readonly declaredContentType: string
  readonly generation: string
  readonly kind: BookmarkAssetKind
  readonly leaseToken: string
  readonly requestId: string
  readonly signal: AbortSignal
}

export type ProcessBookmarkAssetResult =
  | {
      readonly code: BookmarkAssetRejectionCode
      readonly status: "rejected"
    }
  | {
      readonly assetId: string
      readonly byteSize: number
      readonly checksumHex: string
      readonly contentType: StaticImageContentType
      readonly height: number
      readonly objectPath: string
      readonly status: "ready"
      readonly upload: "matched" | "stored"
      readonly width: number
    }
  | { readonly status: "stale" }

export interface BookmarkAssetProcessor {
  process(input: ProcessBookmarkAssetInput): Promise<ProcessBookmarkAssetResult>
}

interface ImageInspectionFailure {
  readonly code: BookmarkAssetRejectionCode
  readonly ok: false
}

interface ImageInspectionSuccess {
  readonly image: InspectedStaticImage
  readonly ok: true
}

type ImageInspectionResult = ImageInspectionFailure | ImageInspectionSuccess

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

const matchesBytes = (
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[]
): boolean => expected.every((value, index) => bytes[offset + index] === value)

const readUint16BigEndian = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] * 256 + bytes[offset + 1]

const readUint16LittleEndian = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] + bytes[offset + 1] * 256

const readUint24LittleEndian = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65_536

const readUint32BigEndian = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] * 16_777_216 +
  bytes[offset + 1] * 65_536 +
  bytes[offset + 2] * 256 +
  bytes[offset + 3]

const readUint32LittleEndian = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] +
  bytes[offset + 1] * 256 +
  bytes[offset + 2] * 65_536 +
  bytes[offset + 3] * 16_777_216

const readAscii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length))

const inspectPng = (bytes: Uint8Array): ImageInspectionResult => {
  if (
    bytes.length < 33 ||
    !matchesBytes(bytes, 0, PNG_SIGNATURE) ||
    readUint32BigEndian(bytes, 8) !== 13 ||
    readAscii(bytes, 12, 4) !== "IHDR"
  ) {
    return { code: "invalid_image", ok: false }
  }
  const width = readUint32BigEndian(bytes, 16)
  const height = readUint32BigEndian(bytes, 20)
  let offset = 8
  let foundEnd = false
  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32BigEndian(bytes, offset)
    if (dataLength > bytes.length - offset - 12) {
      return { code: "invalid_image", ok: false }
    }
    const chunkType = readAscii(bytes, offset + 4, 4)
    if (chunkType === "acTL") return { code: "animated_image", ok: false }
    offset += dataLength + 12
    if (chunkType === "IEND") {
      foundEnd = true
      break
    }
  }
  if (!foundEnd || width === 0 || height === 0) {
    return { code: "invalid_image", ok: false }
  }
  return { image: { contentType: "image/png", height, width }, ok: true }
}

const inspectJpeg = (bytes: Uint8Array): ImageInspectionResult => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { code: "invalid_image", ok: false }
  }
  let offset = 2
  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    if (offset >= bytes.length) break
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.length) break
    const segmentLength = readUint16BigEndian(bytes, offset)
    if (segmentLength < 2 || segmentLength > bytes.length - offset) break
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) break
      const height = readUint16BigEndian(bytes, offset + 3)
      const width = readUint16BigEndian(bytes, offset + 5)
      if (width === 0 || height === 0) break
      return { image: { contentType: "image/jpeg", height, width }, ok: true }
    }
    offset += segmentLength
  }
  return { code: "invalid_image", ok: false }
}

const inspectWebp = (bytes: Uint8Array): ImageInspectionResult => {
  if (
    bytes.length < 20 ||
    readAscii(bytes, 0, 4) !== "RIFF" ||
    readAscii(bytes, 8, 4) !== "WEBP"
  ) {
    return { code: "invalid_image", ok: false }
  }
  const declaredLength = readUint32LittleEndian(bytes, 4) + 8
  if (declaredLength > bytes.length || declaredLength < 20) {
    return { code: "invalid_image", ok: false }
  }

  let dimensions: { height: number; width: number } | null = null
  let offset = 12
  while (offset + 8 <= declaredLength) {
    const chunkType = readAscii(bytes, offset, 4)
    const chunkLength = readUint32LittleEndian(bytes, offset + 4)
    const dataOffset = offset + 8
    if (chunkLength > declaredLength - dataOffset) {
      return { code: "invalid_image", ok: false }
    }
    if (chunkType === "ANIM" || chunkType === "ANMF") {
      return { code: "animated_image", ok: false }
    }
    if (chunkType === "VP8X") {
      if (chunkLength < 10) return { code: "invalid_image", ok: false }
      if ((bytes[dataOffset] & 0x02) !== 0) {
        return { code: "animated_image", ok: false }
      }
      dimensions = {
        height: readUint24LittleEndian(bytes, dataOffset + 7) + 1,
        width: readUint24LittleEndian(bytes, dataOffset + 4) + 1,
      }
    } else if (chunkType === "VP8 " && dimensions === null) {
      if (
        chunkLength < 10 ||
        !matchesBytes(bytes, dataOffset + 3, [0x9d, 0x01, 0x2a])
      ) {
        return { code: "invalid_image", ok: false }
      }
      dimensions = {
        height: readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff,
        width: readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff,
      }
    } else if (chunkType === "VP8L" && dimensions === null) {
      if (chunkLength < 5 || bytes[dataOffset] !== 0x2f) {
        return { code: "invalid_image", ok: false }
      }
      dimensions = {
        height:
          1 +
          (bytes[dataOffset + 2] >> 6) +
          bytes[dataOffset + 3] * 4 +
          (bytes[dataOffset + 4] & 0x0f) * 1_024,
        width: 1 + bytes[dataOffset + 1] + (bytes[dataOffset + 2] & 0x3f) * 256,
      }
    }
    offset = dataOffset + chunkLength + (chunkLength % 2)
  }

  if (
    dimensions === null ||
    dimensions.width === 0 ||
    dimensions.height === 0
  ) {
    return { code: "invalid_image", ok: false }
  }
  return {
    image: { contentType: "image/webp", ...dimensions },
    ok: true,
  }
}

const getDeclaredImageType = (
  declaredContentType: string
): StaticImageContentType | null => {
  const contentType = declaredContentType.split(";", 1)[0].trim().toLowerCase()
  return contentType === "image/jpeg" ||
    contentType === "image/png" ||
    contentType === "image/webp"
    ? contentType
    : null
}

const inspectImageBytes = (bytes: Uint8Array): ImageInspectionResult => {
  if (matchesBytes(bytes, 0, PNG_SIGNATURE)) return inspectPng(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes)
  if (readAscii(bytes, 0, 4) === "RIFF") return inspectWebp(bytes)
  if (readAscii(bytes, 0, 3) === "GIF") {
    return { code: "animated_image", ok: false }
  }
  return { code: "unsupported_image_type", ok: false }
}

const inspectSourceImage = (
  kind: BookmarkAssetKind,
  bytes: Uint8Array,
  declaredContentType: string
): ImageInspectionResult => {
  const limits = IMAGE_LIMITS[kind]
  if (bytes.byteLength > limits.maxSourceBytes) {
    return { code: "source_too_large", ok: false }
  }
  const inspected = inspectImageBytes(bytes)
  if (!inspected.ok) return inspected
  const declaredType = getDeclaredImageType(declaredContentType)
  if (declaredType === null) {
    return { code: "unsupported_image_type", ok: false }
  }
  if (inspected.image.contentType !== declaredType) {
    return { code: "content_type_mismatch", ok: false }
  }
  if (
    inspected.image.width >
    Math.floor(MAX_DECODED_IMAGE_PIXELS / inspected.image.height)
  ) {
    return { code: "pixel_limit_exceeded", ok: false }
  }
  return inspected
}

const inspectDerivative = (
  kind: BookmarkAssetKind,
  derivative: StaticImageDerivative
): BookmarkAssetRejectionCode | null => {
  const limits = IMAGE_LIMITS[kind]
  if (derivative.bytes.byteLength > limits.maxOutputBytes) {
    return "derivative_too_large"
  }
  if (
    derivative.width < 1 ||
    derivative.height < 1 ||
    derivative.width > limits.maxWidth ||
    derivative.height > limits.maxHeight
  ) {
    return "derivative_invalid"
  }
  const inspected = inspectImageBytes(derivative.bytes)
  if (
    !inspected.ok ||
    inspected.image.contentType !== derivative.contentType ||
    inspected.image.width !== derivative.width ||
    inspected.image.height !== derivative.height
  ) {
    return "derivative_invalid"
  }
  return null
}

const digestSha256 = async (bytes: Uint8Array): Promise<string> => {
  const input = new Uint8Array(bytes)
  const digest = await crypto.subtle.digest("SHA-256", input)
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("")
}

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }
}

export interface BookmarkAssetProcessorDependencies {
  readonly rasterizer: ImageRasterizer
  readonly registry: BookmarkAssetRegistry
  readonly storage: PrivateAssetStorage
}

export const createBookmarkAssetProcessor = (
  dependencies: BookmarkAssetProcessorDependencies
): BookmarkAssetProcessor => ({
  process: async (input) => {
    requireActive(input.signal)
    const inspected = inspectSourceImage(
      input.kind,
      input.bytes,
      input.declaredContentType
    )
    if (!inspected.ok) return { code: inspected.code, status: "rejected" }

    const limits = IMAGE_LIMITS[input.kind]
    let derivative: StaticImageDerivative
    try {
      derivative = await dependencies.rasterizer.createStaticDerivative({
        ...inspected.image,
        bytes: input.bytes,
        maxHeight: limits.maxHeight,
        maxOutputBytes: limits.maxOutputBytes,
        maxWidth: limits.maxWidth,
        signal: input.signal,
      })
    } catch (error) {
      if (input.signal.aborted) throw error
      return { code: "decode_failed", status: "rejected" }
    }
    requireActive(input.signal)

    const derivativeRejection = inspectDerivative(input.kind, derivative)
    if (derivativeRejection !== null) {
      return { code: derivativeRejection, status: "rejected" }
    }
    const checksumHex = await digestSha256(derivative.bytes)
    requireActive(input.signal)

    let objectPath: string
    try {
      objectPath = await dependencies.registry.reserve({
        assetId: input.assetId,
        attemptNumber: input.attemptNumber,
        contentType: derivative.contentType,
        generation: input.generation,
        kind: input.kind,
        leaseToken: input.leaseToken,
        requestId: input.requestId,
      })
    } catch (error) {
      if (error instanceof BookmarkAssetProcessorError) throw error
      throw new BookmarkAssetProcessorError("asset_registry_failed", true)
    }
    requireActive(input.signal)

    const upload = await dependencies.storage.putImmutable({
      bytes: derivative.bytes,
      contentType: derivative.contentType,
      objectPath,
      signal: input.signal,
    })
    requireActive(input.signal)

    let markedReady: boolean
    try {
      markedReady = await dependencies.registry.markReady({
        assetId: input.assetId,
        byteSize: derivative.bytes.byteLength,
        checksumHex,
        generation: input.generation,
        height: derivative.height,
        leaseToken: input.leaseToken,
        requestId: input.requestId,
        width: derivative.width,
      })
    } catch (error) {
      if (error instanceof BookmarkAssetProcessorError) throw error
      throw new BookmarkAssetProcessorError("asset_registry_failed", true)
    }
    if (!markedReady) return { status: "stale" }

    return {
      assetId: input.assetId,
      byteSize: derivative.bytes.byteLength,
      checksumHex,
      contentType: derivative.contentType,
      height: derivative.height,
      objectPath,
      status: "ready",
      upload,
      width: derivative.width,
    }
  },
})
