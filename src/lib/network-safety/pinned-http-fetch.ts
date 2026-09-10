import { SsrfPolicyError, type SsrfPolicy } from "./ssrf-policy.ts"
import { normalizeHttpUrl } from "./url-policy.ts"

const MAX_BODY_BYTES = 5 * 1024 * 1024
const MAX_HEADER_BYTES = 32 * 1024
const MAX_WIRE_OVERHEAD_BYTES = 64 * 1024
const MAX_REDIRECTS = 3
const MAX_HEADER_COUNT = 100
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])
const HEADER_SEPARATOR = new Uint8Array([13, 10, 13, 10])
const CRLF = new Uint8Array([13, 10])

export type PinnedHttpFetchErrorCode =
  | "aborted"
  | "body_too_large"
  | "invalid_redirect"
  | "malformed_response"
  | "network_failed"
  | "redirect_limit"
  | "remote_rejected"
  | "timeout"
  | "unsupported_content_encoding"
  | "unsupported_content_type"

export class PinnedHttpFetchError extends Error {
  readonly code: PinnedHttpFetchErrorCode
  readonly retryAfterMs?: number
  readonly retrySafe: boolean

  constructor(
    code: PinnedHttpFetchErrorCode,
    retrySafe: boolean,
    retryAfterMs?: number
  ) {
    super("The remote resource could not be fetched.")
    this.name = "PinnedHttpFetchError"
    this.code = code
    this.retryAfterMs = retryAfterMs
    this.retrySafe = retrySafe
  }
}

export interface PinnedHttpFetchRequest {
  readonly acceptedContentTypes: ReadonlySet<string>
  readonly maxBodyBytes: number
  readonly signal: AbortSignal
  readonly url: string
}

export interface PinnedHttpFetchResult {
  readonly body: Uint8Array
  readonly contentType: string
  readonly finalUrl: string
}

export interface PinnedHttpFetcher {
  fetch(request: PinnedHttpFetchRequest): Promise<PinnedHttpFetchResult>
}

export interface PinnedHttpFetcherOptions {
  readonly requestTimeoutMs: number
  readonly ssrfPolicy: SsrfPolicy
}

interface ParsedHttpResponse {
  readonly body: Uint8Array
  readonly headers: ReadonlyMap<string, string>
  readonly status: number
}

const findSequence = (
  bytes: Uint8Array,
  sequence: Uint8Array,
  start = 0
): number => {
  const lastStart = bytes.byteLength - sequence.byteLength
  for (let index = start; index <= lastStart; index += 1) {
    let matched = true
    for (let offset = 0; offset < sequence.byteLength; offset += 1) {
      if (bytes[index + offset] !== sequence[offset]) {
        matched = false
        break
      }
    }
    if (matched) return index
  }
  return -1
}

const appendBytes = (
  chunks: readonly Uint8Array[],
  byteLength: number
): Uint8Array => {
  const result = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

const readWireResponse = async (
  readable: ReadableStream<Uint8Array>,
  maxBodyBytes: number
): Promise<Uint8Array> => {
  const maxWireBytes = maxBodyBytes + MAX_HEADER_BYTES + MAX_WIRE_OVERHEAD_BYTES
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    byteLength += value.byteLength
    if (byteLength > maxWireBytes) {
      await reader.cancel()
      throw new PinnedHttpFetchError("body_too_large", false)
    }
    chunks.push(value)
  }
  return appendBytes(chunks, byteLength)
}

const parseHeaders = (
  bytes: Uint8Array
): { bodyOffset: number; headers: Map<string, string>; status: number } => {
  const separatorOffset = findSequence(bytes, HEADER_SEPARATOR)
  if (separatorOffset < 0 || separatorOffset > MAX_HEADER_BYTES) {
    throw new PinnedHttpFetchError("malformed_response", false)
  }
  const headerText = new TextDecoder("windows-1252").decode(
    bytes.subarray(0, separatorOffset)
  )
  const lines = headerText.split("\r\n")
  const statusMatch = /^HTTP\/1\.[01] ([1-5][0-9]{2})(?: |$)/u.exec(
    lines[0] ?? ""
  )
  if (statusMatch === null || lines.length - 1 > MAX_HEADER_COUNT) {
    throw new PinnedHttpFetchError("malformed_response", false)
  }
  const headers = new Map<string, string>()
  for (const line of lines.slice(1)) {
    if (/^[ \t]/u.test(line)) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    const colon = line.indexOf(":")
    if (colon < 1) throw new PinnedHttpFetchError("malformed_response", false)
    const name = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/u.test(name)) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    const previous = headers.get(name)
    headers.set(name, previous === undefined ? value : `${previous}, ${value}`)
  }
  return {
    bodyOffset: separatorOffset + HEADER_SEPARATOR.byteLength,
    headers,
    status: Number(statusMatch[1]),
  }
}

