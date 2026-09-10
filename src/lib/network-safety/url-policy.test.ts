import { describe, expect, it } from "vitest"

import {
  MAX_BOOKMARK_URL_LENGTH,
  normalizeHttpUrl,
} from "@/lib/network-safety/url-policy"

describe("HTTP URL normalization", () => {
  it.each([
    {
      expected: "https://example.com/",
      input: "  example.com  ",
    },
    {
      expected: "http://example.com/a%20path?q=1#part",
      input: "HTTP://Example.COM:80/a path?q=1#part",
    },
    {
      expected: "https://example.com/path",
      input: "example.com:443/path",
    },
    {
      expected: "https://8.8.8.8/",
      input: "8.8.8.8",
    },
  ])("normalizes $input", ({ expected, input }) => {
    const result = normalizeHttpUrl(input)
    expect(result).toMatchObject({ ok: true, value: { href: expected } })
  })

  it("converts a Unicode host to its ASCII DNS form", () => {
    const result = normalizeHttpUrl("https://مثال.إختبار/بحث")
    expect(result).toMatchObject({
      ok: true,
      value: {
        hostname: "xn--mgbh0fb.xn--kgbechtv",
        protocol: "https:",
      },
    })
  })

  it.each([
    ["ftp://example.com", "unsupported_protocol"],
    ["javascript:alert(1)", "unsupported_protocol"],
    ["https://user:secret@example.com", "credentials"],
    ["https://example.com:8080", "disallowed_port"],
    ["http://example.com:443", "disallowed_port"],
    ["https://localhost", "unsafe_host"],
    ["http://worker.local", "unsafe_host"],
    ["https://metadata.google.internal", "unsafe_host"],
    ["https://single-label", "invalid_host"],
    ["https://bad_label.example", "invalid_host"],
    ["https://123.456", "invalid_host"],
    ["not a url", "invalid_url"],
    ["https://example.com/\npath", "invalid_url"],
  ])("rejects %s as %s", (input, reason) => {
    expect(normalizeHttpUrl(input)).toEqual({ ok: false, reason })
  })

  it.each([
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://017700000001",
    "http://10.0.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://172.16.0.1",
    "http://192.168.0.1",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://[fe80::1]",
  ])("rejects literal unsafe target %s without DNS", (input) => {
    expect(normalizeHttpUrl(input)).toEqual({
      ok: false,
      reason: "unsafe_host",
    })
  })

  it("accepts the exact URL bound and rejects the next byte", () => {
    const prefix = "https://example.com/"
    const exact = `${prefix}${"a".repeat(MAX_BOOKMARK_URL_LENGTH - prefix.length)}`
    expect(normalizeHttpUrl(exact)).toMatchObject({ ok: true })
    expect(normalizeHttpUrl(`${exact}a`)).toEqual({
      ok: false,
      reason: "too_long",
    })
  })
})
