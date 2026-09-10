export type IpAddressFamily = "ipv4" | "ipv6"

export interface ParsedIpAddress {
  readonly address: string
  readonly bytes: readonly number[]
  readonly family: IpAddressFamily
}

interface IpRange {
  readonly bytes: readonly number[]
  readonly prefixLength: number
}

const parseIpv4 = (value: string): ParsedIpAddress | null => {
  const parts = value.split(".")
  if (parts.length !== 4) return null

  const bytes: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) return null
    const byte = Number(part)
    if (byte > 255 || `${byte}` !== part) return null
    bytes.push(byte)
  }

  return { address: bytes.join("."), bytes, family: "ipv4" }
}

const parseIpv6Part = (part: string): number | null => {
  if (!/^[\dA-Fa-f]{1,4}$/u.test(part)) return null
  return Number.parseInt(part, 16)
}

const parseIpv6 = (value: string): ParsedIpAddress | null => {
  const unwrapped =
    value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value
  if (unwrapped.includes("%") || !unwrapped.includes(":")) return null

  let normalized = unwrapped
  const lastColon = normalized.lastIndexOf(":")
  const possibleIpv4 = normalized.slice(lastColon + 1)
  if (possibleIpv4.includes(".")) {
    const ipv4 = parseIpv4(possibleIpv4)
    if (ipv4 === null) return null
    const high = (ipv4.bytes[0] << 8) | ipv4.bytes[1]
    const low = (ipv4.bytes[2] << 8) | ipv4.bytes[3]
    normalized = `${normalized.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`
  }

  if ((normalized.match(/::/gu) ?? []).length > 1) return null
  const hasCompression = normalized.includes("::")
  const [leftText, rightText = ""] = normalized.split("::")
  const left = leftText.length === 0 ? [] : leftText.split(":")
  const right = rightText.length === 0 ? [] : rightText.split(":")
  if (
    left.some((part) => part.length === 0) ||
    right.some((part) => part.length === 0)
  ) {
    return null
  }

  const explicitPartCount = left.length + right.length
  if (
    (hasCompression && explicitPartCount >= 8) ||
    (!hasCompression && explicitPartCount !== 8)
  ) {
    return null
  }

  const parts = [
    ...left,
    ...Array<string>(hasCompression ? 8 - explicitPartCount : 0).fill("0"),
    ...right,
  ]
  const words: number[] = []
  for (const part of parts) {
    const word = parseIpv6Part(part)
    if (word === null) return null
    words.push(word)
  }

  const bytes: number[] = []
  for (const word of words) {
    bytes.push(word >> 8, word & 0xff)
  }
  return { address: unwrapped.toLowerCase(), bytes, family: "ipv6" }
}

export const parseIpAddress = (value: string): ParsedIpAddress | null =>
  parseIpv4(value) ?? parseIpv6(value)

const parseRange = (value: string, prefixLength: number): IpRange => {
  const parsed = parseIpAddress(value)
  if (parsed === null) throw new TypeError("The IP range is invalid.")
  return { bytes: parsed.bytes, prefixLength }
}

const BLOCKED_IPV4_RANGES: readonly IpRange[] = [
  parseRange("0.0.0.0", 8),
  parseRange("10.0.0.0", 8),
  parseRange("100.64.0.0", 10),
  parseRange("127.0.0.0", 8),
  parseRange("169.254.0.0", 16),
  parseRange("172.16.0.0", 12),
  parseRange("192.0.0.0", 24),
  parseRange("192.0.2.0", 24),
  parseRange("192.88.99.0", 24),
  parseRange("192.168.0.0", 16),
  parseRange("198.18.0.0", 15),
  parseRange("198.51.100.0", 24),
  parseRange("203.0.113.0", 24),
  parseRange("224.0.0.0", 4),
  parseRange("240.0.0.0", 4),
]

const BLOCKED_IPV6_RANGES: readonly IpRange[] = [
  parseRange("2001::", 23),
  parseRange("2001:db8::", 32),
  parseRange("2002::", 16),
  parseRange("3fff::", 20),
]

const IPV6_GLOBAL_UNICAST_RANGE = parseRange("2000::", 3)

const matchesRange = (address: ParsedIpAddress, range: IpRange): boolean => {
  if (address.bytes.length !== range.bytes.length) return false

  const fullBytes = Math.floor(range.prefixLength / 8)
  for (let index = 0; index < fullBytes; index += 1) {
    if (address.bytes[index] !== range.bytes[index]) return false
  }

  const remainingBits = range.prefixLength % 8
  if (remainingBits === 0) return true
  const mask = (0xff << (8 - remainingBits)) & 0xff
  return (address.bytes[fullBytes] & mask) === (range.bytes[fullBytes] & mask)
}

export const isPublicIpAddress = (address: ParsedIpAddress): boolean => {
  if (
    address.family === "ipv6" &&
    !matchesRange(address, IPV6_GLOBAL_UNICAST_RANGE)
  ) {
    return false
  }
  const blockedRanges =
    address.family === "ipv4" ? BLOCKED_IPV4_RANGES : BLOCKED_IPV6_RANGES
  return !blockedRanges.some((range) => matchesRange(address, range))
}

export const ipAddressesEqual = (
  left: ParsedIpAddress,
  right: ParsedIpAddress
): boolean =>
  left.family === right.family &&
  left.bytes.every((byte, index) => byte === right.bytes[index])

export const getIpAddressKey = (address: ParsedIpAddress): string =>
  `${address.family}:${address.bytes.join(".")}`
