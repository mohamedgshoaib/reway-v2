import { isPublicIpAddress, parseIpAddress } from "./ip-address.ts"

export const MAX_BOOKMARK_URL_LENGTH = 8_192

export type HttpProtocol = "http:" | "https:"

export interface NormalizedHttpUrl {
  readonly href: string
  readonly hostname: string
  readonly port: 80 | 443
  readonly protocol: HttpProtocol
}

export type UrlPolicyRejection =
  | "credentials"
  | "disallowed_port"
  | "invalid_host"
  | "invalid_url"
  | "too_long"
  | "unsafe_host"
  | "unsupported_protocol"

export type NormalizeHttpUrlResult =
  | { readonly ok: true; readonly value: NormalizedHttpUrl }
  | { readonly ok: false; readonly reason: UrlPolicyRejection }

const INVALID_TEXT = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u
const EXPLICIT_SCHEME = /^([A-Za-z][A-Za-z\d+.-]*):(.*)$/su
const DOMAIN_LABEL = /^(?!-)[A-Za-z\d-]{1,63}(?<!-)$/u
const BLOCKED_HOST_NAMES = new Set([
  "home",
  "internal",
  "lan",
  "local",
  "localhost",
])
const BLOCKED_HOST_SUFFIXES = [
  ".home",
  ".internal",
  ".lan",
  ".local",
  ".localhost",
]

const rejection = (reason: UrlPolicyRejection): NormalizeHttpUrlResult => ({
  ok: false,
  reason,
})

const hasClearSchemeLessPort = (schemeLike: string, rest: string): boolean =>
  schemeLike.includes(".") && /^\d+(?:[/?#]|$)/u.test(rest)

const addDefaultScheme = (value: string): string | null => {
  const schemeMatch = EXPLICIT_SCHEME.exec(value)
  if (schemeMatch === null) return `https://${value}`

  const scheme = schemeMatch[1].toLowerCase()
  if (scheme === "http" || scheme === "https") return value
  if (hasClearSchemeLessPort(schemeMatch[1], schemeMatch[2])) {
    return `https://${value}`
  }
  return null
}

const normalizeDomainName = (hostname: string): string | null => {
  const withoutFinalDot = hostname.endsWith(".")
    ? hostname.slice(0, -1)
    : hostname
  if (withoutFinalDot.length === 0 || withoutFinalDot.length > 253) return null

  const labels = withoutFinalDot.split(".")
  if (
    labels.length < 2 ||
    labels.some((label) => !DOMAIN_LABEL.test(label)) ||
    /^\d+$/u.test(labels.at(-1) ?? "")
  ) {
    return null
  }
  return withoutFinalDot.toLowerCase()
}

const isBlockedHostName = (hostname: string): boolean =>
  BLOCKED_HOST_NAMES.has(hostname) ||
  BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))

const getInputHostname = (value: string): string => {
  const authority = /^https?:\/\/([^/?#]*)/iu.exec(value)?.[1] ?? ""
  const withoutCredentials = authority.slice(authority.lastIndexOf("@") + 1)
  if (withoutCredentials.startsWith("[")) {
    return withoutCredentials.slice(1, withoutCredentials.indexOf("]"))
  }
  return withoutCredentials.split(":", 1)[0]
}

export const normalizeHttpUrl = (input: string): NormalizeHttpUrlResult => {
  const trimmed = input.trim()
  if (trimmed.length === 0 || INVALID_TEXT.test(trimmed)) {
    return rejection("invalid_url")
  }

  const withScheme = addDefaultScheme(trimmed)
  if (withScheme === null) return rejection("unsupported_protocol")

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return rejection("invalid_url")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return rejection("unsupported_protocol")
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return rejection("credentials")
  }
  if (parsed.port.length > 0) return rejection("disallowed_port")

  const protocol = parsed.protocol as HttpProtocol
  const bracketedIpv6 =
    parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]")
  const hostText = bracketedIpv6
    ? parsed.hostname.slice(1, -1)
    : parsed.hostname
  const ipAddress = parseIpAddress(hostText)
  let hostname: string

  if (ipAddress !== null) {
    if (!isPublicIpAddress(ipAddress)) return rejection("unsafe_host")
    if (
      ipAddress.family === "ipv4" &&
      parseIpAddress(getInputHostname(withScheme)) === null
    ) {
      return rejection("invalid_host")
    }
    hostname = ipAddress.address
  } else {
    const lowercaseHostname = parsed.hostname.toLowerCase()
    if (isBlockedHostName(lowercaseHostname)) return rejection("unsafe_host")
    const domainName = normalizeDomainName(lowercaseHostname)
    if (domainName === null) return rejection("invalid_host")
    hostname = domainName
    parsed.hostname = domainName
  }

  const href = parsed.href
  if (href.length > MAX_BOOKMARK_URL_LENGTH) return rejection("too_long")

  return {
    ok: true,
    value: {
      href,
      hostname,
      port: protocol === "https:" ? 443 : 80,
      protocol,
    },
  }
}
