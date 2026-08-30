import { beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe("collection nesting hint store", () => {
  it("persists the completed hint for later sessions", async () => {
    const store =
      await import("@/dev/dashboard-ui/collection-reorder-hint-store")
    const listener = vi.fn<() => void>()
    const unsubscribe = store.subscribeToCollectionNestingHint(listener)

    expect(store.getCollectionNestingHintSeen()).toBe(false)

    store.markCollectionNestingHintSeen()

    expect(store.getCollectionNestingHintSeen()).toBe(true)
    expect(localStorage.getItem("reway.collection-nesting-hint-seen")).toBe(
      "true"
    )
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it("reads an existing completion without showing the hint again", async () => {
    localStorage.setItem("reway.collection-nesting-hint-seen", "true")

    const store =
      await import("@/dev/dashboard-ui/collection-reorder-hint-store")

    expect(store.getCollectionNestingHintSeen()).toBe(true)
  })
})
