import { describe, expect, it } from "vitest"

import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import {
  createImportedXBookmark,
  createXArchiveReview,
  createXImportSelection,
  ensureXBookmarksCollection,
  getXArchiveFileNameError,
  planXImportFailures,
  setXImportPostSelected,
} from "@/dev/dashboard-ui/dashboard-x-import"

describe("dashboard X import model", () => {
  it("accepts both X archive bookmark file names", () => {
    expect(getXArchiveFileNameError("bookmark.js")).toBeNull()
    expect(getXArchiveFileNameError("BOOKMARKS.JS")).toBeNull()
    expect(getXArchiveFileNameError("archive.zip")).toBe(
      "Choose bookmark.js or bookmarks.js from your X archive."
    )
  })

  it("reports malformed, empty, and mixed archives before import", () => {
    expect(
      createXArchiveReview({
        existingUrls: new Set(),
        fileName: "bookmarks.js",
        fixture: "malformed",
      })
    ).toMatchObject({ kind: "error" })
    expect(
      createXArchiveReview({
        existingUrls: new Set(),
        fileName: "bookmarks.js",
        fixture: "empty",
      })
    ).toEqual({ fileName: "bookmarks.js", kind: "empty" })
    expect(
      createXArchiveReview({
        existingUrls: new Set(),
        fileName: "bookmarks.js",
        fixture: "mixed",
      })
    ).toMatchObject({ kind: "review", review: { skippedCount: 2 } })
  })

  it("marks repeated archive posts and posts already in the library", () => {
    const firstReview = createXArchiveReview({
      existingUrls: new Set(),
      fileName: "bookmarks.js",
      fixture: "duplicates",
    })
    if (firstReview.kind !== "review") {
      throw new Error("Expected a review fixture.")
    }

    const repeatedPosts = firstReview.review.posts.filter((post) =>
      post.duplicateKinds.includes("archive")
    )
    expect(repeatedPosts).toHaveLength(2)

    const repeatedReview = createXArchiveReview({
      existingUrls: new Set([firstReview.review.posts[0].url]),
      fileName: "bookmark.js",
      fixture: "valid",
    })
    if (repeatedReview.kind !== "review") {
      throw new Error("Expected a review fixture.")
    }
    expect(repeatedReview.review.posts[0].duplicateKinds).toContain("library")
  })

  it("selects every review row and supports one-row changes", () => {
    const result = createXArchiveReview({
      existingUrls: new Set(),
      fileName: "bookmarks.js",
      fixture: "valid",
    })
    if (result.kind !== "review") throw new Error("Expected a review fixture.")

    const selectedIds = createXImportSelection(result.review.posts)
    expect(selectedIds.size).toBe(result.review.posts.length)
    expect(
      setXImportPostSelected({
        entryId: result.review.posts[0].entryId,
        selected: false,
        selectedIds,
      }).size
    ).toBe(result.review.posts.length - 1)
  })

  it("plans stable success, partial, and total failure results", () => {
    const entryIds = ["one", "two", "three", "four"]
    expect([...planXImportFailures(entryIds, "success")]).toEqual([])
    expect([...planXImportFailures(entryIds, "partial")]).toEqual(["three"])
    expect([...planXImportFailures(entryIds, "failure")]).toEqual(entryIds)
  })

  it("creates or reuses the X Bookmarks collection", () => {
    const initialCollections: Collection[] = [
      {
        createdAt: 1,
        icon: "folder",
        id: "research",
        name: "Research",
        order: 0,
        parentId: null,
      },
    ]
    const created = ensureXBookmarksCollection(initialCollections, 2)
    expect(created).toMatchObject({
      collectionId: "x-bookmarks",
      created: true,
    })
    expect(created.collections[0]).toMatchObject({
      color: { kind: "palette", value: "neutral" },
      icon: "x",
      name: "X Bookmarks",
    })

    const reused = ensureXBookmarksCollection(created.collections, 3)
    expect(reused).toMatchObject({
      collectionId: "x-bookmarks",
      created: false,
    })
    expect(reused.collections).toHaveLength(created.collections.length)
  })

  it("converts a reviewed post into a library bookmark", () => {
    const result = createXArchiveReview({
      existingUrls: new Set(),
      fileName: "bookmarks.js",
      fixture: "valid",
    })
    if (result.kind !== "review") throw new Error("Expected a review fixture.")

    expect(
      createImportedXBookmark({
        collectionId: "x-bookmarks",
        createdAt: 10,
        importId: "run-1",
        post: result.review.posts[0],
      })
    ).toMatchObject({
      collections: ["x-bookmarks"],
      domain: "x.com",
      metadataStatus: "enriched",
      url: result.review.posts[0].url,
    })
  })
})
