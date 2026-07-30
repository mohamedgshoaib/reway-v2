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
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { sortBookmarks } from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

type BookmarkGridProps = BookmarkActionHandlers & {
  bookmarks: MockBookmark[]
  selectedBookmarkIds: ReadonlySet<string>
  showImage: boolean
  sort: SortOption
}

function BookmarkImage({
  ogImage,
}: {
  ogImage: string | null
}): React.ReactElement {
  if (!ogImage) return <div className="aspect-5/3 w-full bg-muted" />

  return <img alt="" className="aspect-5/3 w-full object-cover" src={ogImage} />
}

function BookmarkGridCard({
  bookmark,
  isSelected,
  showImage,
  ...actionHandlers
}: BookmarkActionHandlers & {
  bookmark: MockBookmark
  isSelected: boolean
  showImage: boolean
}): React.ReactElement {
  const footer = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <BookmarkFavicon domain={bookmark.domain} />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {bookmark.title}
      </span>
      <BookmarkActions
        {...actionHandlers}
        bookmark={bookmark}
        isSelected={isSelected}
      />
    </div>
  )

  if (showImage) {
    return (
      <BookmarkContextMenu
        {...actionHandlers}
        bookmark={bookmark}
        isSelected={isSelected}
      >
        <Frame
          className="transition-colors duration-150 ease-out-strong hover:bg-accent data-selected:bg-accent"
          data-selected={isSelected || undefined}
          density="compact"
        >
          <Card className="overflow-hidden rounded-xl">
            <BookmarkImage ogImage={bookmark.ogImage} />
          </Card>
          <FrameFooter>{footer}</FrameFooter>
        </Frame>
      </BookmarkContextMenu>
    )
  }

  return (
    <BookmarkContextMenu
      {...actionHandlers}
      bookmark={bookmark}
      isSelected={isSelected}
    >
      <div
        className={cn(
          stateSurfaceVariants({ axis: "both" }),
          "flex min-h-10 flex-col gap-2 rounded-[18px] p-3 before:rounded-[17px] hover:before:bg-accent data-selected:before:bg-accent"
        )}
        data-selected={isSelected || undefined}
      >
        {footer}
      </div>
    </BookmarkContextMenu>
  )
}

export function BookmarkGrid({
  bookmarks,
  selectedBookmarkIds,
  showImage,
  sort,
  ...actionHandlers
}: BookmarkGridProps): React.ReactElement {
  return (
    <div
      className={
        showImage
          ? "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[800px]:grid-cols-3"
          : "grid grid-cols-3"
      }
    >
      {sortBookmarks(bookmarks, sort).map((bookmark) => (
        <BookmarkGridCard
          {...actionHandlers}
          bookmark={bookmark}
          isSelected={selectedBookmarkIds.has(bookmark.id)}
          key={bookmark.id}
          showImage={showImage}
        />
      ))}
    </div>
  )
}
