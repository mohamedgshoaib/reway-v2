import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
import {
  BookmarkReorderArea,
  BookmarkReorderBar,
} from "@/dev/dashboard-ui/bookmark-reorder"
import { bookmarkReorderSurfaceClassName } from "@/dev/dashboard-ui/bookmark-reorder-surface"
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

describe("bookmark reorder mode", () => {
  it("keeps the promoted drag surface opaque", () => {
    const dragClassName = bookmarkReorderSurfaceClassName(true)

    expect(dragClassName).toContain("bg-background")
    expect(dragClassName).toContain("min-[800px]:bg-card")
  })

  it("shows the active collection and exits through Done", () => {
    const onDone = vi.fn<() => void>()

    render(<BookmarkReorderBar collection="Research" onDone={onDone} />)

    expect(screen.getByText("Reordering")).not.toBeNull()
    expect(screen.getByText("Research")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it("replaces row actions with dedicated move handles", () => {
    render(
      <BookmarkReorderArea
        onDraggingChange={vi.fn<(dragging: boolean) => void>()}
        onMove={vi.fn<(fromIndex: number, toIndex: number) => void>()}
      >
        <BookmarkList
          {...createActionHandlers()}
          bookmarks={mockBookmarks.slice(0, 2)}
          collections={mockCollections}
          isReordering
          selectedBookmarkIds={new Set()}
          sort="custom"
        />
      </BookmarkReorderArea>
    )

    expect(
      screen.getByRole("button", {
        name: `Move ${mockBookmarks[0].title}`,
      })
    ).not.toBeNull()
    expect(
      screen.getByRole("button", {
        name: `Move ${mockBookmarks[1].title}`,
      })
    ).not.toBeNull()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("list", { name: "Bookmarks" })).not.toBeNull()
    expect(
      screen.queryByRole("button", { name: "Bookmark actions" })
    ).toBeNull()
  })

  it("uses list semantics for grid reordering", () => {
    render(
      <BookmarkReorderArea
        onDraggingChange={vi.fn<(dragging: boolean) => void>()}
        onMove={vi.fn<(fromIndex: number, toIndex: number) => void>()}
      >
        <BookmarkGrid
          {...createActionHandlers()}
          bookmarks={mockBookmarks.slice(0, 2)}
          collections={mockCollections}
          isReordering
          selectedBookmarkIds={new Set()}
          showImage={false}
          sort="custom"
        />
      </BookmarkReorderArea>
    )

    expect(screen.getByRole("list", { name: "Bookmarks" })).not.toBeNull()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })
})