const decodeChunkedBody = (
  body: Uint8Array,
  maxBodyBytes: number
): Uint8Array => {
  const chunks: Uint8Array[] = []
  let byteLength = 0
  let offset = 0
  while (true) {
    const lineEnd = findSequence(body, CRLF, offset)
    if (lineEnd < 0 || lineEnd - offset > 128) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    const sizeText = new TextDecoder().decode(body.subarray(offset, lineEnd))
    const rawSize = sizeText.split(";", 1)[0].trim()
    if (!/^[0-9a-f]+$/iu.test(rawSize)) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    const size = Number.parseInt(rawSize, 16)
    if (!Number.isSafeInteger(size)) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    offset = lineEnd + CRLF.byteLength
    if (size === 0) break
    if (
      size > maxBodyBytes - byteLength ||
      offset + size + 2 > body.byteLength
    ) {
      throw new PinnedHttpFetchError("body_too_large", false)
    }
    chunks.push(body.subarray(offset, offset + size))
    byteLength += size
    offset += size
    if (body[offset] !== 13 || body[offset + 1] !== 10) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    offset += CRLF.byteLength
  }
  return appendBytes(chunks, byteLength)
}

const readBody = (
  bytes: Uint8Array,
  bodyOffset: number,
  headers: ReadonlyMap<string, string>,
  maxBodyBytes: number
): Uint8Array => {
  const wireBody = bytes.subarray(bodyOffset)
  const transferEncoding = headers.get("transfer-encoding")?.toLowerCase()
  if (transferEncoding !== undefined) {
    if (transferEncoding !== "chunked" || headers.has("content-length")) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    return decodeChunkedBody(wireBody, maxBodyBytes)
  }
  const contentLength = headers.get("content-length")
  if (contentLength !== undefined) {
    if (!/^(0|[1-9][0-9]*)$/u.test(contentLength)) {
      throw new PinnedHttpFetchError("malformed_response", false)
    }
    const expectedLength = Number(contentLength)
    if (
      !Number.isSafeInteger(expectedLength) ||
      expectedLength > maxBodyBytes ||
      expectedLength !== wireBody.byteLength
    ) {
      throw new PinnedHttpFetchError(
        expectedLength > maxBodyBytes ? "body_too_large" : "malformed_response",
        false
      )
    }
  } else if (wireBody.byteLength > maxBodyBytes) {
    throw new PinnedHttpFetchError("body_too_large", false)
  }
  return wireBody
}

const parseHttpResponse = (
  bytes: Uint8Array,
  maxBodyBytes: number
): ParsedHttpResponse => {
  const parsed = parseHeaders(bytes)
  const contentEncoding = parsed.headers.get("content-encoding")?.toLowerCase()
  if (contentEncoding !== undefined && contentEncoding !== "identity") {
    throw new PinnedHttpFetchError("unsupported_content_encoding", false)
  }
  return {
    body: readBody(bytes, parsed.bodyOffset, parsed.headers, maxBodyBytes),
    headers: parsed.headers,
    status: parsed.status,
  }
}

const parseRetryAfterMs = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  if (/^(0|[1-9][0-9]*)$/u.test(value)) {
    const seconds = Number(value)
    return Number.isSafeInteger(seconds) ? seconds * 1000 : undefined
  }
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? Math.max(0, timestamp - Date.now())
    : undefined
}

const writeRequest = async (
  writable: WritableStream<Uint8Array>,
  url: URL
): Promise<void> => {
  const defaultPort = url.protocol === "https:" ? "443" : "80"
  const host =
    url.port === "" || url.port === defaultPort
      ? url.hostname
      : `${url.hostname}:${url.port}`
  const path = `${url.pathname || "/"}${url.search}`
  const request = [
    `GET ${path} HTTP/1.1`,
    `Host: ${host}`,
    "Accept: text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.1",
    "Accept-Encoding: identity",
    "Connection: close",
    "User-Agent: Reway-Enrichment/1.0",
    "",
    "",
  ].join("\r\n")
  const writer = writable.getWriter()
  try {
    await writer.write(new TextEncoder().encode(request))
  } finally {
    writer.releaseLock()
  }
}

