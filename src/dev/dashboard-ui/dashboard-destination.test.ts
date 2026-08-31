import { describe, expect, it } from "vitest"

import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import {
  deriveDashboardDestination,
  getDashboardDestinationNavigation,
} from "@/dev/dashboard-ui/dashboard-destination"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import type { Tag } from "@/dev/dashboard-ui/tag-model"

const collections: Collection[] = [
  {
    createdAt: 2,
    icon: "folder",
    id: "parent",
    name: "Parent",
    order: 0,
    parentId: null,
  },
  {
    createdAt: 1,
    icon: "folder",
    id: "child",
    name: "Child",
    order: 0,
    parentId: "parent",
  },
]

const tags: Tag[] = [
  {
    color: { kind: "palette", value: "blue" },
    createdAt: 2,
    id: "design",
    name: "Design",
    order: 0,
  },
  {
    color: { kind: "palette", value: "green" },
    createdAt: 1,
    id: "research",
    name: "Research",
    order: 1,
  },
]

const bookmark = (
  id: string,
  fields: Partial<MockBookmark> = {}
): MockBookmark => ({
  createdAt: 1,
  domain: `${id}.example.com`,
  id,
  metadataStatus: "enriched",
  ogImage: null,
  title: id,
  visitCount: 0,
  ...fields,
})

const bookmarks: MockBookmark[] = [
  bookmark("parent-only", { collections: ["parent"] }),
  bookmark("child-only", { collections: ["child"] }),
  bookmark("design", { tags: ["design"] }),
  bookmark("research", { collections: ["parent"], tags: ["research"] }),
  bookmark("both-tags", { tags: ["design", "research"] }),
  bookmark("uncollected"),
  bookmark("trashed", { tags: ["design"], trashedAt: 1 }),
]

const derive = (
  destination: Parameters<typeof deriveDashboardDestination>[0]["destination"]
) => deriveDashboardDestination({ bookmarks, collections, destination, tags })

describe("dashboard destination", () => {
  it("shows every non-trashed bookmark in All bookmarks", () => {
    const view = derive({ kind: "all" })

    expect(view.bookmarks.map((item) => item.id)).toEqual([
      "parent-only",
      "child-only",
      "design",
      "research",
      "both-tags",
      "uncollected",
    ])
    expect(view.heading).toBe("All bookmarks")
    expect(view.sidebar.allBookmarks).toBe(true)
    expect(view.sortOptions).toEqual(["date", "visits", "alpha"])
  })

  it("keeps collection membership direct and enables collection rules", () => {
    const view = derive({ kind: "collection", collectionId: "parent" })

    expect(view.bookmarks.map((item) => item.id)).toEqual([
      "parent-only",
      "research",
    ])
    expect(view.bookmarks.some((item) => item.id === "child-only")).toBe(false)
    expect(view.canRemoveFromCurrentCollection).toBe(true)
    expect(view.canReorder).toBe(true)
    expect(view.emptyState.childCollections).toEqual([
      { id: "child", name: "Child" },
    ])
    expect(view.sidebar.collectionId).toBe("parent")
    expect(view.sortOptions).toEqual(["date", "visits", "alpha", "custom"])
  })

  it("matches any selected tag and excludes Trash", () => {
    const view = derive({
      kind: "tags",
      tagIds: ["research", "design"],
    })

    expect(view.bookmarks.map((item) => item.id)).toEqual([
      "design",
      "research",
      "both-tags",
    ])
    expect(view.heading).toBe("2 tags")
    expect(view.sidebar.tagIds).toEqual(new Set(["research", "design"]))
  })

  it("shows only non-trashed bookmarks without a collection", () => {
    const view = derive({ kind: "uncollected" })

    expect(view.bookmarks.map((item) => item.id)).toEqual([
      "design",
      "both-tags",
      "uncollected",
    ])
    expect(view.sidebar.uncollected).toBe(true)
    expect(view.canReorder).toBe(false)
  })

  it("keeps Trash out of every normal destination", () => {
    const trashView = derive({ kind: "trash" })

    expect(trashView.bookmarks.map((item) => item.id)).toEqual(["trashed"])
    expect(trashView.sidebar.trash).toBe(true)

    for (const destination of [
      { kind: "all" } as const,
      { kind: "collection", collectionId: "parent" } as const,
      { kind: "tags", tagIds: ["design"] } as const,
      { kind: "uncollected" } as const,
    ]) {
      expect(
        derive(destination).bookmarks.some((item) => item.id === "trashed")
      ).toBe(false)
    }
  })

  it("resets dashboard modes only when the destination changes", () => {
    expect(
      getDashboardDestinationNavigation(
        { kind: "tags", tagIds: ["design", "research"] },
        { kind: "tags", tagIds: ["research", "design", "design"] }
      )
    ).toMatchObject({
      clearSelection: false,
      destinationChanged: false,
      exitReorder: false,
    })

    expect(
      getDashboardDestinationNavigation(
        { kind: "collection", collectionId: "parent" },
        { kind: "all" }
      )
    ).toEqual({
      clearSelection: true,
      destinationChanged: true,
      exitReorder: true,
      sortOptions: ["date", "visits", "alpha"],
    })
  })
})
