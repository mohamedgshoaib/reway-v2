import type * as React from "react"

import { Card } from "@/components/ui/card"
import { Frame, FrameFooter } from "@/components/ui/frame"
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
import {
  MOCK_DASHBOARD_NOW,
  mockTags,
  type MockBookmark,
  type SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { sortBookmarks } from "@/dev/dashboard-ui/mock-bookmarks"
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { cn } from "@/lib/utils"

type BookmarkGridProps = BookmarkActionHandlers & {
  bookmarks: MockBookmark[]
  collections: readonly Collection[]
  isReordering?: boolean
  onDirectSelectionChange?: BookmarkSelectionChangeHandler
  selectedBookmarkIds: ReadonlySet<string>
  selectionMode?: boolean
  showImage: boolean
  sort: SortOption
  tags?: readonly Tag[]
}

const preventShiftTextSelection: React.MouseEventHandler<HTMLLabelElement> = (
  event
) => {
  if (event.shiftKey) event.preventDefault()
}

function BookmarkImage({
  ogImage,
}: {
  ogImage: string | null
}): React.ReactElement {
  if (!ogImage) return <div className="aspect-5/3 w-full bg-muted" />

  return <img alt="" className="aspect-5/3 w-full object-cover" src={ogImage} />
}

// react-doctor-disable-next-line react-doctor/no-high-complexity-react-function -- This cohesive surface owns paired locked render variants; the measured branches are declarative JSX.
function BookmarkGridCardSurface({
  bookmark,
  collections,
  isDragging = false,
  isSelected,
  onSelectionChange,
  selectionMode,
  showImage,
  trailing,
  visibleIds,
}: {
  bookmark: MockBookmark
  collections: readonly Collection[]
  isDragging?: boolean
  isSelected: boolean
  onSelectionChange?: BookmarkSelectionChangeHandler
  selectionMode: boolean
  showImage: boolean
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
  const leading =
    selectionMode && onSelectionChange ? (
      <BookmarkLeadingControl
        bookmark={bookmark}
        checked={isSelected}
        labelId={selectionLabelId}
        onSelectionChange={onSelectionChange}
        visibleIds={visibleIds}
      />
    ) : (
      <BookmarkLeadingFavicon
        bookmark={bookmark}
        className="pointer-events-none relative z-10"
      />
    )
  const details = (
    <span className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm text-foreground" id={selectionLabelId}>
        {bookmark.title}
      </span>
      {recoveryContext ? (
        <span
          aria-label={recoveryAccessibleLabel}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {recoveryContext}
        </span>
      ) : null}
    </span>
  )
  const footer = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {leading}
      {details}
      <span className="pointer-events-auto relative z-20">{trailing}</span>
    </div>
  )

  if (showImage) {
    const frame = (
      <Frame
        className={cn(
          "group/bookmark transition-colors duration-150 ease-out-strong hover:bg-accent data-selected:bg-accent",
          bookmarkReorderSurfaceClassName(isDragging)
        )}
        data-selected={isSelected || undefined}
        density="compact"
      >
        {!selectionMode ? (
          <a
            aria-label={bookmark.title}
            className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            href={getBookmarkUrl(bookmark)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="sr-only">{bookmark.title}</span>
          </a>
        ) : null}
        <Card className="pointer-events-none relative z-10 overflow-hidden rounded-xl">
          <BookmarkImage ogImage={bookmark.ogImage} />
        </Card>
        <FrameFooter className="pointer-events-none relative z-10">
          {footer}
        </FrameFooter>
      </Frame>
    )

    return selectionMode ? (
      <Label
        className="block cursor-pointer select-none"
        onMouseDown={preventShiftTextSelection}
      >
        {frame}
      </Label>
    ) : (
      frame
    )
  }

  const className = cn(
    stateSurfaceVariants({ axis: "both" }),
    "group/bookmark flex min-h-10 flex-col gap-2 rounded-[18px] p-3 before:rounded-[17px] hover:before:bg-accent data-selected:before:bg-accent",
    bookmarkReorderSurfaceClassName(isDragging)
  )

  return selectionMode ? (
    <Label
      className={cn(className, "cursor-pointer select-none")}
      data-selected={isSelected || undefined}
      onMouseDown={preventShiftTextSelection}
    >
      {footer}
    </Label>
  ) : (
    <div className={className} data-selected={isSelected || undefined}>
      <a
        aria-label={bookmark.title}
        className="absolute inset-0 z-0 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        href={getBookmarkUrl(bookmark)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="sr-only">{bookmark.title}</span>
      </a>
      {footer}
    </div>
  )
}

function BookmarkGridCard({
  bookmark,
  collections,
  isSelected,
  onSelectionChange,
  selectionMode,
  showImage,
  tags,
  visibleIds,
  ...actionHandlers
}: BookmarkActionHandlers & {
  bookmark: MockBookmark
  collections: readonly Collection[]
  isSelected: boolean
  onSelectionChange: BookmarkSelectionChangeHandler
  selectionMode: boolean
  showImage: boolean
  tags: readonly Tag[]
  visibleIds: readonly string[]
}): React.ReactElement {
  const surface = (
    <BookmarkGridCardSurface
      bookmark={bookmark}
      collections={collections}
      isSelected={isSelected}
      onSelectionChange={onSelectionChange}
      selectionMode={selectionMode}
      showImage={showImage}
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

function SortableBookmarkGridCard({
  bookmark,
  collections,
  index,
  showImage,
}: {
  bookmark: MockBookmark
  collections: readonly Collection[]
  index: number
  showImage: boolean
}): React.ReactElement {
  const { handleRef, isDragging, ref } = useBookmarkSortable({
    id: bookmark.id,
    index,
    layout: "grid",
  })

  return (
    <li
      aria-roledescription="sortable bookmark"
      className="list-none"
      data-dragging={isDragging || undefined}
      ref={ref}
    >
      <BookmarkGridCardSurface
        bookmark={bookmark}
        collections={collections}
        isDragging={isDragging}
        isSelected={false}
        selectionMode={false}
        showImage={showImage}
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

export function BookmarkGrid({
  bookmarks,
  collections,
  isReordering = false,
  onDirectSelectionChange,
  selectedBookmarkIds,
  selectionMode = false,
  showImage,
  sort,
  tags = mockTags,
  ...actionHandlers
}: BookmarkGridProps): React.ReactElement {
  const orderedBookmarks = sortBookmarks(bookmarks, sort)
  const visibleIds = orderedBookmarks.map((bookmark) => bookmark.id)
  const handleSelectionChange: BookmarkSelectionChangeHandler =
    onDirectSelectionChange ??
    ((bookmarkId, checked) =>
      actionHandlers.onSelectChange(bookmarkId, checked))

  return (
    <ul
      aria-label="Bookmarks"
      className={
        showImage
          ? "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[800px]:grid-cols-3"
          : "grid grid-cols-3"
      }
    >
      {orderedBookmarks.map((bookmark, index) =>
        isReordering ? (
          <SortableBookmarkGridCard
            bookmark={bookmark}
            collections={collections}
            index={index}
            key={bookmark.id}
            showImage={showImage}
          />
        ) : (
          <BookmarkGridCard
            {...actionHandlers}
            bookmark={bookmark}
            collections={collections}
            isSelected={selectedBookmarkIds.has(bookmark.id)}
            key={bookmark.id}
            onSelectionChange={handleSelectionChange}
            selectionMode={selectionMode}
            showImage={showImage}
            tags={tags}
            visibleIds={visibleIds}
          />
        )
      )}
    </ul>
  )
}
