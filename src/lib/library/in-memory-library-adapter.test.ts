import { describe, expect, it } from "vitest"

import {
  createInMemoryLibraryAdapter,
  type InMemoryLibrarySeed,
} from "@/lib/library/in-memory-library-adapter"
import type {
  LibraryAdapter,
  LibraryReadResult,
} from "@/lib/library/library-adapter"
import { LibraryError } from "@/lib/library/library-error"
import {
  toBookmarkId,
  toCollectionId,
  toEpochMilliseconds,
  toTagId,
} from "@/lib/library/library-types"

const bookmarkId1 = toBookmarkId("1")
const bookmarkId2 = toBookmarkId("2")
const bookmarkId3 = toBookmarkId("3")
const collectionId1 = toCollectionId("1")
const collectionId2 = toCollectionId("2")
const collectionId3 = toCollectionId("3")
const tagId1 = toTagId("1")
const tagId2 = toTagId("2")
const fixedNow = toEpochMilliseconds(10_000)

const createSeed = (): InMemoryLibrarySeed => ({
  bookmarkDetails: [
    {
      bookmarkId: bookmarkId1,
      collections: [{ collectionId: collectionId2, sortOrder: "a0" }],
      tagIds: [tagId1],
    },
    { bookmarkId: bookmarkId2, collections: [], tagIds: [tagId2] },
    {
      bookmarkId: bookmarkId3,
      collections: [{ collectionId: collectionId3, sortOrder: "a0" }],
      tagIds: [tagId1],
    },
  ],
  bookmarks: [
    {
      collectionCount: 1,
      createdAt: toEpochMilliseconds(300),
      domain: "linear.app",
      faviconUrl: null,
      id: bookmarkId1,
      metadataStatus: "enriched",
      ogImageUrl: null,
      purgeAfter: null,
      rowVersion: 2,
      title: "Linear research",
      trashedAt: null,
      updatedAt: toEpochMilliseconds(400),
      url: "https://linear.app/research",
      visitCount: 10,
    },
    {
      collectionCount: 0,
      createdAt: toEpochMilliseconds(200),
      domain: "example.com",
      faviconUrl: null,
      id: bookmarkId2,
      metadataStatus: "pending",
      ogImageUrl: null,
      purgeAfter: null,
      rowVersion: 1,
      title: "Example",
      trashedAt: null,
      updatedAt: toEpochMilliseconds(200),
      url: "https://example.com",
      visitCount: 2,
    },
    {
      collectionCount: 1,
      createdAt: toEpochMilliseconds(100),
      domain: "old.example",
      faviconUrl: null,
      id: bookmarkId3,
      metadataStatus: "failed",
      ogImageUrl: null,
      purgeAfter: toEpochMilliseconds(20_000),
      rowVersion: 3,
      title: "Old bookmark",
      trashedAt: toEpochMilliseconds(1_000),
      updatedAt: toEpochMilliseconds(1_000),
      url: "https://old.example",
      visitCount: 1,
    },
  ],
  collections: [
    {
      bookmarkOrderVersion: 0,
      childOrderVersion: 0,
      color: "blue",
      createdAt: toEpochMilliseconds(100),
      directBookmarkCount: 0,
      icon: "folder",
      id: collectionId1,
      name: "Research",
      parentId: null,
      rowVersion: 1,
      sortOrder: "a0",
      updatedAt: toEpochMilliseconds(100),
    },
    {
      bookmarkOrderVersion: 0,
      childOrderVersion: 0,
      color: "indigo",
      createdAt: toEpochMilliseconds(200),
      directBookmarkCount: 1,
      icon: "book",
      id: collectionId2,
      name: "Reading",
      parentId: collectionId1,
      rowVersion: 1,
      sortOrder: "a0",
      updatedAt: toEpochMilliseconds(200),
    },
    {
      bookmarkOrderVersion: 0,
      childOrderVersion: 0,
      color: "neutral",
      createdAt: toEpochMilliseconds(300),
      directBookmarkCount: 0,
      icon: "archive",
      id: collectionId3,
      name: "Archive",
      parentId: null,
      rowVersion: 1,
      sortOrder: "b0",
      updatedAt: toEpochMilliseconds(300),
    },
  ],
  preferences: {
    bookmarkSort: "date",
    collectionOrder: "newest",
    desktopCollectionsOpen: true,
    desktopTagsOpen: true,
    mobileCollectionsOpen: true,
    mobileTagsOpen: true,
    rootCollectionOrderVersion: 0,
    rowVersion: 1,
    tagOrder: "alpha",
    tagOrderVersion: 0,
    theme: "system",
    updatedAt: toEpochMilliseconds(100),
    viewMode: "list",
  },
  tags: [
    {
      color: "red",
      createdAt: toEpochMilliseconds(100),
      id: tagId1,
      name: "Design",
      rowVersion: 1,
      sortOrder: "a0",
      updatedAt: toEpochMilliseconds(100),
    },
    {
      color: "green",
      createdAt: toEpochMilliseconds(200),
      id: tagId2,
      name: "Tools",
      rowVersion: 1,
      sortOrder: "b0",
      updatedAt: toEpochMilliseconds(200),
    },
  ],
})

const createAdapter = (): LibraryAdapter =>
  createInMemoryLibraryAdapter(createSeed(), { now: () => fixedNow })

const asResult = <K extends LibraryReadResult["kind"]>(
  result: LibraryReadResult,
  kind: K
): Extract<LibraryReadResult, { kind: K }> => {
  if (result.kind !== kind) throw new Error(`Expected ${kind} result.`)
  return result as Extract<LibraryReadResult, { kind: K }>
}

