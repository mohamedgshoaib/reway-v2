import type * as React from "react"

import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import {
  groupByRecency,
  mockBookmarks,
  sortBookmarks,
} from "@/dev/dashboard-ui/mock-bookmarks"

function BookmarkRow({
  bookmark,
}: {
  bookmark: MockBookmark
}): React.ReactElement {
  return (
    <div className="relative isolate flex min-h-10 items-center gap-2 rounded-md px-2 py-2 before:pointer-events-none before:absolute before:inset-0.5 before:-z-10 before:rounded-sm before:transition-colors before:duration-150 before:ease-out-strong hover:before:bg-accent">
      <BookmarkFavicon domain={bookmark.domain} />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {bookmark.title}
      </span>
      {bookmark.metadataStatus === "pending" ? (
        <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
      ) : null}
    </div>
  )
}

export function BookmarkList({
  sort,
}: {
  sort: SortOption
}): React.ReactElement {
  // "Date added" keeps the recency-grouped view (matches the reference);
  // other sorts don't map to date buckets, so they render as a flat list.
  if (sort === "date") {
    const groups = groupByRecency(sortBookmarks(mockBookmarks, sort))

    return (
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div className="flex flex-col" key={group.label}>
            <p className="px-2 text-xs font-medium text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map((bookmark) => (
              <BookmarkRow bookmark={bookmark} key={bookmark.id} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sortBookmarks(mockBookmarks, sort).map((bookmark) => (
        <BookmarkRow bookmark={bookmark} key={bookmark.id} />
      ))}
    </div>
  )
}
