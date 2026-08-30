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

    expect(screen.getByRole("button", { name: "Display" })).not.toBeNull()
    expect(screen.queryByText("Date added")).toBeNull()
    expect(screen.queryByText("List")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Display" }))
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