describe("in-memory library reads", () => {
  it("pages one bounded view and rejects a cursor used with another sort", async () => {
    const adapter = createAdapter()
    const first = asResult(
      await adapter.read({
        kind: "collections",
        order: "newest",
        pageSize: 1,
        parentId: null,
      }),
      "collections"
    )

    expect(first.page.items.map(({ name }) => name)).toEqual(["Archive"])
    expect(first.page.nextCursor).not.toBeNull()

    const second = asResult(
      await adapter.read({
        cursor: first.page.nextCursor ?? undefined,
        kind: "collections",
        order: "newest",
        pageSize: 1,
        parentId: null,
      }),
      "collections"
    )
    expect(second.page.items.map(({ name }) => name)).toEqual(["Research"])

    await expect(
      adapter.read({
        cursor: first.page.nextCursor ?? undefined,
        kind: "collections",
        order: "alpha",
        parentId: null,
      })
    ).rejects.toMatchObject({ code: "invalid_input" })
  })

  it("loads memberships on demand and keeps Trash out of grouped search", async () => {
    const adapter = createAdapter()
    const detail = asResult(
      await adapter.read({ bookmarkId: bookmarkId1, kind: "bookmark-detail" }),
      "bookmark-detail"
    )
    const search = asResult(
      await adapter.read({ kind: "search", query: "research" }),
      "search"
    )
    const hiddenTrash = asResult(
      await adapter.read({ kind: "search", query: "old" }),
      "search"
    )

    expect(detail.detail).toEqual({
      bookmarkId: bookmarkId1,
      collections: [{ collectionId: collectionId2, sortOrder: "a0" }],
      tagIds: [tagId1],
    })
    expect(search.results.bookmarks.map(({ id }) => id)).toEqual([bookmarkId1])
    expect(search.results.collections.map(({ path }) => path)).toEqual([
      "Research",
      "Research / Reading",
    ])
    expect(hiddenTrash.results.bookmarks).toEqual([])
  })
})

describe("in-memory library mutations", () => {
  it("normalizes creates and maps duplicate and stale writes to stable errors", async () => {
    const adapter = createAdapter()
    const created = await adapter.mutate({
      draft: {
        color: "teal",
        icon: "camera",
        name: "  Visual   notes  ",
        parentId: null,
        sortOrder: "c0",
      },
      kind: "create-collection",
    })

    expect(created).toMatchObject({
      collection: { id: "4", name: "Visual notes", rowVersion: 1 },
      kind: "collection",
    })
    await expect(
      adapter.mutate({
        draft: {
          color: "blue",
          icon: "folder",
          name: "research",
          parentId: null,
          sortOrder: "d0",
        },
        kind: "create-collection",
      })
    ).rejects.toMatchObject({ code: "conflict", retrySafe: false })
    await expect(
      adapter.mutate({
        expectedRowVersion: 99,
        kind: "edit-tag",
        patch: { color: "amber", name: "Design" },
        tagId: tagId1,
      })
    ).rejects.toMatchObject({ code: "conflict", retrySafe: true })
  })

  it("keeps a failed bulk membership command atomic", async () => {
    const adapter = createAdapter()

    await expect(
      adapter.mutate({
        bookmarkIds: [bookmarkId2, toBookmarkId("99")],
        collectionId: collectionId1,
        kind: "add-bookmarks-to-collection",
        sortOrders: ["c0", "d0"],
      })
    ).rejects.toBeInstanceOf(LibraryError)

    const detail = asResult(
      await adapter.read({ bookmarkId: bookmarkId2, kind: "bookmark-detail" }),
      "bookmark-detail"
    )
    expect(detail.detail.collections).toEqual([])
  })

  it("deletes a collection subtree and trashes only bookmarks left without a collection", async () => {
    const adapter = createAdapter()
    const result = await adapter.mutate({
      collectionId: collectionId1,
      kind: "delete-collection",
    })
    const trash = asResult(
      await adapter.read({
        destination: { kind: "trash" },
        kind: "bookmarks",
        sort: "date",
      }),
      "bookmarks"
    )

    expect(result).toEqual({
      deletedCollectionCount: 2,
      kind: "collection-deleted",
      targetIds: [collectionId1, collectionId2],
      trashedBookmarkCount: 1,
    })
    expect(trash.page.items.map(({ id }) => id)).toEqual([
      bookmarkId1,
      bookmarkId3,
    ])
  })

  it("uses version checks for order and idempotent visit event IDs", async () => {
    const adapter = createAdapter()

    await expect(
      adapter.mutate({
        expectedVersion: 4,
        kind: "reorder-tag",
        sortOrder: "c0",
        tagId: tagId1,
      })
    ).rejects.toMatchObject({ code: "conflict", retrySafe: true })

    const first = await adapter.mutate({
      events: [{ bookmarkId: bookmarkId1, eventId: "event-1" }],
      kind: "record-visits",
    })
    const repeated = await adapter.mutate({
      events: [{ bookmarkId: bookmarkId1, eventId: "event-1" }],
      kind: "record-visits",
    })
    const page = asResult(
      await adapter.read({
        destination: { kind: "all" },
        kind: "bookmarks",
        sort: "visits",
      }),
      "bookmarks"
    )

    expect(first).toEqual({ insertedCount: 1, kind: "visits-recorded" })
    expect(repeated).toEqual({ insertedCount: 0, kind: "visits-recorded" })
    expect(page.page.items[0]).toMatchObject({
      id: bookmarkId1,
      visitCount: 11,
    })
  })
})
