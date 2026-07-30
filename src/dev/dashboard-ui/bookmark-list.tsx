import type * as React from "react"

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
import {
  groupByRecency,
  sortBookmarks,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

type BookmarkListProps = BookmarkActionHandlers & {
  bookmarks: MockBookmark[]
  selectedBookmarkIds: ReadonlySet<string>
  sort: SortOption
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
    <BookmarkContextMenu
      {...actionHandlers}
      bookmark={bookmark}
      isSelected={isSelected}
    >
      <div
        className={cn(
          stateSurfaceVariants({ axis: "block" }),
          "flex min-h-10 items-center gap-2 rounded-md px-2 py-2 before:rounded-[calc(var(--radius-md)-1px)] hover:before:bg-accent data-selected:before:bg-accent"
        )}
        data-selected={isSelected || undefined}
      >
        <BookmarkFavicon domain={bookmark.domain} />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {bookmark.title}
        </span>
        {bookmark.metadataStatus === "pending" ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Pending
          </span>
        ) : null}
        <BookmarkActions
          {...actionHandlers}
          bookmark={bookmark}
          isSelected={isSelected}
        />
      </div>
    </BookmarkContextMenu>
  )
}

export function BookmarkList({
  bookmarks,
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

  if (sort === "date") {
    const groups = groupByRecency(sortBookmarks(bookmarks, sort))

    return (
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div className="flex flex-col" key={group.label}>
            <p className="px-2 text-xs font-medium text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map(renderBookmark)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sortBookmarks(bookmarks, sort).map(renderBookmark)}
    </div>
  )
}
