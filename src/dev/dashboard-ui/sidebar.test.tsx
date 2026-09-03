import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import type { SortOption, ViewMode } from "@/dev/dashboard-ui/mock-bookmarks"
import {
  DashboardSidebar,
  MobileDashboardNavigation,
} from "@/dev/dashboard-ui/sidebar"

vi.mock("@/dev/dashboard-ui/navigation-preferences", () => ({
  setDashboardNavigationPreference: vi.fn<() => Promise<void>>(() =>
    Promise.resolve()
  ),
}))

afterEach(cleanup)

describe("DashboardSidebar", () => {
  it("hands the sidebar header control off between states", () => {
    const collapsedSidebar = render(
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).not.toBeNull()
    expect(
      screen.queryByRole("button", { name: "Collapse sidebar" })
    ).toBeNull()

    collapsedSidebar.unmount()

    render(
      <SidebarProvider defaultOpen>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" })
    ).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Expand sidebar" })).toBeNull()
  })

  it("keeps display choices behind one quiet desktop entry", async () => {
    const onSortChange = vi.fn<(sort: SortOption) => void>()

    render(
      <SidebarProvider>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={onSortChange}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    const display = screen.getByRole("button", { name: "Display" })
    const trash = screen.getByRole("button", { name: "Trash" })
    const settings = screen.getByRole("button", { name: "Settings" })
    expect(display).not.toBeNull()
    expect(
      display.querySelector('[data-slot="display-menu-indicator"]')
    ).not.toBeNull()
    expect(
      display.compareDocumentPosition(trash) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    expect(
      trash.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    expect(screen.queryByText("Date added")).toBeNull()
    expect(screen.queryByText("List")).toBeNull()

    fireEvent.click(display)
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: "Alphabetical" })
    )

    expect(onSortChange).toHaveBeenCalledWith("alpha")
  })

  it("offers custom order and reorder only for an active collection", async () => {
    const onStartReorder = vi.fn<() => void>()

    render(
      <SidebarProvider>
        <DashboardSidebar
          activeCollection="Research"
          canReorder
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onStartReorder={onStartReorder}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="custom"
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Display" }))

    expect(
      await screen.findByRole("menuitemradio", { name: "Custom order" })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("menuitem", { name: "Reorder items" }))
    expect(onStartReorder).toHaveBeenCalledOnce()
  })

  it("keeps nested collections visible and gives only parents a create action", async () => {
    const onSelectCollection = vi.fn<(collectionId: string) => void>()

    render(
      <SidebarProvider>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSelectCollection={onSelectCollection}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Streaming platforms" }))
    expect(onSelectCollection).toHaveBeenCalledWith("streaming-platforms")

    fireEvent.click(screen.getByRole("button", { name: "Actions for Media" }))
    expect(await screen.findByText("New nested collection")).not.toBeNull()

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => {
      expect(screen.queryByText("New nested collection")).toBeNull()
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Actions for Streaming platforms" })
    )
    expect(await screen.findByRole("menuitem", { name: "Edit" })).not.toBeNull()
    expect(screen.queryByText("New nested collection")).toBeNull()
  })

  it("keeps row paint for hover and keyboard focus without retaining pointer focus", () => {
    const { container } = render(
      <SidebarProvider>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    const mediaRow = screen.getByRole("button", { name: "Media" })
    const nestedRow = screen.getByRole("button", {
      name: "Streaming platforms",
    })
    const tagRow = screen.getByRole("button", { name: "Filter by Design" })
    const displayRow = screen.getByRole("button", { name: "Display" })
    const searchRow = screen.getByRole("button", { name: /Search/ })

    expect(mediaRow.classList.contains("h-8")).toBe(true)
    expect(nestedRow.classList.contains("h-8")).toBe(true)
    expect(nestedRow.classList.contains("sm:h-7")).toBe(false)

    for (const actionName of [
      "Actions for Media",
      "Actions for Streaming platforms",
      "Actions for Design",
    ]) {
      const action = screen.getByRole("button", { name: actionName })
      expect(action.querySelector("svg")?.getAttribute("class")).toContain(
        "size-4"
      )
    }

    for (const row of [mediaRow, nestedRow, tagRow, displayRow, searchRow]) {
      expect(row.className).toContain(
        "group-hover/menu-item:before:bg-sidebar-accent"
      )
      expect(row.className).toContain(
        "group-has-focus-visible/menu-item:before:bg-sidebar-accent"
      )
      expect(row.className).toContain(
        "group-has-data-popup-open/menu-item:before:bg-sidebar-accent"
      )
      expect(row.className).not.toContain(
        "group-focus-within/menu-item:before:bg-sidebar-accent"
      )
    }

    const collectionsCaret = container.querySelector(
      '[data-slot="collections-indicator"]'
    )
    const collectionActions = container.querySelector(
      '[data-slot="sidebar-group-actions"]'
    )
    expect(collectionsCaret?.getAttribute("class")).toContain(
      "group-hover/collection-header:opacity-70"
    )
    expect(collectionsCaret?.getAttribute("class")).toContain(
      "group-has-focus-visible/collection-header:opacity-70"
    )
    expect(collectionsCaret?.getAttribute("class")).toContain(
      "group-has-data-popup-open/collection-header:opacity-70"
    )
    expect(collectionActions?.className).toContain(
      "group-has-focus-visible/collection-header:opacity-100"
    )
    expect(collectionActions?.className).toContain(
      "group-has-data-popup-open/collection-header:opacity-100"
    )
    expect(collectionActions?.className).not.toContain(
      "group-focus-within/collection-header:opacity-100"
    )

    const displayCaret = displayRow.querySelector(
      '[data-slot="display-menu-indicator"]'
    )
    expect(displayCaret?.getAttribute("class")).toContain(
      "group-hover/menu-item:opacity-70"
    )
    expect(displayCaret?.getAttribute("class")).toContain(
      "group-has-focus-visible/menu-item:opacity-70"
    )
    expect(displayCaret?.getAttribute("class")).toContain(
      "group-has-data-popup-open/menu-item:opacity-70"
    )
  })

  it("disables hidden group triggers while collapsed", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )
    const collectionsTrigger = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Collections']"
    )
    const tagsTrigger = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Tags']"
    )

    expect(collectionsTrigger).not.toBeNull()
    expect(tagsTrigger).not.toBeNull()

    expect(collectionsTrigger?.getAttribute("aria-disabled")).toBe("true")
    expect(tagsTrigger?.getAttribute("aria-disabled")).toBe("true")
    expect(collectionsTrigger?.hasAttribute("inert")).toBe(true)
    expect(tagsTrigger?.hasAttribute("inert")).toBe(true)

    const groupActions = container.querySelectorAll(
      '[data-slot="sidebar-group-actions"]'
    )
    const groupCarets = container.querySelectorAll(
      '[data-slot="collections-indicator"], [data-slot="tags-indicator"]'
    )
    expect(groupActions).toHaveLength(2)
    expect(groupCarets).toHaveLength(2)
    for (const actions of groupActions) {
      expect(actions.getAttribute("class")).toContain(
        "group-data-[collapsible=icon]:hidden"
      )
    }
    for (const caret of groupCarets) {
      expect(caret.getAttribute("class")).toContain(
        "group-data-[collapsible=icon]:hidden"
      )
    }

    fireEvent.click(collectionsTrigger as HTMLButtonElement)
    fireEvent.click(tagsTrigger as HTMLButtonElement)

    expect(collectionsTrigger?.getAttribute("aria-expanded")).toBe("true")
    expect(tagsTrigger?.getAttribute("aria-expanded")).toBe("true")
  })

  it("keeps disclosure controls open and closes after leaf navigation", async () => {
    render(
      <SidebarProvider>
        <MobileDashboardNavigation
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })

    fireEvent.click(navigationTrigger)
    await screen.findByText("Navigation")

    const collectionsTrigger = screen.getByRole("button", {
      name: "Collections",
    })
    const tagsTrigger = screen.getByRole("button", { name: "Tags" })

    expect(collectionsTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(tagsTrigger.getAttribute("aria-expanded")).toBe("true")

    fireEvent.click(collectionsTrigger)
    expect(collectionsTrigger.getAttribute("aria-expanded")).toBe("false")
    expect(screen.getByText("Navigation")).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "All bookmarks" }))
    await waitFor(() => {
      expect(navigationTrigger.getAttribute("aria-expanded")).toBe("false")
    })
  })

  it("shows a compact mobile result action only while tags are active", async () => {
    const inactiveNavigation = render(
      <SidebarProvider>
        <MobileDashboardNavigation
          activeTagIds={new Set()}
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    await screen.findByText("Navigation")
    expect(
      screen.queryByRole("button", { name: "Show all bookmarks" })
    ).toBeNull()
    inactiveNavigation.unmount()

    render(
      <SidebarProvider>
        <MobileDashboardNavigation
          activeTagIds={new Set(["design"])}
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          tagFilterResultCount={5}
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    await screen.findByText("Navigation")
    const showResults = screen.getByRole("button", {
      name: "Show 5 bookmarks",
    })
    expect(showResults.classList.contains("h-9")).toBe(true)
    expect(showResults.classList.contains("h-10")).toBe(false)
  })

  it("keeps mobile navigation open under nested command search", async () => {
    render(
      <SidebarProvider>
        <MobileDashboardNavigation
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })

    fireEvent.click(navigationTrigger)
    await screen.findByText("Navigation")
    fireEvent.click(screen.getByRole("button", { name: "Search⌘K" }))

    expect(await screen.findByRole("combobox")).not.toBeNull()
    expect(
      document.querySelector("[data-slot=command-dialog-backdrop]")
    ).not.toBeNull()
    expect(navigationTrigger.getAttribute("aria-expanded")).toBe("true")
  })

  it("opens mobile display choices in a nested dialog", async () => {
    render(
      <SidebarProvider>
        <MobileDashboardNavigation
          initialDisclosures={{ collections: true, tags: true }}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })

    fireEvent.click(navigationTrigger)
    await screen.findByText("Navigation")
    fireEvent.click(screen.getByRole("button", { name: "Display" }))

    expect(
      await screen.findByRole("heading", { name: "Display" })
    ).not.toBeNull()
    const displayPopup = document.querySelector<HTMLElement>(
      "[data-slot=dialog-popup]"
    )
    expect(document.querySelector("[data-slot=dialog-backdrop]")).not.toBeNull()
    expect(displayPopup?.className).toContain("max-sm:origin-bottom")
    expect(navigationTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("radio", { name: "List" })).not.toBeNull()
    expect(
      screen.getByRole("radio", { name: "Grid with images" })
    ).not.toBeNull()
    expect(screen.queryByRole("radio", { name: "Grid" })).toBeNull()
  })
})
