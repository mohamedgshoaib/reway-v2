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
    <div className="flex flex-col gap-2 rounded-lg p-2 hover:bg-accent">
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
    <div className="grid grid-cols-3 gap-4">
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
