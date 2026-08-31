import { beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe("bookmark range selection hint store", () => {
  it("persists dismissal and notifies subscribers", async () => {
    const store =
      await import("@/dev/dashboard-ui/bookmark-selection-hint-store")
    const listener = vi.fn<() => void>()
    const unsubscribe = store.subscribeToBookmarkRangeHint(listener)

    store.markBookmarkRangeHintSeen()

    expect(store.getBookmarkRangeHintSeen()).toBe(true)
    expect(
      localStorage.getItem("reway.bookmark-range-selection-hint-seen")
    ).toBe("true")
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })
})
