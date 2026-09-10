import { describe, expect, it } from "vitest"

import type {
  ConnectionAdapter,
  DnsAdapter,
} from "../../../src/lib/network-safety/ssrf-policy"
import {
  createDenoDnsAdapter,
  createDenoPinnedConnectionAdapter,
  requireDenoPinningRuntime,
  type DenoNetworkRuntime,
} from "./deno-pinned-network"

const stream = new TransformStream<Uint8Array, Uint8Array>()

const createRuntime = (overrides: Partial<DenoNetworkRuntime> = {}) => {
  const calls: Array<{ name: string; value: unknown }> = []
  let closeCount = 0
  const connection = {
    close: () => {
      closeCount += 1
    },
    readable: stream.readable,
    remoteAddr: { hostname: "1.1.1.1" },
    writable: stream.writable,
  }
  const runtime: DenoNetworkRuntime = {
    connect: async (options) => {
      calls.push({ name: "connect", value: options })
      return connection
    },
    resolveDns: async (_hostname, recordType) =>
      recordType === "A" ? ["1.1.1.1"] : ["2001:4860:4860::8888"],
    startTls: async (tcpConnection, options) => {
      calls.push({ name: "startTls", value: options })
      return { ...tcpConnection, remoteAddr: { hostname: "1.1.1.1" } }
    },
    ...overrides,
  }
  return { calls, connection, getCloseCount: () => closeCount, runtime }
}

describe("Deno pinned network adapters", () => {
  it("requires every low-level runtime operation", () => {
    expect(() =>
      requireDenoPinningRuntime({ connect: async () => {} })
    ).toThrow("The worker runtime cannot pin remote destinations.")
  })

  it("resolves both address families without treating one missing family as failure", async () => {
    const { runtime } = createRuntime({
      resolveDns: async (_hostname, recordType) => {
        if (recordType === "AAAA") throw new Error("no records")
        return ["1.1.1.1"]
      },
    })
    const addresses = await createDenoDnsAdapter(runtime).resolve(
      "example.com",
      new AbortController().signal
    )

    expect(addresses).toEqual([{ address: "1.1.1.1", family: "ipv4" }])
    const compatibleAdapter: DnsAdapter = createDenoDnsAdapter(runtime)
    expect(compatibleAdapter).toBeDefined()
  })

  it("connects to the checked IP before starting TLS for the original host", async () => {
    const { calls, runtime } = createRuntime()
    const signal = new AbortController().signal
    const connection = await createDenoPinnedConnectionAdapter(runtime).open({
      ipAddress: "1.1.1.1",
      port: 443,
      signal,
      tlsServerName: "example.com",
    })

    expect(calls).toEqual([
      {
        name: "connect",
        value: { hostname: "1.1.1.1", port: 443, transport: "tcp" },
      },
      {
        name: "startTls",
        value: { alpnProtocols: ["http/1.1"], hostname: "example.com" },
      },
    ])
    expect(connection.remoteAddress).toBe("1.1.1.1")
    const compatibleAdapter: ConnectionAdapter =
      createDenoPinnedConnectionAdapter(runtime)
    expect(compatibleAdapter).toBeDefined()
  })

  it("keeps plain HTTP on the pinned TCP connection", async () => {
    const { calls, runtime } = createRuntime()
    await createDenoPinnedConnectionAdapter(runtime).open({
      ipAddress: "1.1.1.1",
      port: 80,
      signal: new AbortController().signal,
      tlsServerName: null,
    })

    expect(calls.map((call) => call.name)).toEqual(["connect"])
  })

  it("closes an open connection when the worker aborts", async () => {
    const { getCloseCount, runtime } = createRuntime()
    const controller = new AbortController()
    await createDenoPinnedConnectionAdapter(runtime).open({
      ipAddress: "1.1.1.1",
      port: 80,
      signal: controller.signal,
      tlsServerName: null,
    })

    controller.abort()
    expect(getCloseCount()).toBe(1)
  })
})
