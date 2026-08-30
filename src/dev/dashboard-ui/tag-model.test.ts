import { describe, expect, it } from "vitest"

import { mockTags } from "@/dev/dashboard-ui/mock-bookmarks"
import {
  getLeastUsedTagColor,
  getTagNameError,
  moveTag,
  sortTags,
} from "@/dev/dashboard-ui/tag-model"

describe("tag model", () => {
  it("uses the first least-used palette color", () => {
    expect(getLeastUsedTagColor(mockTags)).toBe("neutral")
  })

  it("validates names without depending on display casing", () => {
    expect(getTagNameError(mockTags, "  DESIGN  ")).toBe(
      "A tag with this name already exists."
    )
  })

  it("moves a tag in custom order without changing its identity", () => {
    const moved = moveTag(mockTags, "engineering", 0)
    const ordered = sortTags(moved, "custom")

    expect(ordered[0]?.id).toBe("engineering")
    expect(new Set(ordered.map((tag) => tag.id)).size).toBe(mockTags.length)
  })
})
