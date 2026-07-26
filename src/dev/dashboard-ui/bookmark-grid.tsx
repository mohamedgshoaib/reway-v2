import type * as React from "react"

import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { mockBookmarks, sortBookmarks } from "@/dev/dashboard-ui/mock-bookmarks"

function BookmarkImage({
  ogImage,
}: {
  ogImage: string | null
}): React.ReactElement {
  if (!ogImage) {
    return <div className="aspect-5/3 w-full rounded-md bg-muted" />
  }

  return (
    <img
      alt=""
      className="aspect-5/3 w-full rounded-md object-cover"
      src={ogImage}
    />
  )
}

function BookmarkGridCard({
  bookmark,
  showImage,
}: {
  bookmark: MockBookmark
  showImage: boolean
}): React.ReactElement {
  return (
    <div className="relative isolate flex min-h-10 flex-col gap-2 rounded-[18px] p-3 before:pointer-events-none before:absolute before:inset-0.5 before:-z-10 before:rounded-2xl before:transition-colors before:duration-150 before:ease-out-strong hover:before:bg-accent">
      {showImage ? <BookmarkImage ogImage={bookmark.ogImage} /> : null}
      <div className="flex items-center gap-2">
        <BookmarkFavicon domain={bookmark.domain} />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {bookmark.title}
        </span>
      </div>
    </div>
  )
}

export function BookmarkGrid({
  sort,
  showImage,
}: {
  sort: SortOption
  showImage: boolean
}): React.ReactElement {
  return (
    <div className="grid grid-cols-3">
      {sortBookmarks(mockBookmarks, sort).map((bookmark) => (
        <BookmarkGridCard
          bookmark={bookmark}
          key={bookmark.id}
          showImage={showImage}
        />
      ))}
    </div>
  )
}
