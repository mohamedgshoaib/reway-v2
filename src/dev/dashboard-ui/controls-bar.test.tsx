import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import { BookmarkControlsBar } from "@/dev/dashboard-ui/controls-bar"
import type { SortOption, ViewMode } from "@/dev/dashboard-ui/mock-bookmarks"

afterEach(cleanup)

describe("BookmarkControlsBar", () => {
  it("keeps sort and view controls out of the bookmark header", () => {
    render(
      <SidebarProvider>
        <BookmarkControlsBar
          mobileNavigationDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          title="Research"
          viewMode="list"
        />
      </SidebarProvider>
    )

    expect(screen.queryByRole("button", { name: /sort bookmarks/i })).toBeNull()
    expect(
      screen.queryByRole("button", { name: /change bookmark view/i })
    ).toBeNull()
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).not.toBeNull()
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Research",
    })
    expect(heading.className).toContain("min-[800px]:sr-only")
    expect(heading.parentElement?.className).toContain("min-[800px]:contents")
  })
})
