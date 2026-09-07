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
import {
  getBookmarkTrashOrigin,
  getBookmarkTrashRecovery,
} from "@/dev/dashboard-ui/bookmark-trash"
import { getBookmarkUrl } from "@/dev/dashboard-ui/bookmark-url"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import { MOCK_DASHBOARD_NOW } from "@/dev/dashboard-ui/mock-bookmarks"
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

// react-doctor-disable-next-line react-doctor/no-high-complexity-react-function -- This cohesive surface owns paired locked render variants; the measured branches are declarative JSX.
function BookmarkRowSurface({
  bookmark,
  collections,
  isDragging = false,
  isSelected,
  onSelectionChange,
  selectionMode,
  trailing,
  visibleIds,
}: {
  bookmark: MockBookmark
  collections: readonly Collection[]
  isDragging?: boolean
  isSelected: boolean
  onSelectionChange?: BookmarkSelectionChangeHandler
  selectionMode: boolean
  trailing: React.ReactNode
  visibleIds: readonly string[]
}): React.ReactElement {
  const recovery = getBookmarkTrashRecovery(bookmark, MOCK_DASHBOARD_NOW)
  const origin = recovery ? getBookmarkTrashOrigin(bookmark, collections) : null
  const recoveryContext =
    recovery && origin ? `${origin.label} · ${recovery.label}` : null
  const recoveryAccessibleLabel =
    recovery && origin
      ? `${origin.label}. ${recovery.label} to restore`
      : undefined
  const selectionLabelId = `bookmark-selection-label-${bookmark.id}`
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
          labelId={selectionLabelId}
          onSelectionChange={onSelectionChange}
          visibleIds={visibleIds}
        />
        <span
          className="min-w-0 flex-1 truncate text-sm text-foreground"
          id={selectionLabelId}
        >
          {bookmark.title}
        </span>
        {recoveryContext ? (
          <span
            aria-label={recoveryAccessibleLabel}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {recoveryContext}
          </span>
        ) : bookmark.metadataStatus === "pending" ? (
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
      {recoveryContext ? (
        <span
          aria-label={recoveryAccessibleLabel}
          className="pointer-events-none relative z-10 shrink-0 text-xs text-muted-foreground tabular-nums"
        >
          {recoveryContext}
        </span>
      ) : bookmark.metadataStatus === "pending" ? (
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
  collections,
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
      collections={collections}
      isSelected={isSelected}
      onSelectionChange={onSelectionChange}
      selectionMode={selectionMode}
      trailing={
        selectionMode ? null : (
          <BookmarkActions
            {...actionHandlers}
            availableTags={tags}
            bookmark={bookmark}
            collections={collections}
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
        collections={collections}
        isSelected={isSelected}
      >
        {surface}
      </BookmarkContextMenu>
    </li>
  )
}

function SortableBookmarkRow({
  bookmark,
  collections,
  index,
}: {
  bookmark: MockBookmark
  collections: readonly Collection[]
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
        collections={collections}
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
  collections,
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
      collections={collections}
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
            collections={collections}
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
