import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

export function getBookmarkUrl(bookmark: MockBookmark): string {
  if (bookmark.url) return bookmark.url
  if (bookmark.title.startsWith("http")) return bookmark.title
  return `https://${bookmark.domain ?? "reway.page"}`
}