const withTimeoutSignal = (
  source: AbortSignal,
  timeoutMs: number
): { clear: () => void; signal: AbortSignal } => {
  const controller = new AbortController()
  const onAbort = (): void => controller.abort(source.reason)
  source.addEventListener("abort", onAbort, { once: true })
  if (source.aborted) onAbort()
  const timeout = setTimeout(() => {
    controller.abort(
      new DOMException("The operation timed out.", "TimeoutError")
    )
  }, timeoutMs)
  return {
    clear: () => {
      clearTimeout(timeout)
      source.removeEventListener("abort", onAbort)
    },
    signal: controller.signal,
  }
}

const readContentType = (value: string): string =>
  value.split(";", 1)[0].trim().toLowerCase()

const fetchOnce = async (
  url: string,
  request: PinnedHttpFetchRequest,
  options: PinnedHttpFetcherOptions
): Promise<ParsedHttpResponse> => {
  const normalized = normalizeHttpUrl(url)
  if (!normalized.ok) {
    throw new PinnedHttpFetchError("invalid_redirect", false)
  }
  const timeout = withTimeoutSignal(request.signal, options.requestTimeoutMs)
  let connection: Awaited<ReturnType<SsrfPolicy["connect"]>> | null = null
  try {
    const target = await options.ssrfPolicy.resolve(
      normalized.value,
      timeout.signal
    )
    connection = await options.ssrfPolicy.connect(target, timeout.signal)
    await writeRequest(connection.writable, new URL(normalized.value.href))
    const wireResponse = await readWireResponse(
      connection.readable,
      request.maxBodyBytes
    )
    return parseHttpResponse(wireResponse, request.maxBodyBytes)
  } catch (error) {
    if (error instanceof PinnedHttpFetchError) throw error
    if (error instanceof SsrfPolicyError) {
      throw new PinnedHttpFetchError("network_failed", error.retrySafe)
    }
    if (request.signal.aborted) {
      throw new PinnedHttpFetchError("aborted", true)
    }
    if (timeout.signal.aborted) {
      throw new PinnedHttpFetchError("timeout", true)
    }
    throw new PinnedHttpFetchError("network_failed", true)
  } finally {
    connection?.close()
    timeout.clear()
  }
}

export const createPinnedHttpFetcher = (
  options: PinnedHttpFetcherOptions
): PinnedHttpFetcher => {
  if (
    !Number.isSafeInteger(options.requestTimeoutMs) ||
    options.requestTimeoutMs < 1
  ) {
    throw new Error("The pinned fetch timeout is invalid.")
  }

  return {
    fetch: async (request) => {
      if (
        !Number.isSafeInteger(request.maxBodyBytes) ||
        request.maxBodyBytes < 1 ||
        request.maxBodyBytes > MAX_BODY_BYTES ||
        request.acceptedContentTypes.size < 1
      ) {
        throw new Error("The pinned fetch limits are invalid.")
      }

      let currentUrl = request.url
      for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount += 1
      ) {
        const response = await fetchOnce(currentUrl, request, options)
        if (REDIRECT_STATUS_CODES.has(response.status)) {
          if (redirectCount === MAX_REDIRECTS) {
            throw new PinnedHttpFetchError("redirect_limit", false)
          }
          const location = response.headers.get("location")
          if (location === undefined) {
            throw new PinnedHttpFetchError("invalid_redirect", false)
          }
          let nextUrl: URL
          try {
            nextUrl = new URL(location, currentUrl)
          } catch {
            throw new PinnedHttpFetchError("invalid_redirect", false)
          }
          currentUrl = nextUrl.href
          continue
        }
        if (response.status < 200 || response.status >= 300) {
          throw new PinnedHttpFetchError(
            "remote_rejected",
            TRANSIENT_STATUS_CODES.has(response.status),
            response.status === 429
              ? parseRetryAfterMs(response.headers.get("retry-after"))
              : undefined
          )
        }
        const rawContentType = response.headers.get("content-type") ?? ""
        if (
          !request.acceptedContentTypes.has(readContentType(rawContentType))
        ) {
          throw new PinnedHttpFetchError("unsupported_content_type", false)
        }
        const finalUrl = normalizeHttpUrl(currentUrl)
        if (!finalUrl.ok) {
          throw new PinnedHttpFetchError("invalid_redirect", false)
        }
        return {
          body: response.body,
          contentType: rawContentType,
          finalUrl: finalUrl.value.href,
        }
      }
      throw new PinnedHttpFetchError("redirect_limit", false)
    },
  }
}
