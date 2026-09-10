import {
  getIpAddressKey,
  ipAddressesEqual,
  isPublicIpAddress,
  parseIpAddress,
  type IpAddressFamily,
  type ParsedIpAddress,
} from "./ip-address.ts"
import type { NormalizedHttpUrl } from "./url-policy.ts"

export interface DnsAddress {
  readonly address: string
  readonly family: IpAddressFamily
}

export interface DnsAdapter {
  resolve(hostname: string, signal: AbortSignal): Promise<readonly DnsAddress[]>
}

export interface NetworkConnection {
  readonly readable: ReadableStream<Uint8Array>
  readonly remoteAddress: string
  readonly writable: WritableStream<Uint8Array>
  close(): void
}

export interface PinnedConnectionRequest {
  readonly ipAddress: string
  readonly port: number
  readonly signal: AbortSignal
  readonly tlsServerName: string | null
}

export interface ConnectionAdapter {
  open(request: PinnedConnectionRequest): Promise<NetworkConnection>
}

export type SsrfPolicyErrorCode =
  | "aborted"
  | "connection_failed"
  | "dns_failed"
  | "dns_no_address"
  | "invalid_dns_result"
  | "peer_address_mismatch"
  | "unsafe_address"

export class SsrfPolicyError extends Error {
  readonly code: SsrfPolicyErrorCode
  readonly retrySafe: boolean

  constructor(code: SsrfPolicyErrorCode, retrySafe: boolean) {
    super("The remote destination did not pass the network safety policy.")
    this.name = "SsrfPolicyError"
    this.code = code
    this.retrySafe = retrySafe
  }
}

const PINNED_TARGET = Symbol("pinned-target")

export interface PinnedTarget {
  readonly [PINNED_TARGET]: true
  readonly addresses: readonly ParsedIpAddress[]
  readonly url: NormalizedHttpUrl
}

export interface SsrfPolicy {
  connect(target: PinnedTarget, signal: AbortSignal): Promise<NetworkConnection>
  resolve(url: NormalizedHttpUrl, signal: AbortSignal): Promise<PinnedTarget>
}

export interface SsrfPolicyDependencies {
  readonly connections: ConnectionAdapter
  readonly dns: DnsAdapter
}

const MAX_RESOLVED_ADDRESSES = 16

const abortedError = (): SsrfPolicyError => new SsrfPolicyError("aborted", true)

const requireActive = (signal: AbortSignal): void => {
  if (signal.aborted) throw abortedError()
}

const parseDnsAddress = (value: DnsAddress): ParsedIpAddress => {
  const parsed = parseIpAddress(value.address)
  if (parsed === null || parsed.family !== value.family) {
    throw new SsrfPolicyError("invalid_dns_result", false)
  }
  if (!isPublicIpAddress(parsed)) {
    throw new SsrfPolicyError("unsafe_address", false)
  }
  return parsed
}

const resolveAddresses = async (
  url: NormalizedHttpUrl,
  dns: DnsAdapter,
  signal: AbortSignal
): Promise<readonly ParsedIpAddress[]> => {
  const literalAddress = parseIpAddress(url.hostname)
  if (literalAddress !== null) {
    if (!isPublicIpAddress(literalAddress)) {
      throw new SsrfPolicyError("unsafe_address", false)
    }
    return [literalAddress]
  }

  let results: readonly DnsAddress[]
  try {
    results = await dns.resolve(url.hostname, signal)
  } catch {
    if (signal.aborted) throw abortedError()
    throw new SsrfPolicyError("dns_failed", true)
  }
  requireActive(signal)
  if (results.length === 0) {
    throw new SsrfPolicyError("dns_no_address", true)
  }
  if (results.length > MAX_RESOLVED_ADDRESSES) {
    throw new SsrfPolicyError("invalid_dns_result", false)
  }

  const addresses: ParsedIpAddress[] = []
  const seen = new Set<string>()
  for (const result of results) {
    const address = parseDnsAddress(result)
    const key = getIpAddressKey(address)
    if (!seen.has(key)) {
      addresses.push(address)
      seen.add(key)
    }
  }
  return addresses
}

const openPinnedConnection = async (
  target: PinnedTarget,
  connections: ConnectionAdapter,
  signal: AbortSignal
): Promise<NetworkConnection> => {
  let connectionFailed = false

  for (const address of target.addresses) {
    requireActive(signal)
    let connection: NetworkConnection
    try {
      connection = await connections.open({
        ipAddress: address.address,
        port: target.url.port,
        signal,
        tlsServerName:
          target.url.protocol === "https:" ? target.url.hostname : null,
      })
    } catch {
      if (signal.aborted) throw abortedError()
      connectionFailed = true
      continue
    }

    const remoteAddress = parseIpAddress(connection.remoteAddress)
    if (remoteAddress === null || !ipAddressesEqual(address, remoteAddress)) {
      connection.close()
      throw new SsrfPolicyError("peer_address_mismatch", false)
    }
    return connection
  }

  if (connectionFailed) {
    throw new SsrfPolicyError("connection_failed", true)
  }
  throw new SsrfPolicyError("dns_no_address", true)
}

export const createSsrfPolicy = (
  dependencies: SsrfPolicyDependencies
): SsrfPolicy => ({
  connect: (target, signal) =>
    openPinnedConnection(target, dependencies.connections, signal),
  resolve: async (url, signal) => {
    requireActive(signal)
    const addresses = await resolveAddresses(url, dependencies.dns, signal)
    return { [PINNED_TARGET]: true, addresses, url }
  },
})
