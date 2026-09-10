import { describe, expect, it } from "vitest"

import {
  MAX_HTML_RESPONSE_BYTES,
  MAX_METADATA_TITLE_LENGTH,
  parsePageMetadata,
} from "./page-metadata"

const encode = (value: string): Uint8Array => new TextEncoder().encode(value)

const parse = (html: string, contentType = "text/html; charset=utf-8") =>
  parsePageMetadata({
    body: encode(html),
    contentType,
    finalUrl: "https://example.com/articles/item",
  })

describe("page metadata", () => {
  it("prefers the first valid Open Graph title and normalizes text", () => {
    const result = parse(`
      <html><head>
        <title> Document &amp; title </title>
        <meta property="og:title" content="  Open\nGraph &amp; title  ">
        <meta property="og:title" content="Later title">
      </head></html>
    `)

    expect(result.title).toBe("Open Graph & title")
  })

  it("resolves relative URLs against the first safe base URL", () => {
    const result = parse(`
      <head>
        <base href="https://assets.example.com/static/">
        <link rel="shortcut icon" href="old.ico">
        <link rel="icon" href="icons/current.png#fragment">
        <meta property="og:image" content="../covers/item.webp">
      </head>
    `)

    expect(result).toEqual({
      faviconUrl: "https://assets.example.com/static/icons/current.png",
      ogImageUrl: "https://assets.example.com/covers/item.webp",
      title: null,
    })
  })

  it("skips unsafe and malformed duplicate URL candidates", () => {
    const result = parse(`
      <head>
        <link rel="icon" href="http://localhost/icon.png">
        <link rel="icon" href="javascript:alert(1)">
        <link rel="icon" href="/safe.png">
        <meta property="og:image" content="data:image/png;base64,abc">
        <meta property="og:image:url" content="//cdn.example.com/cover.png">
      </head>
    `)

    expect(result.faviconUrl).toBe("https://example.com/safe.png")
    expect(result.ogImageUrl).toBe("https://cdn.example.com/cover.png")
  })

  it("tolerates malformed HTML and ignores metadata after the body starts", () => {
    const result = parse(`
      <head><title>Useful &amp; title</title>
        <link rel="icon" href="/head.png">
      <body>
        <meta property="og:title" content="Body title">
        <link rel="icon" href="/body.png">
    `)

    expect(result).toEqual({
      faviconUrl: "https://example.com/head.png",
      ogImageUrl: null,
      title: "Useful & title",
    })
  })

  it("returns null fields when metadata is missing", () => {
    expect(parse("<html><head></head><body>Text</body></html>")).toEqual({
      faviconUrl: null,
      ogImageUrl: null,
      title: null,
    })
  })

  it("decodes a supported legacy charset from the response header", () => {
    const prefix = encode("<head><title>Caf")
    const suffix = encode("</title></head>")
    const body = new Uint8Array(prefix.length + 1 + suffix.length)
    body.set(prefix)
    body[prefix.length] = 0xe9
    body.set(suffix, prefix.length + 1)

    const result = parsePageMetadata({
      body,
      contentType: "text/html; charset=windows-1252",
      finalUrl: "https://example.com/",
    })

    expect(result.title).toBe("Café")
  })

  it("uses a supported charset declared in an early meta element", () => {
    const prefix = encode('<meta charset="windows-1252"><title>Caf')
    const suffix = encode("</title>")
    const body = new Uint8Array(prefix.length + 1 + suffix.length)
    body.set(prefix)
    body[prefix.length] = 0xe9
    body.set(suffix, prefix.length + 1)

    const result = parsePageMetadata({
      body,
      contentType: "text/html",
      finalUrl: "https://example.com/",
    })

    expect(result.title).toBe("Café")
  })

  it("bounds large title fields without splitting code points", () => {
    const result = parse(`<title>${"😀".repeat(600)}</title>`)

    expect(Array.from(result.title ?? "")).toHaveLength(
      MAX_METADATA_TITLE_LENGTH
    )
    expect(result.title?.endsWith("😀")).toBe(true)
  })

  it("accepts the exact HTML byte cap and rejects the next byte", () => {
    const prefix = encode("<title>Within limit</title>")
    const exactBody = new Uint8Array(MAX_HTML_RESPONSE_BYTES)
    exactBody.fill(0x20)
    exactBody.set(prefix)

    expect(
      parsePageMetadata({
        body: exactBody,
        contentType: "text/html",
        finalUrl: "https://example.com/",
      }).title
    ).toBe("Within limit")
    expect(() =>
      parsePageMetadata({
        body: new Uint8Array(MAX_HTML_RESPONSE_BYTES + 1),
        contentType: "text/html",
        finalUrl: "https://example.com/",
      })
    ).toThrowError(expect.objectContaining({ code: "html_too_large" }))
  })

  it.each([
    ["application/json", "unsupported_content_type"],
    ["text/html; charset=shift_jis", "unsupported_charset"],
  ] as const)("rejects %s input", (contentType, code) => {
    expect(() => parse("<title>Ignored</title>", contentType)).toThrowError(
      expect.objectContaining({ code })
    )
  })

  it("rejects an unsafe final page URL", () => {
    expect(() =>
      parsePageMetadata({
        body: encode("<title>Ignored</title>"),
        contentType: "text/html",
        finalUrl: "http://localhost/",
      })
    ).toThrowError(expect.objectContaining({ code: "invalid_final_url" }))
  })
})
