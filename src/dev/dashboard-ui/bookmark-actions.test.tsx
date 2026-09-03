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
    onDeleteForever: vi.fn<(bookmarkId: string) => void>(),
    onMoveToCollection:
      vi.fn<(bookmarkId: string, collection: string) => void>(),
    onReenrich: vi.fn<(bookmarkId: string) => void>(),
    onRestore: vi.fn<(bookmarkId: string) => void>(),
    onSelectChange: vi.fn<(bookmarkId: string, selected: boolean) => void>(),
    onTagsChange: vi.fn<(bookmarkId: string, tags: string[]) => void>(),
    onTitleChange: vi.fn<(bookmarkId: string, title: string) => void>(),
  }
}

describe("bookmark actions", () => {
  it("keeps library and Trash overflow triggers visible for keyboard focus", () => {
    const handlers = createActionHandlers()
    const trashBookmark = mockBookmarks.find(
      (bookmark) => bookmark.trashedAt !== undefined
    )
    if (!trashBookmark) throw new Error("Trash fixture did not load.")

    for (const bookmark of [mockBookmarks[0], trashBookmark]) {
      if (!bookmark) throw new Error("Bookmark fixture did not load.")
      const view = render(
        <BookmarkActions
          {...handlers}
          availableTags={mockTags}
          bookmark={bookmark}
          collections={mockCollections}
          isSelected={false}
        />
      )
      const trigger = screen.getByRole("button", {
        name: `Actions for ${bookmark.title}`,
      })

      expect(trigger.classList.contains("size-7")).toBe(true)
      expect(trigger.classList.contains("sm:size-6")).toBe(true)
      expect(trigger.classList.contains("rounded-md")).toBe(true)
      expect(trigger.querySelector("svg")?.getAttribute("class")).toContain(
        "size-4"
      )
      expect(trigger.className).toContain(
        "group-has-focus-visible/bookmark:opacity-100"
      )
      expect(trigger.className).not.toContain(
        "group-focus-within/bookmark:opacity-100"
      )
      view.unmount()
    }
  })

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

  it("shows only recovery actions for a trashed bookmark", () => {
    const bookmark = mockBookmarks.find((item) => item.id === "trash-1")
    if (!bookmark) throw new Error("Trash fixture did not load.")
    const handlers = createActionHandlers()

    const view = render(
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
    expect(screen.getByRole("button", { name: "Restore" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Select" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Tags" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Restore" }))
    expect(handlers.onRestore).toHaveBeenCalledWith(bookmark.id)

    view.unmount()
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
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }))
    expect(
      screen.getByRole("heading", { name: "Delete bookmark forever?" })
    ).not.toBeNull()
    expect(screen.getByText(/This cannot be undone/)).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }))
    expect(handlers.onDeleteForever).toHaveBeenCalledWith(bookmark.id)
  })
})
