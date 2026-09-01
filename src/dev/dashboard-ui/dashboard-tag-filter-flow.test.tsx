import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardUiPage } from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

afterEach(cleanup)

function renderPage(): {
  desktopSidebar: HTMLElement
  main: HTMLElement
} {
  const view = render(
    <DashboardUiPage initialNavigationPreferences={navigationPreferences} />
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
