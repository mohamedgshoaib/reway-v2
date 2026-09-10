import { PassThrough } from "node:stream"

import { describe, expect, it, vi } from "vitest"

import {
  createNodeDnsAdapter,
  createNodePinnedConnectionAdapter,
} from "./node-pinned-network.server"

const createSocket = (remoteAddress: string): PassThrough => {
  const socket = new PassThrough()
  Object.defineProperty(socket, "remoteAddress", { value: remoteAddress })
  return socket
}

describe("Node pinned network adapters", () => {
  it("keeps successful IPv4 answers when IPv6 resolution fails", async () => {
    const adapter = createNodeDnsAdapter({
      resolve4: async () => ["203.0.113.8"],
      resolve6: async () => {
        throw new Error("No IPv6 records")
      },
    })

    await expect(
      adapter.resolve("example.com", new AbortController().signal)
    ).resolves.toEqual([{ address: "203.0.113.8", family: "ipv4" }])
  })

  it("opens TLS against the pinned IP while keeping the hostname for SNI", async () => {
    const socket = createSocket("203.0.113.8")
    const openTcp = vi.fn<() => Promise<PassThrough>>(async () => socket)
    const openTls = vi.fn<() => Promise<PassThrough>>(async () => socket)
    const signal = new AbortController().signal
    const adapter = createNodePinnedConnectionAdapter({ openTcp, openTls })

    const connection = await adapter.open({
      ipAddress: "203.0.113.8",
      port: 443,
      signal,
      tlsServerName: "example.com",
    })

    expect(openTcp).not.toHaveBeenCalled()
    expect(openTls).toHaveBeenCalledWith({
      ipAddress: "203.0.113.8",
      port: 443,
      signal,
      tlsServerName: "example.com",
    })
    expect(connection.remoteAddress).toBe("203.0.113.8")
    connection.close()
  })

  it("closes an opened socket if the request aborts", async () => {
    const socket = createSocket("203.0.113.8")
    const destroy = vi.spyOn(socket, "destroy")
    const controller = new AbortController()
    const adapter = createNodePinnedConnectionAdapter({
      openTcp: async () => socket,
      openTls: async () => socket,
    })

    await adapter.open({
      ipAddress: "203.0.113.8",
      port: 80,
      signal: controller.signal,
      tlsServerName: null,
    })
    controller.abort()

    expect(destroy).toHaveBeenCalledOnce()
  })
})
