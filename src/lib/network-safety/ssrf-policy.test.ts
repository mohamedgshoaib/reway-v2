import { describe, expect, it } from "vitest"

import {
  createSsrfPolicy,
  SsrfPolicyError,
  type ConnectionAdapter,
  type DnsAdapter,
  type NetworkConnection,
  type PinnedConnectionRequest,
} from "@/lib/network-safety/ssrf-policy"
import { normalizeHttpUrl } from "@/lib/network-safety/url-policy"

const stream = new TransformStream<Uint8Array, Uint8Array>()

const requireUrl = (value: string) => {
  const result = normalizeHttpUrl(value)
  if (!result.ok) throw new TypeError("Expected a valid URL.")
  return result.value
}

const createConnection = (
  remoteAddress: string,
  onClose: () => void = () => {}
): NetworkConnection => ({
  close: onClose,
  readable: stream.readable,
  remoteAddress,
  writable: stream.writable,
})

describe("SSRF policy", () => {
  it("resolves every address and connects to the checked IP", async () => {
    const requests: PinnedConnectionRequest[] = []
    const policy = createSsrfPolicy({
      connections: {
        open: async (request) => {
          requests.push(request)
          return createConnection(request.ipAddress)
        },
      },
      dns: {
        resolve: async () => [
          { address: "1.1.1.1", family: "ipv4" },
          { address: "2001:4860:4860::8888", family: "ipv6" },
        ],
      },
    })
    const signal = new AbortController().signal
    const target = await policy.resolve(
      requireUrl("https://example.com"),
      signal
    )
    const connection = await policy.connect(target, signal)

    expect(connection.remoteAddress).toBe("1.1.1.1")
    expect(requests).toEqual([
      {
        ipAddress: "1.1.1.1",
        port: 443,
        signal,
        tlsServerName: "example.com",
      },
    ])
  })

  it("rejects a host when any DNS result is unsafe", async () => {
    let connectionCalls = 0
    const policy = createSsrfPolicy({
      connections: {
        open: async () => {
          connectionCalls += 1
          return createConnection("1.1.1.1")
        },
      },
      dns: {
        resolve: async () => [
          { address: "1.1.1.1", family: "ipv4" },
          { address: "127.0.0.1", family: "ipv4" },
        ],
      },
    })

    await expect(
      policy.resolve(
        requireUrl("https://rebinding.example.com"),
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: "unsafe_address", retrySafe: false })
    expect(connectionCalls).toBe(0)
  })

  it("rejects malformed and mislabeled DNS results", async () => {
    const dns: DnsAdapter = {
      resolve: async () => [{ address: "1.1.1.1", family: "ipv6" }],
    }
    const policy = createSsrfPolicy({
      connections: { open: async () => createConnection("1.1.1.1") },
      dns,
    })

    await expect(
      policy.resolve(requireUrl("example.com"), new AbortController().signal)
    ).rejects.toMatchObject({
      code: "invalid_dns_result",
      retrySafe: false,
    })
  })

  it("rejects DNS work above its fixed address bound", async () => {
    const policy = createSsrfPolicy({
      connections: { open: async () => createConnection("1.1.1.1") },
      dns: {
        resolve: async () =>
          Array.from({ length: 17 }, (_, index) => ({
            address: `8.8.8.${index + 1}`,
            family: "ipv4" as const,
          })),
      },
    })

    await expect(
      policy.resolve(requireUrl("example.com"), new AbortController().signal)
    ).rejects.toMatchObject({
      code: "invalid_dns_result",
      retrySafe: false,
    })
  })

  it("rechecks a structurally forged literal URL", async () => {
    const policy = createSsrfPolicy({
      connections: { open: async () => createConnection("127.0.0.1") },
      dns: { resolve: async () => [] },
    })

    await expect(
      policy.resolve(
        {
          href: "http://127.0.0.1/",
          hostname: "127.0.0.1",
          port: 80,
          protocol: "http:",
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: "unsafe_address", retrySafe: false })
  })

  it("does not resolve an accepted literal IP again", async () => {
    let dnsCalls = 0
    const policy = createSsrfPolicy({
      connections: {
        open: async (request) => createConnection(request.ipAddress),
      },
      dns: {
        resolve: async () => {
          dnsCalls += 1
          return []
        },
      },
    })
    const signal = new AbortController().signal
    const target = await policy.resolve(requireUrl("https://8.8.8.8"), signal)
    await policy.connect(target, signal)

    expect(dnsCalls).toBe(0)
  })

  it("tries the next checked address after a connection failure", async () => {
    const attemptedAddresses: string[] = []
    const connections: ConnectionAdapter = {
      open: async (request) => {
        attemptedAddresses.push(request.ipAddress)
        if (request.ipAddress === "1.1.1.1") throw new Error("unreachable")
        return createConnection(request.ipAddress)
      },
    }
    const policy = createSsrfPolicy({
      connections,
      dns: {
        resolve: async () => [
          { address: "1.1.1.1", family: "ipv4" },
          { address: "8.8.8.8", family: "ipv4" },
        ],
      },
    })
    const signal = new AbortController().signal
    const target = await policy.resolve(requireUrl("example.com"), signal)
    const connection = await policy.connect(target, signal)

    expect(attemptedAddresses).toEqual(["1.1.1.1", "8.8.8.8"])
    expect(connection.remoteAddress).toBe("8.8.8.8")
  })

  it("closes and rejects a connection to a different peer", async () => {
    let closed = false
    const policy = createSsrfPolicy({
      connections: {
        open: async () =>
          createConnection("8.8.8.8", () => {
            closed = true
          }),
      },
      dns: {
        resolve: async () => [{ address: "1.1.1.1", family: "ipv4" }],
      },
    })
    const signal = new AbortController().signal
    const target = await policy.resolve(requireUrl("example.com"), signal)

    await expect(policy.connect(target, signal)).rejects.toMatchObject({
      code: "peer_address_mismatch",
      retrySafe: false,
    })
    expect(closed).toBe(true)
  })

  it("maps DNS and connection errors without exposing raw details", async () => {
    const policy = createSsrfPolicy({
      connections: { open: async () => createConnection("1.1.1.1") },
      dns: { resolve: async () => Promise.reject(new Error("private detail")) },
    })

    const error = await policy
      .resolve(requireUrl("example.com"), new AbortController().signal)
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(SsrfPolicyError)
    expect(error).toMatchObject({ code: "dns_failed", retrySafe: true })
    expect((error as Error).message).not.toContain("private detail")
  })

  it("fails before DNS when the work was aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    const policy = createSsrfPolicy({
      connections: { open: async () => createConnection("1.1.1.1") },
      dns: { resolve: async () => [{ address: "1.1.1.1", family: "ipv4" }] },
    })

    await expect(
      policy.resolve(requireUrl("example.com"), controller.signal)
    ).rejects.toMatchObject({ code: "aborted", retrySafe: true })
  })
})
