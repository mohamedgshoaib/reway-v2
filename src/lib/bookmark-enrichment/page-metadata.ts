import { Parser } from "htmlparser2"

import {
  MAX_BOOKMARK_URL_LENGTH,
  normalizeHttpUrl,
} from "../network-safety/url-policy.ts"

export const MAX_HTML_RESPONSE_BYTES = 2 * 1024 * 1024
export const MAX_METADATA_TITLE_LENGTH = 512

const MAX_METADATA_CANDIDATES = 16
const MAX_TITLE_SOURCE_LENGTH = 2_048
const META_CHARSET_SCAN_BYTES = 1_024
const HTML_CONTENT_TYPES = new Set(["application/xhtml+xml", "text/html"])
const CHARSET_ALIASES = new Map<string, string>([
  ["iso-8859-1", "windows-1252"],
  ["latin1", "windows-1252"],
  ["utf-16", "utf-16le"],
  ["utf-16be", "utf-16be"],
  ["utf-16le", "utf-16le"],
  ["utf-8", "utf-8"],
  ["utf8", "utf-8"],
  ["windows-1252", "windows-1252"],
] as const)

export type PageMetadataErrorCode =
  | "html_too_large"
  | "invalid_final_url"
  | "unsupported_charset"
  | "unsupported_content_type"

export class PageMetadataError extends Error {
  readonly code: PageMetadataErrorCode

  constructor(code: PageMetadataErrorCode) {
    super("The page metadata could not be parsed.")
    this.name = "PageMetadataError"
    this.code = code
  }
}

export interface PageMetadata {
  readonly faviconUrl: string | null
  readonly ogImageUrl: string | null
  readonly title: string | null
}

export interface ParsePageMetadataInput {
  readonly body: Uint8Array
  readonly contentType: string
  readonly finalUrl: string
}

interface MetadataCandidate {
  readonly order: number
  readonly value: string
}

interface FaviconCandidate extends MetadataCandidate {
  readonly priority: number
}

const readContentType = (value: string): string =>
  value.split(";", 1)[0].trim().toLowerCase()

const readHeaderCharset = (value: string): string | null =>
  /(?:^|;)\s*charset\s*=\s*["']?([^\s;"']+)/iu.exec(value)?.[1] ?? null

const readMetaCharset = (body: Uint8Array): string | null => {
  const prefix = new TextDecoder("windows-1252").decode(
    body.subarray(0, META_CHARSET_SCAN_BYTES)
  )
  return (
    /<meta\s[^>]*charset\s*=\s*["']?([^\s;"'/>]+)/iu.exec(prefix)?.[1] ??
    /<meta\s[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^\s;"']+)/iu.exec(
      prefix
    )?.[1] ??
    null
  )
}

const readBomCharset = (body: Uint8Array): string | null => {
  if (body[0] === 0xff && body[1] === 0xfe) return "utf-16le"
  if (body[0] === 0xfe && body[1] === 0xff) return "utf-16be"
  if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) {
    return "utf-8"
  }
  return null
}

const decodeHtml = (body: Uint8Array, contentType: string): string => {
  const requestedCharset =
    readBomCharset(body) ??
    readHeaderCharset(contentType) ??
    readMetaCharset(body) ??
    "utf-8"
  const charset = CHARSET_ALIASES.get(requestedCharset.trim().toLowerCase())
  if (charset === undefined) {
    throw new PageMetadataError("unsupported_charset")
  }
  return new TextDecoder(charset).decode(body)
}

const cleanTitle = (value: string): string | null => {
  const normalized = value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\s]+/gu, " ")
    .trim()
  if (normalized.length === 0) return null
  return Array.from(normalized).slice(0, MAX_METADATA_TITLE_LENGTH).join("")
}

const resolveMetadataUrl = (
  candidate: string,
  baseUrl: string
): string | null => {
  const trimmed = candidate.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_BOOKMARK_URL_LENGTH) {
    return null
  }

  let absoluteUrl: URL
  try {
    absoluteUrl = new URL(trimmed, baseUrl)
  } catch {
    return null
  }
  absoluteUrl.hash = ""
  const normalized = normalizeHttpUrl(absoluteUrl.href)
  return normalized.ok ? normalized.value.href : null
}

