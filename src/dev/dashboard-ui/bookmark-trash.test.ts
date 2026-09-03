import { describe, expect, it } from "vitest"

import {
  applyBookmarkTrashAction,
  getBookmarkRestoreSummary,
  getBookmarkTrashRecovery,
  getBookmarkTrashOrigin,
} from "@/dev/dashboard-ui/bookmark-trash"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 1, 9)
const collections: Collection[] = [
  {
    createdAt: NOW,
    icon: "research",
    id: "research",
    name: "Research",
    order: 0,
    parentId: null,
  },
  {
    createdAt: NOW,
    icon: "bookmark",
    id: "reading-list",
    name: "Reading list",
    order: 1,
    parentId: null,
  },
  {
    createdAt: NOW,
    icon: "paintbrush",
    id: "design-references",
    name: "Design references",
    order: 2,
    parentId: null,
  },
]

function bookmark(
  id: string,
  overrides: Partial<MockBookmark> = {}
): MockBookmark {
  return {
    createdAt: NOW,
    domain: `${id}.example`,
    id,
    metadataStatus: "enriched",
    ogImage: null,
    title: id,
    visitCount: 0,
    ...overrides,
  }
}

describe("bookmark Trash", () => {
  it("derives stable recovery labels from the supplied clock", () => {
    expect(
      getBookmarkTrashRecovery(
        bookmark("recent", { trashedAt: NOW - DAY_IN_MILLISECONDS }),
        NOW
      )
    ).toEqual({ daysRemaining: 29, label: "29 days left" })
    expect(
      getBookmarkTrashRecovery(
        bookmark("last-day", { trashedAt: NOW - 29 * DAY_IN_MILLISECONDS }),
        NOW
      )
    ).toEqual({ daysRemaining: 1, label: "1 day left" })
    expect(
      getBookmarkTrashRecovery(
        bookmark("expired", { trashedAt: NOW - 30 * DAY_IN_MILLISECONDS }),
        NOW
      )
    ).toEqual({ daysRemaining: 0, label: "Deletes today" })
  })

  it("returns null for a bookmark outside Trash", () => {
    expect(getBookmarkTrashRecovery(bookmark("active"), NOW)).toBeNull()
  })

  it("restores selected trashed bookmarks to their prior collections", () => {
    const bookmarks = [
      bookmark("restore", {
        collections: ["research"],
        tags: ["design"],
        trashedAt: NOW,
      }),
      bookmark("keep", { trashedAt: NOW }),
    ]

    const result = applyBookmarkTrashAction(bookmarks, new Set(["restore"]), {
      kind: "restore",
    })

    expect(result.affectedCount).toBe(1)
    expect(result.bookmarks[0]).toMatchObject({
      collections: ["research"],
      id: "restore",
      tags: ["design"],
    })
    expect(result.bookmarks[0]).not.toHaveProperty("trashedAt")
    expect(result.bookmarks[1]).toBe(bookmarks[1])
  })

  it("describes prior collection context without treating missing collections as valid", () => {
    expect(
      getBookmarkTrashOrigin(
        bookmark("one", { collections: ["research"] }),
        collections
      )
    ).toEqual({ collectionNames: ["Research"], label: "From Research" })
    expect(
      getBookmarkTrashOrigin(
        bookmark("many", {
          collections: ["research", "reading-list", "missing"],
        }),
        collections
      )
    ).toEqual({
      collectionNames: ["Research", "Reading list"],
      label: "From Research + 1",
    })
    expect(getBookmarkTrashOrigin(bookmark("none"), collections)).toEqual({
      collectionNames: [],
      label: "From Uncollected",
    })
  })

  it("names exact single and shared restore destinations", () => {
    expect(
      getBookmarkRestoreSummary(
        [bookmark("one", { collections: ["research"] })],
        collections
      )
    ).toEqual({ title: "Restored to Research" })
    expect(
      getBookmarkRestoreSummary(
        [
          bookmark("first", { collections: ["research"] }),
          bookmark("second", { collections: ["research"] }),
        ],
        collections
      )
    ).toEqual({ title: "Restored 2 bookmarks to Research" })
    expect(
      getBookmarkRestoreSummary(
        [
          bookmark("first", {
            collections: ["research", "reading-list", "design-references"],
          }),
        ],
        collections
      )
    ).toEqual({
      description: "Research, Reading list, and 1 more.",
      title: "Restored to 3 collections",
    })
  })

  it("summarizes mixed restore destinations and the Uncollected fallback", () => {
    expect(
      getBookmarkRestoreSummary(
        [
          bookmark("research", { collections: ["research"] }),
          bookmark("uncollected"),
        ],
        collections
      )
    ).toEqual({
      description: "Returned to their previous collections or Uncollected.",
      title: "Restored 2 bookmarks",
    })
    expect(
      getBookmarkRestoreSummary([bookmark("missing")], collections)
    ).toEqual({ title: "Restored to Uncollected" })
  })

  it("permanently removes only selected trashed bookmarks", () => {
    const bookmarks = [
      bookmark("delete", { trashedAt: NOW }),
      bookmark("keep-trashed", { trashedAt: NOW }),
      bookmark("keep-active"),
    ]

    const result = applyBookmarkTrashAction(
      bookmarks,
      new Set(["delete", "keep-active"]),
      { kind: "delete-forever" }
    )

    expect(result.affectedCount).toBe(1)
    expect(result.bookmarks.map((item) => item.id)).toEqual([
      "keep-trashed",
      "keep-active",
    ])
  })
})
