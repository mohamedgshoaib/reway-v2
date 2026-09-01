import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  DashboardUiPage,
  type BookmarkBulkMutationFixture,
} from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

afterEach(cleanup)

function renderPage(bulkMutationFixture?: BookmarkBulkMutationFixture): {
  desktopSidebar: HTMLElement
  main: HTMLElement
} {
  const view = render(
    <DashboardUiPage
      bulkMutationFixture={bulkMutationFixture}
      initialNavigationPreferences={navigationPreferences}
    />
  )
  const desktopSidebar = view.container.querySelector<HTMLElement>("aside")
  const main = view.container.querySelector<HTMLElement>("main")

  if (!(desktopSidebar && main)) {
    throw new Error("Dashboard shell did not render.")
  }

  return { desktopSidebar, main }
}

function enterSelectionFromBookmarkMenu(bookmarkTitle: string): void {
  fireEvent.click(
    screen.getByRole("button", { name: `Actions for ${bookmarkTitle}` })
  )
  fireEvent.click(screen.getByRole("button", { name: "Select" }))
}

describe("dashboard tag filtering flow", () => {
  it("toggles OR filters and exposes removable filters in the main panel", () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)

    const design = sidebar.getByRole("button", { name: "Filter by Design" })
    fireEvent.click(design)

    expect(design.getAttribute("aria-pressed")).toBe("true")
    expect(within(main).getByRole("heading", { name: "Design" })).not.toBeNull()
    const designFilter = within(main).getByRole("button", {
      name: "Remove Design filter",
    })
    expect(designFilter.className).toContain("h-7")
    expect(designFilter.className).toContain("pointer-coarse:after:min-h-11")
    expect(designFilter.className).not.toContain("pointer-coarse:h-11")
    expect(within(main).getByRole("link", { name: "Figma" })).not.toBeNull()
    expect(within(main).queryByRole("link", { name: "Claude" })).toBeNull()

    const engineering = sidebar.getByRole("button", {
      name: "Filter by Engineering",
    })
    fireEvent.click(engineering)

    expect(engineering.getAttribute("aria-pressed")).toBe("true")
    expect(within(main).getByRole("heading", { name: "2 tags" })).not.toBeNull()
    expect(within(main).getByRole("link", { name: "Figma" })).not.toBeNull()
    expect(within(main).getByRole("link", { name: "Claude" })).not.toBeNull()

    fireEvent.click(
      within(main).getByRole("button", { name: "Remove Design filter" })
    )
    expect(
      within(main).getByRole("heading", { name: "Engineering" })
    ).not.toBeNull()
    expect(within(main).queryByRole("link", { name: "Figma" })).toBeNull()

    fireEvent.click(
      within(main).getByRole("button", { name: "Clear tag filters" })
    )
    expect(
      within(main).getByRole("heading", { name: "All bookmarks" })
    ).not.toBeNull()
    expect(
      sidebar
        .getByRole("button", { name: "Filter by Engineering" })
        .getAttribute("aria-pressed")
    ).toBe("false")
  })

  it("clears bookmark selection when the active tag set changes", () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)

    fireEvent.click(sidebar.getByRole("button", { name: "Filter by Design" }))
    enterSelectionFromBookmarkMenu("Figma")
    expect(within(main).getByText("1 selected")).not.toBeNull()

    fireEvent.click(
      sidebar.getByRole("button", { name: "Filter by Engineering" })
    )

    expect(within(main).queryByText("1 selected")).toBeNull()
    expect(within(main).getByRole("heading", { name: "2 tags" })).not.toBeNull()
    expect(within(main).queryByRole("checkbox", { name: "Figma" })).toBeNull()
  })

  it("keeps mobile navigation open while filtering and returns focus from Show", async () => {
    const { main } = renderPage()
    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })
    fireEvent.click(navigationTrigger)

    const navigationTitle = await screen.findByText("Navigation")
    const drawer = navigationTitle.closest<HTMLElement>(
      "[data-slot=drawer-popup]"
    )
    if (!drawer) throw new Error("Mobile navigation drawer did not render.")
    const navigation = within(drawer)

    fireEvent.click(
      navigation.getByRole("button", { name: "Filter by Research" })
    )

    expect(navigationTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(
      navigation.getByRole("button", { name: "Show 4 bookmarks" })
    ).not.toBeNull()
    expect(
      within(main).getByText("Research filter added. 4 bookmarks shown.")
    ).not.toBeNull()

    fireEvent.click(
      navigation.getByRole("button", { name: "Filter by Design" })
    )
    expect(
      navigation.getByRole("button", { name: "Show 11 bookmarks" })
    ).not.toBeNull()
    expect(
      within(main).getByText("Design filter added. 11 bookmarks shown.")
    ).not.toBeNull()
    expect(
      within(main).queryByText("Research filter added. 4 bookmarks shown.")
    ).toBeNull()

    fireEvent.click(
      navigation.getByRole("button", { name: "Show 11 bookmarks" })
    )

    await waitFor(() => {
      expect(navigationTrigger.getAttribute("aria-expanded")).toBe("false")
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(navigationTrigger)
    })
    expect(within(main).getByRole("heading", { name: "2 tags" })).not.toBeNull()
  })

  it("removes a deleted active tag and falls back to All bookmarks", async () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)

    fireEvent.click(sidebar.getByRole("button", { name: "Filter by Design" }))
    fireEvent.click(sidebar.getByRole("button", { name: "Actions for Design" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete tag" }))

    await waitFor(() => {
      expect(
        within(main).getByRole("heading", { name: "All bookmarks" })
      ).not.toBeNull()
    })
    expect(
      sidebar.queryByRole("button", { name: "Filter by Design" })
    ).toBeNull()
  })
})

