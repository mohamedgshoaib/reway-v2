import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkActions } from "@/dev/dashboard-ui/bookmark-actions"
import {
  mockBookmarks,
  mockCollections,
  mockTags,
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

describe("bookmark actions", () => {
  it("keeps the edit dialog open and explains a blank title", () => {
    const bookmark = mockBookmarks[0]
    const handlers = createActionHandlers()

    render(
      <BookmarkActions
        {...handlers}
        availableTags={mockTags}
        bookmark={bookmark}
        collections={mockCollections}
        isSelected={false}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: `Actions for ${bookmark.title}` })
    )
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    const titleInput = screen.getByRole("textbox", { name: "Title" })
    fireEvent.change(titleInput, { target: { value: " " } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(screen.getByText("Enter a title.")).not.toBeNull()
    expect(titleInput.getAttribute("aria-invalid")).toBe("true")
    expect(document.activeElement).toBe(titleInput)
    expect(handlers.onTitleChange).not.toHaveBeenCalled()
  })
})
