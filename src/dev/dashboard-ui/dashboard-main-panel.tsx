import * as m from "motion/react-m"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkGrid } from "@/dev/dashboard-ui/bookmark-grid"
import { BookmarkList } from "@/dev/dashboard-ui/bookmark-list"
import {
  BookmarkReorderArea,
  BookmarkReorderBar,
} from "@/dev/dashboard-ui/bookmark-reorder"
import type { BookmarkSelectionChangeHandler } from "@/dev/dashboard-ui/bookmark-selection-control"
import { BookmarkSelectionBars } from "@/dev/dashboard-ui/bookmark-selection-controls"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import { BookmarkControlsBar } from "@/dev/dashboard-ui/controls-bar"
import type { DashboardDestinationEmptyState } from "@/dev/dashboard-ui/dashboard-destination"
import type {
  MockBookmark,
  SortOption,
  ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { TagFilterSummary } from "@/dev/dashboard-ui/tag-filter-summary"
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { sidebarRailTransition } from "@/lib/motion"

export function DashboardMainPanel({
  actionHandlers,
  activeCollectionName,
  activeTags,
  collections,
  controlsProps,
  emptyState,
  effectiveViewMode,
  isDraggingRef,
  isReordering,
  onDirectSelectionChange,
  onExitReorder,
  onExitSelection,
  onMove,
  onClearTagFilters,
  onRemoveTagFilter,
  onSelectCollection,
  selectedBookmarkIds,
  selectionAnnouncement,
  tagFilterAnnouncement,
  selectionBarsProps,
  selectionMode,
  shouldReduceMotion,
  sidebarOpen,
  sort,
  tags,
  visibleBookmarks,
}: {
  actionHandlers: BookmarkActionHandlers
  activeCollectionName: string | null
  activeTags: readonly Tag[]
  collections: readonly Collection[]
  controlsProps: React.ComponentProps<typeof BookmarkControlsBar>
  emptyState: DashboardDestinationEmptyState
  effectiveViewMode: ViewMode
  isDraggingRef: React.RefObject<boolean>
  isReordering: boolean
  onDirectSelectionChange: BookmarkSelectionChangeHandler
  onExitReorder: (restoreFocus: boolean) => void
  onExitSelection: () => void
  onMove: (fromIndex: number, toIndex: number) => void
  onClearTagFilters: () => void
  onRemoveTagFilter: (tagId: string) => void
  onSelectCollection: (collectionId: string) => void
  selectedBookmarkIds: ReadonlySet<string>
  selectionAnnouncement: string
  tagFilterAnnouncement: string
  selectionBarsProps: React.ComponentProps<typeof BookmarkSelectionBars>
  selectionMode: boolean
  shouldReduceMotion: boolean | null
  sidebarOpen: boolean
  sort: SortOption
  tags: readonly Tag[]
  visibleBookmarks: MockBookmark[]
}): React.ReactElement {
  const bookmarkView =
    effectiveViewMode === "list" ? (
      <BookmarkList
        {...actionHandlers}
        bookmarks={visibleBookmarks}
        collections={collections}
        isReordering={isReordering}
        onDirectSelectionChange={onDirectSelectionChange}
        selectedBookmarkIds={selectedBookmarkIds}
        selectionMode={selectionMode}
        sort={sort}
        tags={tags}
      />
    ) : (
      <BookmarkGrid
        {...actionHandlers}
        bookmarks={visibleBookmarks}
        collections={collections}
        isReordering={isReordering}
        onDirectSelectionChange={onDirectSelectionChange}
        selectedBookmarkIds={selectedBookmarkIds}
        selectionMode={selectionMode}
        showImage={effectiveViewMode === "grid-image"}
        sort={sort}
        tags={tags}
      />
    )

  return (
    <m.main
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background p-2 min-[800px]:rounded-2xl min-[800px]:border min-[800px]:border-border min-[800px]:bg-card"
      id="dashboard-main-content"
      layout
      layoutDependency={sidebarOpen}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return

        if (selectionMode) {
          event.preventDefault()
          event.stopPropagation()
          onExitSelection()
          return
        }

        if (!isReordering || isDraggingRef.current) return

        event.preventDefault()
        event.stopPropagation()
        onExitReorder(true)
      }}
      transition={{
        layout: shouldReduceMotion ? { duration: 0 } : sidebarRailTransition,
      }}
      tabIndex={-1}
    >
      <m.div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        layout="position"
        layoutDependency={sidebarOpen}
        transition={{
          layout: shouldReduceMotion ? { duration: 0 } : sidebarRailTransition,
        }}
      >
        {selectionMode ? (
          <BookmarkSelectionBars {...selectionBarsProps} />
        ) : (
          <BookmarkControlsBar {...controlsProps} />
        )}
        <output aria-live="polite" className="sr-only">
          {selectionAnnouncement}
        </output>
        <output className="sr-only">{tagFilterAnnouncement}</output>
        <TagFilterSummary
          onClear={onClearTagFilters}
          onRemove={onRemoveTagFilter}
          tags={activeTags}
        />
        {isReordering && activeCollectionName ? (
          <BookmarkReorderBar
            collection={activeCollectionName}
            onDone={() => onExitReorder(true)}
          />
        ) : null}
        <ScrollArea className="min-h-0 flex-1" fill hideScrollbar scrollFade>
          <div
            className={
              selectionMode
                ? "pb-24 min-[800px]:p-2 min-[800px]:pb-2"
                : "min-[800px]:p-2"
            }
          >
            {visibleBookmarks.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{emptyState.title}</EmptyTitle>
                  <EmptyDescription>{emptyState.description}</EmptyDescription>
                </EmptyHeader>
                {emptyState.childCollections.length > 0 ? (
                  <EmptyContent>
                    <div className="flex flex-wrap justify-center gap-2">
                      {emptyState.childCollections.map((child) => (
                        <Button
                          key={child.id}
                          onClick={() => onSelectCollection(child.id)}
                          size="sm"
                          variant="outline"
                        >
                          {child.name}
                        </Button>
                      ))}
                    </div>
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : isReordering ? (
              <BookmarkReorderArea
                onDraggingChange={(dragging) => {
                  isDraggingRef.current = dragging
                }}
                onMove={onMove}
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
  )
}
