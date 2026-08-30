import type * as React from "react"

import { Card } from "@/components/ui/card"
import { Frame, FrameFooter } from "@/components/ui/frame"
import { stateSurfaceVariants } from "@/components/ui/state-surface"
import {
  BookmarkActions,
  BookmarkContextMenu,
  type BookmarkActionHandlers,
} from "@/dev/dashboard-ui/bookmark-actions"
import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import {
  BookmarkDragHandle,
  useBookmarkSortable,
} from "@/dev/dashboard-ui/bookmark-reorder"
import { bookmarkReorderSurfaceClassName } from "@/dev/dashboard-ui/bookmark-reorder-surface"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import {
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
  selectedBookmarkIds: ReadonlySet<string>
  showImage: boolean
  sort: SortOption
  tags?: readonly Tag[]
}

function BookmarkImage({
  ogImage,
}: {
  ogImage: string | null
}): React.ReactElement {
  if (!ogImage) return <div className="aspect-5/3 w-full bg-muted" />

  return <img alt="" className="aspect-5/3 w-full object-cover" src={ogImage} />
}

function BookmarkGridCardSurface({
  bookmark,
  isDragging = false,
  isSelected,
  showImage,
  trailing,
}: {
  bookmark: MockBookmark
  isDragging?: boolean
  isSelected: boolean
  showImage: boolean
  trailing: React.ReactNode
}): React.ReactElement {
  const footer = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <BookmarkFavicon domain={bookmark.domain} />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {bookmark.title}
      </span>
      {trailing}
    </div>
  )

  if (showImage) {
    return (
      <Frame
        className={cn(
          "group/bookmark transition-colors duration-150 ease-out-strong hover:bg-accent data-selected:bg-accent",
          bookmarkReorderSurfaceClassName(isDragging)
        )}
        data-selected={isSelected || undefined}
        density="compact"
      >
        <Card className="overflow-hidden rounded-xl">
          <BookmarkImage ogImage={bookmark.ogImage} />
        </Card>
        <FrameFooter>{footer}</FrameFooter>
      </Frame>
    )
  }

  return (
    <div
      className={cn(
        stateSurfaceVariants({ axis: "both" }),
        "group/bookmark flex min-h-10 flex-col gap-2 rounded-[18px] p-3 before:rounded-[17px] hover:before:bg-accent data-selected:before:bg-accent",
        bookmarkReorderSurfaceClassName(isDragging)
      )}
      data-selected={isSelected || undefined}
    >
      {footer}
    </div>
  )
}

function BookmarkGridCard({
  bookmark,
  isSelected,
  showImage,
  tags,
  ...actionHandlers
}: BookmarkActionHandlers & {
  bookmark: MockBookmark
  collections: readonly Collection[]
  isSelected: boolean
  showImage: boolean
  tags: readonly Tag[]
}): React.ReactElement {
  return (
    <li className="list-none">
      <BookmarkContextMenu
        {...actionHandlers}
        availableTags={tags}
        bookmark={bookmark}
        isSelected={isSelected}
      >
        <BookmarkGridCardSurface
          bookmark={bookmark}
          isSelected={isSelected}
          showImage={showImage}
          trailing={
            <BookmarkActions
              {...actionHandlers}
              availableTags={tags}
              bookmark={bookmark}
              isSelected={isSelected}
            />
          }
        />
      </BookmarkContextMenu>
    </li>
  )
}

function SortableBookmarkGridCard({
  bookmark,
  index,
  showImage,
}: {
  bookmark: MockBookmark
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
        isDragging={isDragging}
        isSelected={false}
        showImage={showImage}
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

export function BookmarkGrid({
  bookmarks,
  isReordering = false,
  selectedBookmarkIds,
  showImage,
  sort,
  tags = mockTags,
  ...actionHandlers
}: BookmarkGridProps): React.ReactElement {
  return (
    <ul
      aria-label="Bookmarks"
      className={
        showImage
          ? "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[800px]:grid-cols-3"
          : "grid grid-cols-3"
      }
    >
      {sortBookmarks(bookmarks, sort).map((bookmark, index) =>
        isReordering ? (
          <SortableBookmarkGridCard
            bookmark={bookmark}
            index={index}
            key={bookmark.id}
            showImage={showImage}
          />
        ) : (
          <BookmarkGridCard
            {...actionHandlers}
            bookmark={bookmark}
            isSelected={selectedBookmarkIds.has(bookmark.id)}
            key={bookmark.id}
            showImage={showImage}
            tags={tags}
          />
        )
      )}
    </ul>
  )
}
