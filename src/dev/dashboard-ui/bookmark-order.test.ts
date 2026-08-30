import { describe, expect, it } from "vitest"

import {
  createCollectionOrders,
  moveBookmarkId,
  orderBookmarksByIds,
} from "@/dev/dashboard-ui/bookmark-order"
import {
  mockBookmarks,
  type MockBookmark,
} from "@/dev/dashboard-ui/mock-bookmarks"

describe("bookmark collection order", () => {
  it("builds one stable order per collection", () => {
    const orders = createCollectionOrders(mockBookmarks)

    expect(orders.research).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"])
    expect(orders["design-references"]).toEqual(["1", "5", "8", "11"])
    expect(orders["reading-list"]).toEqual(["3", "15"])
  })

  it("moves one bookmark without changing the input order", () => {
    const original = ["1", "2", "3"]

    expect(moveBookmarkId(original, 0, 2)).toEqual(["2", "3", "1"])
    expect(original).toEqual(["1", "2", "3"])
  })

  it("applies saved ids and drops ids that no longer exist", () => {
    const bookmarks: MockBookmark[] = [mockBookmarks[0], mockBookmarks[1]]

    expect(orderBookmarksByIds(bookmarks, ["2", "missing", "1"])).toEqual([
      mockBookmarks[1],
      mockBookmarks[0],
    ])
  })
})
