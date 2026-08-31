import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
import type { BookmarkSelectionChangeHandler } from "@/dev/dashboard-ui/bookmark-selection-control"
import {
  mockBookmarks,
  mockCollections,
} from "@/dev/dashboard-ui/mock-bookmarks"

afterEach(cleanup)

function createActionHandlers(): BookmarkActionHandlers {
  return {
    onAddToCollection:
      vi.fn<(bookmarkId: string, collection: string) => void>(),
    onDelete: vi.fn<(bookmarkId: string) => void>(),
    onMoveToCollection:
      vi.fn<(bookmarkId: string, collection: string) => void>(),
    onReenrich: vi.fn<(bookmarkId: string) => void>(),
    onSelectChange: vi.fn<(bookmarkId: string, selected: boolean) => void>(),
    onTagsChange: vi.fn<(bookmarkId: string, tags: string[]) => void>(),
    onTitleChange: vi.fn<(bookmarkId: string, title: string) => void>(),
  }
}

describe("bookmark selection", () => {
  it.each([
    ["list", false],
    ["compact grid", false],
    ["image grid", true],
  ] as const)(
    "makes the full %s surface a link without showing a selection checkbox",
    (view, showImage) => {
      const bookmark = mockBookmarks[0]
      const onDirectSelectionChange = vi.fn<BookmarkSelectionChangeHandler>()
      const props = {
        ...createActionHandlers(),
        bookmarks: [bookmark],
        collections: mockCollections,
        onDirectSelectionChange,
        selectedBookmarkIds: new Set<string>(),
        sort: "custom" as const,
      }

      render(
        view === "list" ? (
          <BookmarkList {...props} />
        ) : (
          <BookmarkGrid {...props} showImage={showImage} />
        )
      )

      expect(screen.getByRole("link", { name: bookmark.title })).not.toBeNull()
      expect(
        screen.queryByRole("checkbox", { name: `Select ${bookmark.title}` })
      ).toBeNull()
      expect(
        screen.getByRole("button", {
          name: `Actions for ${bookmark.title}`,
        })
      ).not.toBeNull()
    }
  )

  it.each([
    ["list", false],
    ["compact grid", false],
    ["image grid", true],
  ] as const)(
    "turns the full %s item into one checkbox label in selection mode",
    (view, showImage) => {
      const bookmark = mockBookmarks[0]
      const onDirectSelectionChange = vi.fn<BookmarkSelectionChangeHandler>()
      const props = {
        ...createActionHandlers(),
        bookmarks: [bookmark],
        collections: mockCollections,
        onDirectSelectionChange,
        selectedBookmarkIds: new Set([bookmark.id]),
        selectionMode: true,
        sort: "custom" as const,
      }

      render(
        view === "list" ? (
          <BookmarkList {...props} />
        ) : (
          <BookmarkGrid {...props} showImage={showImage} />
        )
      )

      const checkbox = screen.getByRole("checkbox", { name: bookmark.title })
      expect(checkbox.getAttribute("aria-checked")).toBe("true")
      expect(screen.queryByRole("link")).toBeNull()
      expect(
        screen.queryByRole("button", {
          name: `Actions for ${bookmark.title}, selected`,
        })
      ).toBeNull()
      expect(
        fireEvent.mouseDown(checkbox.closest("label") as HTMLLabelElement, {
          shiftKey: true,
        })
      ).toBe(false)

      fireEvent.keyDown(checkbox, { key: " ", shiftKey: true })
      fireEvent.keyUp(checkbox, { key: " ", shiftKey: true })

      expect(onDirectSelectionChange).toHaveBeenCalledWith(
        bookmark.id,
        false,
        true,
        [bookmark.id]
      )
    }
  )
})
