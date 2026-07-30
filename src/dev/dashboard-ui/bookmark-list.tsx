import type * as React from "react"

import { stateSurfaceVariants } from "@/components/ui/state-surface"
import {
  BookmarkActions,
  BookmarkContextMenu,
  type BookmarkActionHandlers,
} from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import {
  BookmarkDragHandle,
  bookmarkReorderSurfaceClassName,
  useBookmarkSortable,
} from "@/dev/dashboard-ui/bookmark-reorder"
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import {
  groupByRecency,
  sortBookmarks,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

type BookmarkListProps = BookmarkActionHandlers & {
  bookmarks: MockBookmark[]
  isReordering?: boolean
  selectedBookmarkIds: ReadonlySet<string>
  sort: SortOption
}

function BookmarkRowSurface({
  bookmark,
  isDragging = false,
  isSelected,
  trailing,
}: {
  bookmark: MockBookmark
  isDragging?: boolean
  isSelected: boolean
  trailing: React.ReactNode
}): React.ReactElement {
  return (
    <div
      className={cn(
        stateSurfaceVariants({ axis: "block" }),
        "group/bookmark flex min-h-10 items-center gap-2 rounded-md px-2 py-2 before:rounded-[calc(var(--radius-md)-1px)] hover:before:bg-accent data-selected:before:bg-accent",
        bookmarkReorderSurfaceClassName(isDragging)
      )}
      data-selected={isSelected || undefined}
    >
      <BookmarkFavicon domain={bookmark.domain} />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {bookmark.title}
      </span>
      {bookmark.metadataStatus === "pending" ? (
        <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
      ) : null}
      {trailing}
    </div>
  )
}

function BookmarkRow({
  bookmark,
  isSelected,
  ...actionHandlers
}: BookmarkActionHandlers & {
  bookmark: MockBookmark
  isSelected: boolean
}): React.ReactElement {
  return (
    <li className="list-none">
      <BookmarkContextMenu
        {...actionHandlers}
        bookmark={bookmark}
        isSelected={isSelected}
      >
        <BookmarkRowSurface
          bookmark={bookmark}
          isSelected={isSelected}
          trailing={
            <BookmarkActions
              {...actionHandlers}
              bookmark={bookmark}
              isSelected={isSelected}
            />
          }
        />
      </BookmarkContextMenu>
    </li>
  )
}

function SortableBookmarkRow({
  bookmark,
  index,
}: {
  bookmark: MockBookmark
  index: number
}): React.ReactElement {
  const { handleRef, isDragging, ref } = useBookmarkSortable({
    id: bookmark.id,
    index,
    layout: "list",
  })

  return (
    <li
      aria-roledescription="sortable bookmark"
      className="list-none"
      data-dragging={isDragging || undefined}
      ref={ref}
    >
      <BookmarkRowSurface
        bookmark={bookmark}
        isDragging={isDragging}
        isSelected={false}
        trailing={
          <BookmarkDragHandle
            bookmarkTitle={bookmark.title}
            handleRef={handleRef}
          />
        }
      />
    </li>
  )
}

export function BookmarkList({
  bookmarks,
  isReordering = false,
  selectedBookmarkIds,
  sort,
  ...actionHandlers
}: BookmarkListProps): React.ReactElement {
  const renderBookmark = (bookmark: MockBookmark) => (
    <BookmarkRow
      {...actionHandlers}
      bookmark={bookmark}
      isSelected={selectedBookmarkIds.has(bookmark.id)}
      key={bookmark.id}
    />
  )

  if (isReordering) {
    return (
      <ul aria-label="Bookmarks" className="flex list-none flex-col">
        {bookmarks.map((bookmark, index) => (
          <SortableBookmarkRow
            bookmark={bookmark}
            index={index}
            key={bookmark.id}
          />
        ))}
      </ul>
    )
  }

  if (sort === "date") {
    const groups = groupByRecency(sortBookmarks(bookmarks, sort))

    return (
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section className="flex flex-col" key={group.label}>
            <h2 className="px-2 text-xs font-medium text-muted-foreground uppercase">
              {group.label}
            </h2>
            <ul aria-label={group.label} className="flex list-none flex-col">
              {group.items.map(renderBookmark)}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  return (
    <ul aria-label="Bookmarks" className="flex list-none flex-col">
      {sortBookmarks(bookmarks, sort).map(renderBookmark)}
    </ul>
  )
}
