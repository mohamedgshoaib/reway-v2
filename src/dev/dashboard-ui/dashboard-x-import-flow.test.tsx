import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardUiPage } from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

function renderPage(): void {
  render(
    <DashboardUiPage initialNavigationPreferences={navigationPreferences} />
  )
}

function openSettingsPage(
  name: "Profile" | "Account" | "Import" | "Demo"
): void {
  const navigation = screen.getByRole("navigation", {
    name: "Settings pages",
  })
  fireEvent.click(within(navigation).getByRole("button", { name }))
}

function chooseArchive(fileName = "bookmarks.js"): void {
  fireEvent.change(screen.getByLabelText("X bookmark file"), {
    target: {
      files: [new File(["fixture"], fileName, { type: "text/javascript" })],
    },
  })
}

function chooseDemoOption(fieldName: string, optionName: string): void {
  fireEvent.click(screen.getByRole("combobox", { name: fieldName }))
  const option = screen.getAllByRole("option", { name: optionName }).at(-1)
  if (!option) throw new Error(`Missing ${optionName} option.`)
  fireEvent.pointerDown(option)
  fireEvent.pointerUp(option)
  fireEvent.click(option)
}

async function finishImport(itemCount: number): Promise<void> {
  const fixtureStepCount = itemCount + 2
  for (let step = 0; step < fixtureStepCount; step += 1) {
    await act(async () => vi.runOnlyPendingTimersAsync())
  }
}

beforeEach(() => {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("dashboard X import flow", () => {
  it("opens the shared Import page from the Collections menu", () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Collection options" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Import from X" }))

    expect(screen.getByRole("heading", { name: "Import" })).not.toBeNull()
    const settingsNavigation = screen.getByRole("navigation", {
      name: "Settings pages",
    })
    expect(
      within(settingsNavigation)
        .getByRole("button", { name: "Import" })
        .getAttribute("aria-current")
    ).toBe("page")
  })

  it("reviews a file with every bookmark selected and supports selection changes", () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    openSettingsPage("Import")
    chooseArchive("BOOKMARK.JS")

    expect(screen.getByText("6 bookmarks selected")).not.toBeNull()
    const reviewSelection = screen.getByRole("group", {
      name: "Bookmarks to import",
    })
    expect(within(reviewSelection).getAllByRole("checkbox")).toHaveLength(6)

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }))
    expect(screen.getByText("0 bookmarks selected")).not.toBeNull()
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Import 0 bookmarks",
      }).disabled
    ).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByText("6 bookmarks selected")).not.toBeNull()
  })

  it("keeps partial successes and retries only failed bookmarks", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    openSettingsPage("Demo")
    chooseDemoOption("Initial result", "Some fail")
    expect(
      screen.getByRole("combobox", { name: "Initial result" }).textContent
    ).toContain("Some fail")
    openSettingsPage("Import")
    chooseArchive()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Import 6 bookmarks" }))
    expect(screen.getAllByText("Preparing bookmarks")).toHaveLength(2)
    await finishImport(6)
    expect(screen.getByText("Import finished with issues")).not.toBeNull()
    expect(
      screen.getByText("Imported 4 bookmarks. Failed to import 2 bookmarks.")
    ).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: "Retry failed bookmarks" })
    )
    await finishImport(2)
    expect(screen.getByText("Import complete")).not.toBeNull()
    expect(screen.getByText("Added 6 bookmarks to X Bookmarks.")).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: "View imported bookmarks" })
    )
    await act(async () => vi.runOnlyPendingTimersAsync())
    expect(screen.getByRole("heading", { name: "X Bookmarks" })).not.toBeNull()
    expect(
      screen.getAllByText(
        "A useful breakdown of keyboard-first collection tools."
      )
    ).toHaveLength(2)
  })

  it("keeps running after Settings closes and restores the completed result", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    openSettingsPage("Import")
    chooseArchive()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Import 6 bookmarks" }))
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await finishImport(6)
    expect(screen.getByText("X import complete")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    expect(screen.getByRole("heading", { name: "Import" })).not.toBeNull()
    expect(screen.getByText("Import complete")).not.toBeNull()
  })

  it("resets the imported library and import flow with Reset demo", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    openSettingsPage("Import")
    chooseArchive()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Import 6 bookmarks" }))
    await finishImport(6)
    expect(screen.getByText("Import complete")).not.toBeNull()

    openSettingsPage("Demo")
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }))
    openSettingsPage("Import")

    expect(screen.getByLabelText("X bookmark file")).not.toBeNull()
    expect(
      screen.queryByRole("button", { hidden: true, name: "X Bookmarks" })
    ).toBeNull()
  })

  it("shows malformed, empty, and duplicate archive fixtures", () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))

    openSettingsPage("Demo")
    chooseDemoOption("Archive contents", "Malformed archive")
    openSettingsPage("Import")
    chooseArchive()
    expect(screen.getByText("Archive not ready")).not.toBeNull()

    openSettingsPage("Demo")
    chooseDemoOption("Archive contents", "Empty archive")
    openSettingsPage("Import")
    chooseArchive()
    expect(screen.getByText("No bookmarks found")).not.toBeNull()

    openSettingsPage("Demo")
    chooseDemoOption("Archive contents", "Repeated posts")
    openSettingsPage("Import")
    chooseArchive()
    expect(
      screen.getByText("7 bookmarks selected, 2 marked duplicate")
    ).not.toBeNull()
    expect(screen.getAllByText("Repeated in archive")).toHaveLength(2)
  })

  it("commits nothing when the initial import and retry both fail", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    openSettingsPage("Demo")
    chooseDemoOption("Initial result", "All fail")
    chooseDemoOption("Retry result", "All fail")
    openSettingsPage("Import")
    chooseArchive()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Import 6 bookmarks" }))
    await finishImport(6)
    expect(screen.getByText("No bookmarks imported")).not.toBeNull()
    expect(
      screen.queryByRole("button", { hidden: true, name: "X Bookmarks" })
    ).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Retry import" }))
    await finishImport(6)
    expect(screen.getByText("No bookmarks imported")).not.toBeNull()
    expect(
      screen.queryByRole("button", { hidden: true, name: "X Bookmarks" })
    ).toBeNull()
  })

  it("opens the Import page directly from mobile navigation and focuses it", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches:
        query.includes("prefers-reduced-motion") ||
        query.includes("max-width: 799px"),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }))
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    const navigationDrawer = screen
      .getByRole("heading", { name: "Navigation" })
      .closest<HTMLElement>("[data-slot=drawer-popup]")
    if (!navigationDrawer) throw new Error("Navigation drawer did not open.")

    fireEvent.click(
      within(navigationDrawer).getByRole("button", {
        name: "Collection options",
      })
    )
    fireEvent.click(screen.getByRole("menuitem", { name: "Import from X" }))

    expect(screen.getByRole("heading", { name: "Import" })).not.toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("region", { name: "Import" })
      )
    )
  })
})
