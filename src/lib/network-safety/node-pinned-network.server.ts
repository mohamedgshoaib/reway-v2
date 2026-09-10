import * as dns from "node:dns/promises"
import { connect as connectTcp } from "node:net"
import { Duplex, Readable, Writable } from "node:stream"
import { connect as connectTls } from "node:tls"

import type {
  ConnectionAdapter,
  DnsAdapter,
  NetworkConnection,
  PinnedConnectionRequest,
} from "./ssrf-policy"

interface NodeDnsResolver {
  resolve4(hostname: string): Promise<string[]>
  resolve6(hostname: string): Promise<string[]>
}

interface NodeSocketConnection extends Duplex {
  readonly remoteAddress?: string
}

interface NodeSocketDialer {
  openTcp(request: PinnedConnectionRequest): Promise<NodeSocketConnection>
  openTls(request: PinnedConnectionRequest): Promise<NodeSocketConnection>
}

const abortError = (): DOMException =>
  new DOMException("The operation was aborted.", "AbortError")

const raceAbort = <Value>(
  operation: Promise<Value>,
  signal: AbortSignal
): Promise<Value> => {
  if (signal.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    const onAbort = (): void => reject(abortError())
    signal.addEventListener("abort", onAbort, { once: true })
    void operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort)
        reject(error)
      }
    )
  })
}

const waitForSocket = (
  socket: NodeSocketConnection,
  readyEvent: "connect" | "secureConnect",
  signal: AbortSignal
): Promise<NodeSocketConnection> => {
  if (signal.aborted) {
    socket.destroy()
    return Promise.reject(abortError())
  }

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      socket.removeListener(readyEvent, onReady)
      socket.removeListener("error", onError)
      signal.removeEventListener("abort", onAbort)
    }
    const onReady = (): void => {
      cleanup()
      resolve(socket)
    }
    const onError = (error: Error): void => {
      cleanup()
      reject(error)
    }
    const onAbort = (): void => {
      cleanup()
      socket.destroy()
      reject(abortError())
    }

    socket.once(readyEvent, onReady)
    socket.once("error", onError)
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

const defaultDialer: NodeSocketDialer = {
  openTcp: (request) =>
    waitForSocket(
      connectTcp({ host: request.ipAddress, port: request.port }),
      "connect",
      request.signal
    ),
  openTls: (request) => {
    if (request.tlsServerName === null) {
      throw new Error("The TLS server name is missing.")
    }
    return waitForSocket(
      connectTls({
        ALPNProtocols: ["http/1.1"],
        host: request.ipAddress,
        port: request.port,
        rejectUnauthorized: true,
        servername: request.tlsServerName,
      }),
      "secureConnect",
      request.signal
    )
  },
}

const wrapSocket = (
  socket: NodeSocketConnection,
  signal: AbortSignal
): NetworkConnection => {
  let closed = false
  const close = (): void => {
    signal.removeEventListener("abort", close)
    if (!closed) socket.destroy()
    closed = true
  }
  signal.addEventListener("abort", close, { once: true })

  return {
    close,
    readable: Readable.toWeb(socket) as ReadableStream<Uint8Array>,
    remoteAddress: socket.remoteAddress ?? "",
    writable: Writable.toWeb(socket) as WritableStream<Uint8Array>,
  }
}

export const createNodeDnsAdapter = (
  resolver: NodeDnsResolver = dns
): DnsAdapter => ({
  resolve: async (hostname, signal) => {
    const results = await Promise.allSettled([
      raceAbort(resolver.resolve4(hostname), signal),
      raceAbort(resolver.resolve6(hostname), signal),
    ])
    if (signal.aborted) throw abortError()

    const addresses = []
    const [ipv4Result, ipv6Result] = results
    if (ipv4Result.status === "fulfilled") {
      for (const address of ipv4Result.value) {
        addresses.push({ address, family: "ipv4" as const })
      }
    }
    if (ipv6Result.status === "fulfilled") {
      for (const address of ipv6Result.value) {
        addresses.push({ address, family: "ipv6" as const })
      }
    }
    if (
      addresses.length === 0 &&
      results.every((result) => result.status === "rejected")
    ) {
      throw new Error("DNS resolution failed.")
    }
    return addresses
  },
})

export const createNodePinnedConnectionAdapter = (
  dialer: NodeSocketDialer = defaultDialer
): ConnectionAdapter => ({
  open: async (request) => {
    const socket = await (request.tlsServerName === null
      ? dialer.openTcp(request)
      : dialer.openTls(request))
    if (request.signal.aborted) {
      socket.destroy()
      throw abortError()
    }
    return wrapSocket(socket, request.signal)
  },
})
