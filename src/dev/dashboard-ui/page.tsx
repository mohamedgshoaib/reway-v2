import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarProvider } from "@/components/ui/sidebar"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
import { BookmarkControlsBar } from "@/dev/dashboard-ui/controls-bar"
import {
  mockBookmarks,
  type MockBookmark,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"

/**
 * Disposable dashboard shell wireframe. Not linked from product navigation.
 *
 * Slice 5: View mode (List / Grid / Grid with images) switchable from the
 * controls bar. Filter is still deferred — see spec/sessions/session-02.md.
 *
 * To remove this page entirely: delete src/routes/dashboard-ui.tsx and
 * src/dev/dashboard-ui/, then run the dev server or build once so
 * src/routeTree.gen.ts regenerates without the /dashboard-ui route.
 */
export function DashboardUiPage(): React.ReactElement {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)
  const [selectedBookmarkIds, setSelectedBookmarkIds] = React.useState<
    Set<string>
  >(() => new Set())
  const [sort, setSort] = React.useState<SortOption>("date")
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")

  const updateBookmark = (
    bookmarkId: string,
    update: (bookmark: MockBookmark) => MockBookmark
  ): void => {
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map((bookmark) =>
        bookmark.id === bookmarkId ? update(bookmark) : bookmark
      )
    )
  }

  const actionHandlers = {
    onAddToCollection: (bookmarkId: string, collection: string): void => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: Array.from(
          new Set([...(bookmark.collections ?? []), collection])
        ),
      }))
    },
    onDelete: (bookmarkId: string): void => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
      )
      setSelectedBookmarkIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)
        nextSelectedIds.delete(bookmarkId)
        return nextSelectedIds
      })
    },
    onMoveToCollection: (bookmarkId: string, collection: string): void => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: [collection],
      }))
    },
    onReenrich: (bookmarkId: string): void => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        metadataStatus: "pending",
      }))
    },
    onSelectChange: (bookmarkId: string, selected: boolean): void => {
      setSelectedBookmarkIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)

        if (selected) {
          nextSelectedIds.add(bookmarkId)
        } else {
          nextSelectedIds.delete(bookmarkId)
        }

        return nextSelectedIds
      })
    },
    onTagsChange: (bookmarkId: string, tags: string[]): void => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, tags }))
    },
    onTitleChange: (bookmarkId: string, title: string): void => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, title }))
    },
  }

  return (
    // h-svh (fixed, not min-h-svh) gives this column a real, bounded
    // height — a min-height-only parent never gives flex-1 children
    // anything definite to fill, so they just grow with their content
    // instead of clipping. min-h-0 at every level below overrides
    // flexbox's default min-height:auto (which refuses to shrink a flex
    // item below its content size), letting the chain actually reach the
    // scroll region instead of pushing the whole page taller.
    <div className="flex h-svh flex-col bg-background px-6 py-10">
      <SidebarProvider
        className="mx-auto min-h-0 w-full max-w-[896px] flex-1 gap-6"
        defaultOpen
      >
        <DashboardSidebar />

        <main className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-2">
          <BookmarkControlsBar
            onSortChange={setSort}
            onViewModeChange={setViewMode}
            sort={sort}
            viewMode={viewMode}
          />
          {/* The one scrolling region — controls bar stays put above it.
              Same ScrollArea + fill + scrollFade + scrollbarGutter
              pattern as SidebarContent, so both panels scroll
              consistently and reserve real space for the thumb instead
              of letting it overlay content. */}
          <ScrollArea
            className="min-h-0 flex-1"
            fill
            scrollbarGutter
            scrollFade
          >
            {/* p-2 matches SidebarGroup's own padding — without it,
                content sits flush against the scroll viewport's edge
                instead of getting a gutter before the scrollbar thumb,
                unlike the sidebar where SidebarGroup's p-2 already
                provides that space inside its ScrollArea. */}
            <div className="p-2">
              {viewMode === "list" ? (
                <BookmarkList
                  {...actionHandlers}
                  bookmarks={bookmarks}
                  selectedBookmarkIds={selectedBookmarkIds}
                  sort={sort}
                />
              ) : (
                <BookmarkGrid
                  {...actionHandlers}
                  bookmarks={bookmarks}
                  selectedBookmarkIds={selectedBookmarkIds}
                  showImage={viewMode === "grid-image"}
                  sort={sort}
                />
              )}
            </div>
          </ScrollArea>
        </main>
      </SidebarProvider>
    </div>
  )
}
