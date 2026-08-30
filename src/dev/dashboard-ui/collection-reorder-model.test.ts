import { describe, expect, it } from "vitest"

import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import {
  createFlatCollectionItems,
  getCollectionDragDepth,
  getCollectionProjection,
  getCollectionSiblingIndex,
  hasInvalidCollectionNestingIntent,
  normalizeFlatCollectionItems,
} from "@/dev/dashboard-ui/collection-reorder-model"

const collections: Collection[] = [
  {
    createdAt: 5,
    icon: "research",
    id: "research",
    name: "Research",
    order: 0,
    parentId: null,
  },
  {
    createdAt: 4,
    icon: "book",
    id: "reading",
    name: "Reading",
    order: 0,
    parentId: "research",
  },
  {
    createdAt: 3,
    icon: "folder",
    id: "media",
    name: "Media",
    order: 1,
    parentId: null,
  },
  {
    createdAt: 2,
    icon: "folder",
    id: "streaming",
    name: "Streaming",
    order: 0,
    parentId: "media",
  },
  {
    createdAt: 1,
    icon: "briefcase",
    id: "work",
    name: "Work",
    order: 2,
    parentId: null,
  },
]

describe("collection reorder model", () => {
  it("keeps vertical-only movement at the source depth", () => {
    expect(getCollectionDragDepth(15, 32)).toBe(0)
    expect(getCollectionDragDepth(-15, 32)).toBe(0)
  })

  it("changes depth only after crossing the horizontal threshold", () => {
    expect(getCollectionDragDepth(16, 32)).toBe(1)
    expect(getCollectionDragDepth(-16, 32)).toBe(-1)
  })

  it("projects a leaf under the preceding top-level collection", () => {
    const items = createFlatCollectionItems(collections)
    const withoutStreaming = items.filter((item) => item.id !== "streaming")
    const projection = getCollectionProjection(
      withoutStreaming,
      "work",
      1,
      false
    )

    expect(projection).toEqual({ depth: 1, parentId: "media" })
  })

  it("never turns a vertical reorder into nesting beside existing children", () => {
    const items = createFlatCollectionItems(collections)

    expect(getCollectionProjection(items, "media", 0, false)).toEqual({
      depth: 0,
      parentId: null,
    })
  })

  it("keeps a collection with children at the top level", () => {
    const items = createFlatCollectionItems(collections).filter(
      (item) => item.parentId !== "research"
    )

    expect(getCollectionProjection(items, "work", 1, true)).toEqual({
      depth: 0,
      parentId: null,
    })
  })

  it("warns only after a parent branch reaches a real nesting target", () => {
    expect(
      hasInvalidCollectionNestingIntent({
        hasNestingCandidate: true,
        horizontalOffset: 31,
        indentationWidth: 32,
        sourceHasChildren: true,
      })
    ).toBe(false)
    expect(
      hasInvalidCollectionNestingIntent({
        hasNestingCandidate: true,
        horizontalOffset: 32,
        indentationWidth: 32,
        sourceHasChildren: true,
      })
    ).toBe(true)
    expect(
      hasInvalidCollectionNestingIntent({
        hasNestingCandidate: false,
        horizontalOffset: 64,
        indentationWidth: 32,
        sourceHasChildren: true,
      })
    ).toBe(false)
    expect(
      hasInvalidCollectionNestingIntent({
        hasNestingCandidate: true,
        horizontalOffset: 64,
        indentationWidth: 32,
        sourceHasChildren: false,
      })
    ).toBe(false)
  })

  it("restores a moved parent's children directly after it", () => {
    const items = createFlatCollectionItems(collections)
    const children = items.filter((item) => item.parentId === "research")
    const movedRoots = [
      ...items.filter(
        (item) => item.id !== "research" && item.parentId !== "research"
      ),
      items.find((item) => item.id === "research")!,
    ]
    const normalized = normalizeFlatCollectionItems([
      ...movedRoots,
      ...children,
    ])

    expect(normalized.map((item) => item.id)).toEqual([
      "media",
      "streaming",
      "work",
      "research",
      "reading",
    ])
    expect(
      normalized.find((item) => item.id === "reading")?.collection.parentId
    ).toBe("research")
  })

  it("derives the final sibling index from the projected parent", () => {
    const items = createFlatCollectionItems(collections)

    expect(getCollectionSiblingIndex(items, "streaming", "media")).toBe(0)
    expect(getCollectionSiblingIndex(items, "work", null)).toBe(2)
  })
})
