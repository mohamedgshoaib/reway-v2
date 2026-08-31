import { describe, expect, it } from "vitest"

import {
  applyBookmarkBulkAction,
  createBookmarkSelectionState,
  deriveBookmarkBulkDestinationAvailability,
  deriveBookmarkSelection,
  getBookmarkBulkDestinationDisabledReason,
  reduceBookmarkSelection,
  type BookmarkSelectionEvent,
  type BookmarkSelectionState,
} from "@/dev/dashboard-ui/bookmark-selection"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

const reduce = (
  state: BookmarkSelectionState,
  ...events: BookmarkSelectionEvent[]
): BookmarkSelectionState => events.reduce(reduceBookmarkSelection, state)

const bookmark = (id: string, collections: string[] = []): MockBookmark => ({
  collections,
  createdAt: 1,
  domain: `${id}.example.com`,
  id,
  metadataStatus: "enriched",
  ogImage: null,
  title: id,
  visitCount: 0,
})

describe("bookmark selection model", () => {
  it("enters visibly with zero selected and keeps the mode open at zero", () => {
    const state = reduce(
      createBookmarkSelectionState("all"),
      { type: "enter" },
      {
        bookmarkId: "a",
        checked: true,
        extendRange: false,
        type: "toggle",
        visibleIds: ["a"],
      },
      {
        bookmarkId: "a",
        checked: false,
        extendRange: false,
        type: "toggle",
        visibleIds: ["a"],
      }
    )

    expect(state.mode).toBe("selecting")
    expect(state.selectedIds).toEqual(new Set())
    expect(state.anchorId).toBe("a")
  })

  it("selects a continuous range and preserves the direct anchor", () => {
    const state = reduce(
      createBookmarkSelectionState("all"),
      {
        bookmarkId: "b",
        checked: true,
        extendRange: false,
        type: "toggle",
        visibleIds: ["a", "b", "c", "d"],
      },
      {
        bookmarkId: "d",
        checked: true,
        extendRange: true,
        type: "toggle",
        visibleIds: ["a", "b", "c", "d"],
      }
    )

    expect(state.selectedIds).toEqual(new Set(["b", "c", "d"]))
    expect(state.anchorId).toBe("b")
  })

  it("selects and clears only the current visible result", () => {
    const selected = reduce(createBookmarkSelectionState("collection:a"), {
      type: "toggle-all",
      visibleIds: ["a", "b"],
    })
    const cleared = reduce(selected, {
      type: "toggle-all",
      visibleIds: ["a", "b"],
    })

    expect(selected.selectedIds).toEqual(new Set(["a", "b"]))
    expect(cleared.selectedIds).toEqual(new Set())
  })

  it("preserves selection across view changes and resets the range anchor on sort", () => {
    const selected = reduce(
      createBookmarkSelectionState("all"),
      {
        bookmarkId: "a",
        checked: true,
        extendRange: false,
        type: "toggle",
        visibleIds: ["a", "b"],
      },
      { type: "sort-changed" }
    )

    expect(selected.selectedIds).toEqual(new Set(["a"]))
    expect(selected.anchorId).toBeNull()
  })

  it("clears selection and exits when the destination changes", () => {
    const selected = reduce(
      createBookmarkSelectionState("all"),
      { bookmarkId: "a", type: "enter" },
      { destinationKey: "collection:research", type: "destination-changed" }
    )

    expect(selected).toEqual(
      createBookmarkSelectionState("collection:research")
    )
  })

  it("counts only selected bookmarks still visible", () => {
    const state = {
      ...createBookmarkSelectionState("all"),
      mode: "selecting" as const,
      selectedIds: new Set(["a", "missing"]),
    }

    expect(deriveBookmarkSelection(state, ["a", "b"])).toEqual({
      allVisibleSelected: false,
      selectedCount: 1,
      selectedIds: new Set(["a"]),
    })
  })

  it("keeps one stable mutation snapshot through failure and retry", () => {
    const pending = reduce(createBookmarkSelectionState("all"), {
      action: { collectionId: "research", kind: "add" },
      selectedIds: ["a", "b"],
      type: "mutation-started",
    })
    const failed = reduce(
      pending,
      { type: "mutation-progress-shown" },
      { type: "mutation-failed" }
    )
    const retried = reduce(failed, { type: "mutation-retried" })

    expect(failed.mutation).toEqual({
      action: { collectionId: "research", kind: "add" },
      selectedIds: ["a", "b"],
      status: "failed",
    })
    expect(retried.mutation).toEqual({
      action: { collectionId: "research", kind: "add" },
      selectedIds: ["a", "b"],
      showProgress: false,
      status: "pending",
    })
  })
})

describe("bookmark bulk actions", () => {
  const bookmarks = [
    bookmark("a", ["research"]),
    bookmark("b", ["design"]),
    bookmark("c"),
  ]
  const selectedIds = new Set(["a", "b"])

  it("adds only missing memberships", () => {
    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      { collectionId: "research", kind: "add" },
      10
    )

    expect(result.affectedCount).toBe(1)
    expect(result.bookmarks[0]?.collections).toEqual(["research"])
    expect(result.bookmarks[1]?.collections).toEqual(["design", "research"])
  })

  it("moves by replacing every collection membership", () => {
    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      { collectionId: "research", kind: "move" },
      10
    )

    expect(result.affectedCount).toBe(1)
    expect(result.bookmarks[0]?.collections).toEqual(["research"])
    expect(result.bookmarks[1]?.collections).toEqual(["research"])
  })

  it("removes only the active collection membership", () => {
    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      { collectionId: "research", kind: "remove" },
      10
    )

    expect(result.affectedCount).toBe(1)
    expect(result.bookmarks[0]?.collections).toEqual([])
    expect(result.bookmarks[1]?.collections).toEqual(["design"])
  })

  it("moves selected bookmarks to Trash without removing them", () => {
    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      { kind: "delete" },
      10
    )

    expect(result.affectedCount).toBe(2)
    expect(result.bookmarks).toHaveLength(3)
    expect(result.bookmarks[0]?.trashedAt).toBe(10)
    expect(result.bookmarks[1]?.trashedAt).toBe(10)
  })

  it("explains only destinations that would change none of the selection", () => {
    expect(
      getBookmarkBulkDestinationDisabledReason(bookmarks, new Set(["a"]), {
        collectionId: "research",
        kind: "add",
      })
    ).toBe("Already in this collection.")
    expect(
      getBookmarkBulkDestinationDisabledReason(bookmarks, selectedIds, {
        collectionId: "research",
        kind: "add",
      })
    ).toBeNull()

    expect(
      deriveBookmarkBulkDestinationAvailability(bookmarks, selectedIds, [
        "research",
        "design",
      ])
    ).toEqual(
      new Map([
        ["research", { addDisabledReason: null, moveDisabledReason: null }],
        ["design", { addDisabledReason: null, moveDisabledReason: null }],
      ])
    )
  })
})
