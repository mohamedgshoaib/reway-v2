import { describe, expect, it } from "vitest"

import {
  ipAddressesEqual,
  isPublicIpAddress,
  parseIpAddress,
} from "@/lib/network-safety/ip-address"

const requireIpAddress = (value: string) => {
  const address = parseIpAddress(value)
  if (address === null) throw new TypeError("Expected a valid IP address.")
  return address
}

describe("IP address policy", () => {
  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.0.0.1",
    "192.0.2.1",
    "192.88.99.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
  ])("rejects non-public IPv4 address %s", (value) => {
    expect(isPublicIpAddress(requireIpAddress(value))).toBe(false)
  })

  it.each([
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "64:ff9b::c000:201",
    "64:ff9b:1::1",
    "100::1",
    "2001::1",
    "2001:db8::1",
    "2002::1",
    "3fff::1",
    "5f00::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
    "ff00::1",
    "1000::1",
    "4000::1",
  ])("rejects non-public IPv6 address %s", (value) => {
    expect(isPublicIpAddress(requireIpAddress(value))).toBe(false)
  })

  it.each(["1.1.1.1", "8.8.8.8", "2001:4860:4860::8888"])(
    "accepts public address %s",
    (value) => {
      expect(isPublicIpAddress(requireIpAddress(value))).toBe(true)
    }
  )

  it("compares equivalent IPv6 spellings by bytes", () => {
    expect(
      ipAddressesEqual(
        requireIpAddress("2001:4860:4860::8888"),
        requireIpAddress("2001:4860:4860:0:0:0:0:8888")
      )
    ).toBe(true)
  })

  it.each([
    "",
    "1.2.3",
    "01.2.3.4",
    "256.2.3.4",
    "2001::1::2",
    "2001:db8:1:2:3:4:5",
    "fe80::1%eth0",
  ])("rejects malformed address %s", (value) => {
    expect(parseIpAddress(value)).toBeNull()
  })
})
