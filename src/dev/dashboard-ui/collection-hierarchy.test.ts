import { describe, expect, it } from "vitest"

import {
  createCollectionIndex,
  flattenImportedCollectionPath,
  getCollectionColor,
  getCollectionDeletion,
  getCollectionNameError,
  moveCollection,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"

const collections: Collection[] = [
  {
    createdAt: 3,
    icon: "folder",
    id: "media",
    name: "Media",
    order: 0,
    parentId: null,
  },
  {
    createdAt: 2,
    icon: "folder",
    id: "streaming",
    name: "Streaming Platforms",
    order: 0,
    parentId: "media",
  },
  {
    createdAt: 1,
    icon: "research",
    id: "research",
    name: "Research",
    order: 1,
    parentId: null,
  },
]

describe("collection hierarchy", () => {
  it("treats a missing stored color as neutral", () => {
    expect(getCollectionColor(collections[0])).toEqual({
      kind: "palette",
      value: "neutral",
    })
  })

  it("builds direct counts, paths, and always-visible rows", () => {
    const index = createCollectionIndex(
      collections,
      [{ collections: ["media", "streaming"] }, { collections: ["streaming"] }],
      "custom"
    )

    expect(index.rows).toMatchObject([
      {
        collection: { id: "media" },
        depth: 0,
        directCount: 1,
        hasChildren: true,
        path: "Media",
      },
      {
        collection: { id: "streaming" },
        depth: 1,
        directCount: 2,
        hasChildren: false,
        path: "Media / Streaming Platforms",
      },
      {
        collection: { id: "research" },
        depth: 0,
        directCount: 0,
        hasChildren: false,
        path: "Research",
      },
    ])
  })

  it("reparents a leaf and normalizes its new sibling order", () => {
    const result = moveCollection(collections, "research", "media", 0)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(
      result.collections
        .filter((collection) => collection.parentId === "media")
        .sort((first, second) => first.order - second.order)
        .map((collection) => collection.id)
    ).toEqual(["research", "streaming"])
  })

  it("refuses to nest a collection that already has children", () => {
    const result = moveCollection(collections, "media", "research", 0)

    expect(result).toEqual({
      message: "Move its nested collections first.",
      ok: false,
    })
  })

  it("deletes a parent subtree and counts exclusive bookmarks", () => {
    const deletion = getCollectionDeletion(
      collections,
      [
        { collections: ["media"] },
        { collections: ["streaming"] },
        { collections: ["streaming", "research"] },
      ],
      "media"
    )

    expect(deletion.deletedIds).toEqual(new Set(["media", "streaming"]))
    expect(deletion.exclusiveBookmarkCount).toBe(2)
    expect(
      deletion.remainingCollections.map((collection) => collection.id)
    ).toEqual(["research"])
  })

  it("normalizes names and enforces global uniqueness", () => {
    expect(
      getCollectionNameError(collections, "  streaming   platforms ")
    ).toBe("A collection with this name already exists.")
    expect(getCollectionNameError(collections, "Media", "media")).toBeNull()
    expect(getCollectionNameError(collections, "")).toBe(
      "Enter a collection name."
    )
  })

  it("flattens deeper imports into the nearest retained child", () => {
    expect(
      flattenImportedCollectionPath([
        " Media ",
        "Streaming Platforms",
        "TV Shows",
        "Drama",
      ])
    ).toEqual({
      flattenedSegments: ["TV Shows", "Drama"],
      retainedPath: ["Media", "Streaming Platforms"],
      sourcePath: ["Media", "Streaming Platforms", "TV Shows", "Drama"],
    })
  })
})