describe("dashboard Uncollected flow", () => {
  it("opens as a system destination with system sorts and no reorder", async () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)
    const uncollected = sidebar.getByRole("button", { name: "Uncollected" })

    fireEvent.click(uncollected)

    expect(uncollected.getAttribute("data-active")).toBe("true")
    expect(
      within(main).getByRole("heading", { name: "Uncollected" })
    ).not.toBeNull()
    expect(
      within(main).getByRole("link", { name: "Next.js Dev Tools" })
    ).not.toBeNull()
    expect(within(main).queryByRole("link", { name: "Claude" })).toBeNull()

    fireEvent.click(sidebar.getByRole("button", { name: "Display" }))

    expect(
      await screen.findByRole("menuitemradio", { name: "Date added" })
    ).not.toBeNull()
    expect(
      screen.queryByRole("menuitemradio", { name: "Custom order" })
    ).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Reorder items" })).toBeNull()
  })

  it("does not offer collection removal in selection mode", () => {
    const { desktopSidebar } = renderPage()
    const sidebar = within(desktopSidebar)

    fireEvent.click(sidebar.getByRole("button", { name: "Uncollected" }))
    enterSelectionFromBookmarkMenu("Next.js Dev Tools")
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 1 selected bookmark",
      })
    )

    expect(
      screen.queryByRole("button", { name: "Remove from this collection" })
    ).toBeNull()
    expect(screen.getAllByText("Add").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Move").length).toBeGreaterThan(0)
  })

  it("closes mobile navigation after opening Uncollected", async () => {
    const { main } = renderPage()
    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })

    fireEvent.click(navigationTrigger)
    const navigationTitle = await screen.findByText("Navigation")
    const drawer = navigationTitle.closest<HTMLElement>(
      "[data-slot=drawer-popup]"
    )
    if (!drawer) throw new Error("Mobile navigation drawer did not render.")

    fireEvent.click(within(drawer).getByRole("button", { name: "Uncollected" }))

    await waitFor(() => {
      expect(navigationTrigger.getAttribute("aria-expanded")).toBe("false")
    })
    expect(
      within(main).getByRole("heading", { name: "Uncollected" })
    ).not.toBeNull()
  })

  it("receives collection removals and keeps counts and tags current", async () => {
    const { desktopSidebar, main } = renderPage(async () => undefined)
    const sidebar = within(desktopSidebar)
    const research = sidebar.getByRole("button", { name: "Research" })
    const researchItem = research.closest<HTMLElement>(
      "[data-slot=sidebar-menu-item]"
    )
    if (!researchItem) throw new Error("Research row did not render.")

    expect(within(researchItem).getByText("8")).not.toBeNull()
    enterSelectionFromBookmarkMenu("Claude")
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 1 selected bookmark",
      })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Remove from this collection" })
    )

    await waitFor(() => {
      expect(within(main).queryByRole("link", { name: "Claude" })).toBeNull()
    })
    expect(within(researchItem).getByText("7")).not.toBeNull()

    fireEvent.click(sidebar.getByRole("button", { name: "Uncollected" }))
    expect(within(main).getByRole("link", { name: "Claude" })).not.toBeNull()

    fireEvent.click(
      sidebar.getByRole("button", { name: "Filter by Engineering" })
    )
    expect(
      within(main).getByRole("heading", { name: "Engineering" })
    ).not.toBeNull()
    expect(within(main).getByRole("link", { name: "Claude" })).not.toBeNull()
  })
})
