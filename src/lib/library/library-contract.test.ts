import { describe, expect, it } from "vitest"

import {
  getLibraryPageSize,
  getSearchLimits,
} from "@/lib/library/library-adapter"
import {
  decodeLibraryCursor,
  encodeLibraryCursor,
} from "@/lib/library/library-cursor"
import { LibraryError } from "@/lib/library/library-error"
import {
  toBookmarkId,
  toCollectionId,
  toEpochMilliseconds,
  toTagId,
} from "@/lib/library/library-types"

describe("library contract bounds", () => {
  it("uses the approved page default and rejects work above the maximum", () => {
    expect(getLibraryPageSize()).toBe(48)
    expect(getLibraryPageSize(96)).toBe(96)
    expect(() => getLibraryPageSize(97)).toThrowError(
      expect.objectContaining({ code: "invalid_input", retrySafe: false })
    )
    expect(() => getLibraryPageSize(0)).toThrowError(LibraryError)
  })

  it("keeps search within the approved grouped limits", () => {
    expect(getSearchLimits()).toEqual({
      bookmarkLimit: 32,
      collectionLimit: 16,
    })
    expect(() => getSearchLimits(33, 16)).toThrowError(LibraryError)
    expect(() => getSearchLimits(32, 17)).toThrowError(LibraryError)
  })
})

describe("library cursors", () => {
  it("round-trips Unicode sort values and binds the cursor to its view", () => {
    const cursor = encodeLibraryCursor({
      binding: "collections:root:alpha",
      id: "12",
      kind: "collections",
      values: ["أبحاث"],
      version: 1,
    })

    expect(
      decodeLibraryCursor(cursor, "collections", "collections:root:alpha")
    ).toEqual({
      binding: "collections:root:alpha",
      id: "12",
      kind: "collections",
      values: ["أبحاث"],
      version: 1,
    })
    expect(() =>
      decodeLibraryCursor(cursor, "collections", "collections:root:newest")
    ).toThrowError(LibraryError)
  })

  it.each(["not-base64", "a".repeat(4_097)])(
    "rejects malformed and oversized cursors as invalid input",
    (cursor) => {
      expect(() =>
        decodeLibraryCursor(cursor, "bookmarks", "bookmarks:all:date")
      ).toThrowError(
        expect.objectContaining({ code: "invalid_input", retrySafe: false })
      )
    }
  )

  it("rejects non-database IDs before encoding", () => {
    expect(() =>
      encodeLibraryCursor({
        binding: "bookmarks:all:date",
        id: "bookmark-1",
        kind: "bookmarks",
        values: [100],
        version: 1,
      })
    ).toThrowError(expect.objectContaining({ code: "invalid_input" }))
  })
})

describe("library scalar types", () => {
  it("accepts database IDs and finite timestamps", () => {
    expect(toBookmarkId("1")).toBe("1")
    expect(toCollectionId("2")).toBe("2")
    expect(toTagId("3")).toBe("3")
    expect(toEpochMilliseconds(1_000)).toBe(1_000)
  })

  it("rejects values that cannot cross the database adapter edge", () => {
    expect(() => toBookmarkId("bookmark-1")).toThrow(TypeError)
    expect(() => toCollectionId("0")).toThrow(TypeError)
    expect(() => toTagId("-1")).toThrow(TypeError)
    expect(() => toEpochMilliseconds(Number.NaN)).toThrow(TypeError)
  })
})