const getFaviconPriority = (rel: string): number | null => {
  const tokens = new Set(rel.toLowerCase().split(/\s+/u).filter(Boolean))
  if (tokens.has("icon")) return tokens.has("shortcut") ? 1 : 0
  if (tokens.has("apple-touch-icon")) return 2
  return null
}

const chooseResolvedUrl = (
  candidates: readonly MetadataCandidate[],
  baseUrl: string
): string | null => {
  for (const candidate of candidates) {
    const resolved = resolveMetadataUrl(candidate.value, baseUrl)
    if (resolved !== null) return resolved
  }
  return null
}

export const parsePageMetadata = (
  input: ParsePageMetadataInput
): PageMetadata => {
  if (input.body.byteLength > MAX_HTML_RESPONSE_BYTES) {
    throw new PageMetadataError("html_too_large")
  }
  if (!HTML_CONTENT_TYPES.has(readContentType(input.contentType))) {
    throw new PageMetadataError("unsupported_content_type")
  }

  const finalUrl = normalizeHttpUrl(input.finalUrl)
  if (!finalUrl.ok) throw new PageMetadataError("invalid_final_url")

  const html = decodeHtml(input.body, input.contentType)
  const faviconCandidates: FaviconCandidate[] = []
  const imageCandidates: MetadataCandidate[] = []
  let baseCandidate: string | null = null
  let documentTitle = ""
  let isReadingTitle = false
  let metadataOpen = true
  let ogTitle: string | null = null
  let order = 0

  const parser = new Parser(
    {
      onclosetag: (name) => {
        if (name === "head") metadataOpen = false
        if (name === "title") isReadingTitle = false
      },
      onopentag: (name, attributes) => {
        if (name === "body") metadataOpen = false
        if (!metadataOpen) return

        if (name === "title") {
          isReadingTitle = true
          return
        }
        if (name === "base" && baseCandidate === null) {
          const href = attributes.href?.trim()
          if (href && href.length <= MAX_BOOKMARK_URL_LENGTH) {
            baseCandidate = href
          }
          return
        }
        if (
          name === "link" &&
          faviconCandidates.length < MAX_METADATA_CANDIDATES
        ) {
          const href = attributes.href
          const rel = attributes.rel
          if (href === undefined || rel === undefined) return
          const priority = getFaviconPriority(rel)
          if (priority !== null) {
            faviconCandidates.push({ order, priority, value: href })
            order += 1
          }
          return
        }
        if (name !== "meta") return

        const property = (attributes.property ?? attributes.name)?.toLowerCase()
        const content = attributes.content
        if (content === undefined) return
        if (property === "og:title" && ogTitle === null) {
          ogTitle = cleanTitle(content)
          return
        }
        if (
          (property === "og:image" || property === "og:image:url") &&
          imageCandidates.length < MAX_METADATA_CANDIDATES
        ) {
          imageCandidates.push({ order, value: content })
          order += 1
        }
      },
      ontext: (text) => {
        if (!metadataOpen || !isReadingTitle) return
        const remaining = MAX_TITLE_SOURCE_LENGTH - documentTitle.length
        if (remaining > 0) documentTitle += text.slice(0, remaining)
      },
    },
    {
      decodeEntities: true,
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
      xmlMode: false,
    }
  )
  parser.end(html)

  const resolvedBase =
    baseCandidate === null
      ? finalUrl.value.href
      : (resolveMetadataUrl(baseCandidate, finalUrl.value.href) ??
        finalUrl.value.href)
  faviconCandidates.sort(
    (left, right) => left.priority - right.priority || left.order - right.order
  )

  return {
    faviconUrl: chooseResolvedUrl(faviconCandidates, resolvedBase),
    ogImageUrl: chooseResolvedUrl(imageCandidates, resolvedBase),
    title: ogTitle ?? cleanTitle(documentTitle),
  }
}
