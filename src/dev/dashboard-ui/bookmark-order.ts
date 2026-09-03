import { arrayMove } from "@dnd-kit/helpers"

import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

export function createCollectionOrders(
  bookmarks: MockBookmark[]
): Record<string, string[]> {
  const orders: Record<string, string[]> = {}

  for (const bookmark of bookmarks) {
    if (bookmark.trashedAt !== undefined) continue

    for (const collection of bookmark.collections ?? []) {
      const order = orders[collection] ?? []
      order.push(bookmark.id)
      orders[collection] = order
    }
  }

  return orders
}

export function moveBookmarkId(
  bookmarkIds: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  return arrayMove(bookmarkIds, fromIndex, toIndex)
}

export function orderBookmarksByIds(
  bookmarks: MockBookmark[],
  bookmarkIds: string[]
): MockBookmark[] {
  const bookmarksById = new Map(
    bookmarks.map((bookmark) => [bookmark.id, bookmark])
  )

  return bookmarkIds.flatMap((bookmarkId) => {
    const bookmark = bookmarksById.get(bookmarkId)
    return bookmark ? [bookmark] : []
  })
}
