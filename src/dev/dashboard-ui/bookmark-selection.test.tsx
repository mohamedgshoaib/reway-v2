import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
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
    ["grid", true],
  ] as const)("exposes the selected state in %s view", (_view, showImage) => {
    const bookmark = mockBookmarks[0]
    const props = {
      ...createActionHandlers(),
      bookmarks: [bookmark],
      collections: mockCollections,
      selectedBookmarkIds: new Set([bookmark.id]),
      sort: "custom" as const,
    }

    render(
      showImage ? (
        <BookmarkGrid {...props} showImage />
      ) : (
        <BookmarkList {...props} />
      )
    )

    expect(screen.getByText("Selected")).not.toBeNull()
    expect(
      screen.getByRole("button", {
        name: `Actions for ${bookmark.title}, selected`,
      })
    ).not.toBeNull()
  })
})
