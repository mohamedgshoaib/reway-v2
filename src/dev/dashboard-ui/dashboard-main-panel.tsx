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
import type {
  Collection,
  CollectionNode,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { BookmarkControlsBar } from "@/dev/dashboard-ui/controls-bar"
import type {
  MockBookmark,
  SortOption,
  ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { sidebarRailTransition } from "@/lib/motion"

export function DashboardMainPanel({
  actionHandlers,
  activeCollectionName,
  activeCollectionNode,
  collections,
  controlsProps,
  effectiveViewMode,
  isDraggingRef,
  isReordering,
  onExitReorder,
  onMove,
  onSelectCollection,
  selectedBookmarkIds,
  shouldReduceMotion,
  sidebarOpen,
  sort,
  tags,
  visibleBookmarks,
}: {
  actionHandlers: BookmarkActionHandlers
  activeCollectionName: string | null
  activeCollectionNode?: CollectionNode
  collections: readonly Collection[]
  controlsProps: React.ComponentProps<typeof BookmarkControlsBar>
  effectiveViewMode: ViewMode
  isDraggingRef: React.RefObject<boolean>
  isReordering: boolean
  onExitReorder: (restoreFocus: boolean) => void
  onMove: (fromIndex: number, toIndex: number) => void
  onSelectCollection: (collectionId: string) => void
  selectedBookmarkIds: Set<string>
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
        selectedBookmarkIds={selectedBookmarkIds}
        sort={sort}
        tags={tags}
      />
    ) : (
      <BookmarkGrid
        {...actionHandlers}
        bookmarks={visibleBookmarks}
        collections={collections}
        isReordering={isReordering}
        selectedBookmarkIds={selectedBookmarkIds}
        showImage={effectiveViewMode === "grid-image"}
        sort={sort}
        tags={tags}
      />
    )

  return (
    <m.main
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background p-2 min-[800px]:rounded-2xl min-[800px]:border min-[800px]:border-border min-[800px]:bg-card"
      layout
      layoutDependency={sidebarOpen}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || !isReordering || isDraggingRef.current) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        onExitReorder(true)
      }}
      transition={{
        layout: shouldReduceMotion ? { duration: 0 } : sidebarRailTransition,
      }}
    >
      <m.div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        layout="position"
        layoutDependency={sidebarOpen}
        transition={{
          layout: shouldReduceMotion ? { duration: 0 } : sidebarRailTransition,
        }}
      >
        <BookmarkControlsBar {...controlsProps} />
        {isReordering && activeCollectionName ? (
          <BookmarkReorderBar
            collection={activeCollectionName}
            onDone={() => onExitReorder(true)}
          />
        ) : null}
        <ScrollArea className="min-h-0 flex-1" fill hideScrollbar scrollFade>
          <div className="min-[800px]:p-2">
            {visibleBookmarks.length === 0 && activeCollectionName ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No bookmarks here</EmptyTitle>
                  <EmptyDescription>
                    No bookmarks saved directly to {activeCollectionName}.
                  </EmptyDescription>
                </EmptyHeader>
                {activeCollectionNode?.children.length ? (
                  <EmptyContent>
                    <div className="flex flex-wrap justify-center gap-2">
                      {activeCollectionNode.children.map((child) => (
                        <Button
                          key={child.collection.id}
                          onClick={() =>
                            onSelectCollection(child.collection.id)
                          }
                          size="sm"
                          variant="outline"
                        >
                          {child.collection.name}
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
