import { LayoutGroup, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
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
import type { DashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"
import { useIsMobile } from "@/hooks/use-media-query"
import { sidebarRailTransition } from "@/lib/motion"

/**
 * Disposable dashboard shell wireframe. Not linked from product navigation.
 *
 * Slice 5: View mode (List / Grid / Grid with images) switchable from the
 * sidebar. Filter is still deferred — see spec/sessions/session-02.md.
 *
 * To remove this page entirely: delete src/routes/dashboard-ui.tsx and
 * src/dev/dashboard-ui/, then run the dev server or build once so
 * src/routeTree.gen.ts regenerates without the /dashboard-ui route.
 */
export function DashboardUiPage({
  initialNavigationPreferences,
}: {
  initialNavigationPreferences: DashboardNavigationPreferences
}): React.ReactElement {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)
  const [selectedBookmarkIds, setSelectedBookmarkIds] = React.useState<
    Set<string>
  >(() => new Set())
  const [sort, setSort] = React.useState<SortOption>("date")
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const isMobile = useIsMobile()
  const shouldReduceMotion = useReducedMotion()
  const effectiveViewMode = isMobile && viewMode === "grid" ? "list" : viewMode

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
    <div className="h-svh bg-background [padding-inline-start:env(safe-area-inset-left)] [padding-inline-end:env(safe-area-inset-right)] [padding-block-start:env(safe-area-inset-top)] [padding-block-end:env(safe-area-inset-bottom)] min-[800px]:p-0">
      <div className="flex h-full flex-col px-4 py-4 min-[800px]:px-6 min-[800px]:py-10">
        <LayoutGroup id="dashboard-sidebar">
          <SidebarProvider
            className="mx-auto min-h-0 w-full max-w-[896px] min-w-0 flex-1 min-[800px]:gap-6"
            onOpenChange={setSidebarOpen}
            open={sidebarOpen}
          >
            <DashboardSidebar
              initialDisclosures={initialNavigationPreferences.desktop}
              onSortChange={setSort}
              onViewModeChange={setViewMode}
              sort={sort}
              viewMode={viewMode}
            />

            <m.main
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background p-2 min-[800px]:rounded-2xl min-[800px]:border min-[800px]:border-border min-[800px]:bg-card"
              layout
              layoutDependency={sidebarOpen}
              transition={{
                layout: shouldReduceMotion
                  ? { duration: 0 }
                  : sidebarRailTransition,
              }}
            >
              <m.div
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                layout="position"
                layoutDependency={sidebarOpen}
                transition={{
                  layout: shouldReduceMotion
                    ? { duration: 0 }
                    : sidebarRailTransition,
                }}
              >
                <BookmarkControlsBar
                  onSortChange={setSort}
                  onViewModeChange={setViewMode}
                  mobileNavigationDisclosures={
                    initialNavigationPreferences.mobile
                  }
                  sort={sort}
                  viewMode={viewMode}
                />
                {/* The one scrolling region — navigation access stays put above it.
                The fade mask communicates overflow without reserving a
                scrollbar gutter, so content keeps one optical edge. */}
                <ScrollArea
                  className="min-h-0 flex-1"
                  fill
                  hideScrollbar
                  scrollFade
                >
                  <div className="min-[800px]:p-2">
                    {effectiveViewMode === "list" ? (
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
                        showImage={effectiveViewMode === "grid-image"}
                        sort={sort}
                      />
                    )}
                  </div>
                </ScrollArea>
              </m.div>
            </m.main>
          </SidebarProvider>
        </LayoutGroup>
      </div>
    </div>
  )
}
