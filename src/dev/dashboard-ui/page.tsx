import { LayoutGroup, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarProvider } from "@/components/ui/sidebar"
import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
import {
  createCollectionOrders,
  moveBookmarkId,
  orderBookmarksByIds,
} from "@/dev/dashboard-ui/bookmark-order"
import {
  BookmarkReorderArea,
  BookmarkReorderBar,
} from "@/dev/dashboard-ui/bookmark-reorder"
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

function useBookmarkWireframeState(): {
  actionHandlers: BookmarkActionHandlers
  bookmarks: MockBookmark[]
  selectedBookmarkIds: Set<string>
  setSelectedBookmarkIds: React.Dispatch<React.SetStateAction<Set<string>>>
} {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)
  const [selectedBookmarkIds, setSelectedBookmarkIds] = React.useState<
    Set<string>
  >(() => new Set())

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

  const actionHandlers: BookmarkActionHandlers = {
    onAddToCollection: (bookmarkId, collection) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: Array.from(
          new Set([...(bookmark.collections ?? []), collection])
        ),
      }))
    },
    onDelete: (bookmarkId) => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
      )
      setSelectedBookmarkIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)
        nextSelectedIds.delete(bookmarkId)
        return nextSelectedIds
      })
    },
    onMoveToCollection: (bookmarkId, collection) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: [collection],
      }))
    },
    onReenrich: (bookmarkId) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        metadataStatus: "pending",
      }))
    },
    onSelectChange: (bookmarkId, selected) => {
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
    onTagsChange: (bookmarkId, tags) => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, tags }))
    },
    onTitleChange: (bookmarkId, title) => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, title }))
    },
  }

  return {
    actionHandlers,
    bookmarks,
    selectedBookmarkIds,
    setSelectedBookmarkIds,
  }
}

/**
 * Disposable dashboard shell wireframe. Not linked from product navigation.
 *
 * Slice 6: Collection-scoped reorder mode across the existing list and grid
 * views. Filter is still deferred — see spec/sessions/session-02.md.
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
  const {
    actionHandlers,
    bookmarks,
    selectedBookmarkIds,
    setSelectedBookmarkIds,
  } = useBookmarkWireframeState()
  const [sort, setSort] = React.useState<SortOption>("date")
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")
  const [activeCollection, setActiveCollection] = React.useState<string | null>(
    "Research"
  )
  const [collectionOrders, setCollectionOrders] = React.useState<
    Record<string, string[]>
  >(() => createCollectionOrders(mockBookmarks))
  const [isReordering, setIsReordering] = React.useState(false)
  const isDraggingRef = React.useRef(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const isMobile = useIsMobile()
  const shouldReduceMotion = useReducedMotion()
  const effectiveViewMode = isMobile && viewMode === "grid" ? "list" : viewMode
  const scopedBookmarks = React.useMemo(
    () =>
      activeCollection
        ? bookmarks.filter((bookmark) =>
            bookmark.collections?.includes(activeCollection)
          )
        : bookmarks,
    [activeCollection, bookmarks]
  )
  const visibleBookmarks = React.useMemo(() => {
    if (!(activeCollection && sort === "custom")) return scopedBookmarks

    return orderBookmarksByIds(
      scopedBookmarks,
      collectionOrders[activeCollection] ??
        scopedBookmarks.map((bookmark) => bookmark.id)
    )
  }, [activeCollection, collectionOrders, scopedBookmarks, sort])
  const canReorder = activeCollection !== null && scopedBookmarks.length >= 2

  const focusDisplayTrigger = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          isMobile
            ? "[aria-label='Open navigation']"
            : "[data-dashboard-display-trigger]"
        )
        ?.focus()
    })
  }

  const exitReorderMode = (restoreFocus: boolean): void => {
    isDraggingRef.current = false
    setIsReordering(false)
    if (restoreFocus) focusDisplayTrigger()
  }

  const handleSelectAllBookmarks = (): void => {
    setActiveCollection(null)
    setSelectedBookmarkIds(new Set())
    if (sort === "custom") setSort("date")
  }

  const handleSelectCollection = (collection: string): void => {
    setActiveCollection(collection)
    setSelectedBookmarkIds(new Set())
  }

  const handleNavigation = (): void => {
    if (isReordering) exitReorderMode(false)
  }

  const handleSortChange = (nextSort: SortOption): void => {
    if (!isReordering) setSort(nextSort)
  }

  const handleViewModeChange = (nextViewMode: ViewMode): void => {
    if (!isReordering) setViewMode(nextViewMode)
  }

  const handleStartReorder = (): void => {
    if (!(activeCollection && canReorder)) return

    setSort("custom")
    setSelectedBookmarkIds(new Set())
    setIsReordering(true)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-reorder-handle]")?.focus()
    })
  }

  const handleMove = (fromIndex: number, toIndex: number): void => {
    if (!activeCollection) return

    const visibleIds = visibleBookmarks.map((bookmark) => bookmark.id)
    setCollectionOrders((currentOrders) => ({
      ...currentOrders,
      [activeCollection]: moveBookmarkId(visibleIds, fromIndex, toIndex),
    }))
  }

  const bookmarkView =
    effectiveViewMode === "list" ? (
      <BookmarkList
        {...actionHandlers}
        bookmarks={visibleBookmarks}
        isReordering={isReordering}
        selectedBookmarkIds={selectedBookmarkIds}
        sort={sort}
      />
    ) : (
      <BookmarkGrid
        {...actionHandlers}
        bookmarks={visibleBookmarks}
        isReordering={isReordering}
        selectedBookmarkIds={selectedBookmarkIds}
        showImage={effectiveViewMode === "grid-image"}
        sort={sort}
      />
    )

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
              activeCollection={activeCollection}
              canReorder={canReorder}
              initialDisclosures={initialNavigationPreferences.desktop}
              isReordering={isReordering}
              onNavigate={handleNavigation}
              onSelectAllBookmarks={handleSelectAllBookmarks}
              onSelectCollection={handleSelectCollection}
              onSortChange={handleSortChange}
              onStartReorder={handleStartReorder}
              onViewModeChange={handleViewModeChange}
              sort={sort}
              viewMode={viewMode}
            />

            <m.main
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background p-2 min-[800px]:rounded-2xl min-[800px]:border min-[800px]:border-border min-[800px]:bg-card"
              layout
              layoutDependency={sidebarOpen}
              onKeyDownCapture={(event) => {
                if (
                  event.key !== "Escape" ||
                  !isReordering ||
                  isDraggingRef.current
                ) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()
                exitReorderMode(true)
              }}
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
                  activeCollection={activeCollection}
                  canReorder={canReorder}
                  isReordering={isReordering}
                  mobileNavigationDisclosures={
                    initialNavigationPreferences.mobile
                  }
                  onNavigate={handleNavigation}
                  onSelectAllBookmarks={handleSelectAllBookmarks}
                  onSelectCollection={handleSelectCollection}
                  onSortChange={handleSortChange}
                  onStartReorder={handleStartReorder}
                  onViewModeChange={handleViewModeChange}
                  sort={sort}
                  viewMode={viewMode}
                />
                {isReordering && activeCollection ? (
                  <BookmarkReorderBar
                    collection={activeCollection}
                    onDone={() => exitReorderMode(true)}
                  />
                ) : null}
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
                    {isReordering ? (
                      <BookmarkReorderArea
                        onDraggingChange={(dragging) => {
                          isDraggingRef.current = dragging
                        }}
                        onMove={handleMove}
                      >
                        {bookmarkView}
                      </BookmarkReorderArea>
                    ) : (
                      bookmarkView
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
