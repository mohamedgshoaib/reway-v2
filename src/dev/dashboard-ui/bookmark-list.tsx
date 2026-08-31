import type * as React from "react"

import { Label } from "@/components/ui/label"
import { stateSurfaceVariants } from "@/components/ui/state-surface"
import {
  BookmarkActions,
  BookmarkContextMenu,
  type BookmarkActionHandlers,
} from "@/dev/dashboard-ui/bookmark-actions"
import {
  BookmarkDragHandle,
  useBookmarkSortable,
} from "@/dev/dashboard-ui/bookmark-reorder"
import { bookmarkReorderSurfaceClassName } from "@/dev/dashboard-ui/bookmark-reorder-surface"
import {
  BookmarkLeadingControl,
  BookmarkLeadingFavicon,
  type BookmarkSelectionChangeHandler,
} from "@/dev/dashboard-ui/bookmark-selection-control"
import { getBookmarkUrl } from "@/dev/dashboard-ui/bookmark-url"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { mockTags } from "@/dev/dashboard-ui/mock-bookmarks"
import {
  groupByRecency,
  sortBookmarks,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { cn } from "@/lib/utils"

type BookmarkListProps = BookmarkActionHandlers & {
  bookmarks: MockBookmark[]
  collections: readonly Collection[]
  isReordering?: boolean
  onDirectSelectionChange?: BookmarkSelectionChangeHandler
  selectedBookmarkIds: ReadonlySet<string>
  selectionMode?: boolean
  sort: SortOption
  tags?: readonly Tag[]
}

const preventShiftTextSelection: React.MouseEventHandler<HTMLLabelElement> = (
  event
) => {
  if (event.shiftKey) event.preventDefault()
}

function BookmarkRowSurface({
  bookmark,
  isDragging = false,
  isSelected,
  onSelectionChange,
  selectionMode,
  trailing,
  visibleIds,
}: {
  bookmark: MockBookmark
  isDragging?: boolean
  isSelected: boolean
  onSelectionChange?: BookmarkSelectionChangeHandler
  selectionMode: boolean
  trailing: React.ReactNode
  visibleIds: readonly string[]
}): React.ReactElement {
  const className = cn(
    stateSurfaceVariants({ axis: "block" }),
    "group/bookmark flex min-h-10 items-center gap-2 rounded-md px-2 py-2 before:rounded-[calc(var(--radius-md)-1px)] hover:before:bg-accent data-selected:before:bg-accent",
    bookmarkReorderSurfaceClassName(isDragging)
  )

  if (selectionMode && onSelectionChange) {
    return (
      <Label
        className={cn(className, "cursor-pointer select-none")}
        data-selected={isSelected || undefined}
        onMouseDown={preventShiftTextSelection}
      >
        <BookmarkLeadingControl
          bookmark={bookmark}
          checked={isSelected}
          onSelectionChange={onSelectionChange}
          visibleIds={visibleIds}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {bookmark.title}
        </span>
        {bookmark.metadataStatus === "pending" ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Pending
          </span>
        ) : null}
      </Label>
    )
  }

  return (
    <div className={className} data-selected={isSelected || undefined}>
      <a
        aria-label={bookmark.title}
        className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        href={getBookmarkUrl(bookmark)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="sr-only">{bookmark.title}</span>
      </a>
      <BookmarkLeadingFavicon
        bookmark={bookmark}
        className="pointer-events-none relative z-10"
      />
      <span className="pointer-events-none relative z-10 min-w-0 flex-1 truncate text-sm text-foreground">
        {bookmark.title}
      </span>
      {bookmark.metadataStatus === "pending" ? (
        <span className="pointer-events-none relative z-10 shrink-0 text-xs text-muted-foreground">
          Pending
        </span>
      ) : null}
      <span className="pointer-events-auto relative z-20">{trailing}</span>
    </div>
  )
}

function BookmarkRow({
  bookmark,
  isSelected,
  onSelectionChange,
  selectionMode,
  tags,
  visibleIds,
  ...actionHandlers
}: BookmarkActionHandlers & {
  bookmark: MockBookmark
  collections: readonly Collection[]
  isSelected: boolean
  onSelectionChange: BookmarkSelectionChangeHandler
  selectionMode: boolean
  tags: readonly Tag[]
  visibleIds: readonly string[]
}): React.ReactElement {
  const surface = (
    <BookmarkRowSurface
      bookmark={bookmark}
      isSelected={isSelected}
      onSelectionChange={onSelectionChange}
      selectionMode={selectionMode}
      trailing={
        selectionMode ? null : (
          <BookmarkActions
            {...actionHandlers}
            availableTags={tags}
            bookmark={bookmark}
            isSelected={isSelected}
          />
        )
      }
      visibleIds={visibleIds}
    />
  )

  if (selectionMode) return <li className="list-none">{surface}</li>

  return (
    <li className="list-none">
      <BookmarkContextMenu
        {...actionHandlers}
        availableTags={tags}
        bookmark={bookmark}
        isSelected={isSelected}
      >
        {surface}
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
        selectionMode={false}
        trailing={
          <BookmarkDragHandle
            bookmarkTitle={bookmark.title}
            handleRef={handleRef}
          />
        }
        visibleIds={[]}
      />
    </li>
  )
}

export function BookmarkList({
  bookmarks,
  isReordering = false,
  onDirectSelectionChange,
  selectedBookmarkIds,
  selectionMode = false,
  sort,
  tags = mockTags,
  ...actionHandlers
}: BookmarkListProps): React.ReactElement {
  const orderedBookmarks = sortBookmarks(bookmarks, sort)
  const visibleIds = orderedBookmarks.map((bookmark) => bookmark.id)
  const handleSelectionChange: BookmarkSelectionChangeHandler =
    onDirectSelectionChange ??
    ((bookmarkId, checked) =>
      actionHandlers.onSelectChange(bookmarkId, checked))
  const renderBookmark = (bookmark: MockBookmark) => (
    <BookmarkRow
      {...actionHandlers}
      bookmark={bookmark}
      isSelected={selectedBookmarkIds.has(bookmark.id)}
      key={bookmark.id}
      onSelectionChange={handleSelectionChange}
      selectionMode={selectionMode}
      tags={tags}
      visibleIds={visibleIds}
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
    const groups = groupByRecency(orderedBookmarks)

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
      {orderedBookmarks.map(renderBookmark)}
    </ul>
  )
}
