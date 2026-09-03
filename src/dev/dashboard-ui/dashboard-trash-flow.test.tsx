import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { toastManager } from "@/components/ui/toast"
import type { BookmarkBulkAction } from "@/dev/dashboard-ui/bookmark-selection"
import {
  DashboardUiPage,
  type BookmarkBulkMutationFixture,
} from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

beforeEach(() => {
  toastManager.close()
})

afterEach(() => {
  cleanup()
  toastManager.close()
})

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

function openTrash(desktopSidebar: HTMLElement): void {
  fireEvent.click(within(desktopSidebar).getByRole("button", { name: "Trash" }))
}

function enterSelection(bookmarkTitle: string): void {
  fireEvent.click(
    screen.getByRole("button", { name: `Actions for ${bookmarkTitle}` })
  )
  fireEvent.click(screen.getByRole("button", { name: "Select" }))
}

describe("dashboard Trash flow", () => {
  it("opens as a recovery destination with fixed recovery windows", () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)
    const trash = sidebar.getByRole("button", { name: "Trash" })

    fireEvent.click(trash)

    expect(trash.getAttribute("data-active")).toBe("true")
    expect(within(main).getByRole("heading", { name: "Trash" })).not.toBeNull()
    expect(
      within(main).getByRole("link", { name: "A List Apart" })
    ).not.toBeNull()
    expect(
      within(main).getByRole("link", { name: "Smashing Magazine" })
    ).not.toBeNull()
    expect(
      within(main).getByLabelText("From Reading list. 29 days left to restore")
    ).not.toBeNull()
    expect(
      within(main).getByLabelText(
        "From Design references. 12 days left to restore"
      )
    ).not.toBeNull()
    expect(
      within(main).getByLabelText("From Uncollected. 1 day left to restore")
    ).not.toBeNull()

    fireEvent.click(sidebar.getByRole("button", { name: "All bookmarks" }))
    expect(
      within(main).queryByRole("link", { name: "A List Apart" })
    ).toBeNull()
    expect(
      within(main).queryByRole("link", { name: "Smashing Magazine" })
    ).toBeNull()
  })

  it("keeps recovery context in both grid views", async () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)
    openTrash(desktopSidebar)

    for (const view of ["Grid", "Grid with images"]) {
      fireEvent.click(sidebar.getByRole("button", { name: "Display" }))
      fireEvent.click(await screen.findByRole("menuitemradio", { name: view }))
      expect(
        within(main).getByLabelText(
          "From Reading list. 29 days left to restore"
        )
      ).not.toBeNull()
      expect(
        within(main).getByRole("link", { name: "A List Apart" })
      ).not.toBeNull()
    }
  })

  it("keeps the retention clock when a trashed bookmark loses its source collection", async () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)

    fireEvent.click(
      sidebar.getAllByRole("button", { name: "Actions for Research" })[0]
    )
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete collection" }))

    await waitFor(() => {
      expect(
        screen.getByText("Deleted Research and 2 nested collections")
      ).not.toBeNull()
    })

    openTrash(desktopSidebar)
    expect(
      within(main).getByLabelText("From Uncollected. 29 days left to restore")
    ).not.toBeNull()
    expect(
      within(main).getByLabelText("From Uncollected. 12 days left to restore")
    ).not.toBeNull()
  })

  it("keeps trashed bookmarks out of command search", async () => {
    const { desktopSidebar } = renderPage()
    fireEvent.click(
      within(desktopSidebar).getByRole("button", { name: /Search/ })
    )
    const input = await screen.findByRole("combobox")
    const popup = input.closest<HTMLElement>("[data-slot=command-dialog-popup]")
    if (!popup) throw new Error("Command dialog did not render.")

    fireEvent.change(input, { target: { value: "A List Apart" } })
    expect(await within(popup).findByText("No results found.")).not.toBeNull()
  })

  it("opens Trash from mobile navigation and closes the drawer", async () => {
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
    fireEvent.click(within(drawer).getByRole("button", { name: "Trash" }))

    await waitFor(() => {
      expect(navigationTrigger.getAttribute("aria-expanded")).toBe("false")
    })
    expect(within(main).getByRole("heading", { name: "Trash" })).not.toBeNull()
  })

  it("restores one bookmark to its prior collection and permanently deletes another", async () => {
    const { desktopSidebar, main } = renderPage()
    const sidebar = within(desktopSidebar)
    openTrash(desktopSidebar)

    fireEvent.click(
      screen.getByRole("button", { name: "Actions for A List Apart" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Restore" }))

    await waitFor(() => {
      expect(
        within(main).queryByRole("link", { name: "A List Apart" })
      ).toBeNull()
    })
    expect(screen.getByText("Restored to Reading list")).not.toBeNull()

    fireEvent.click(sidebar.getByRole("button", { name: "Reading list" }))
    expect(
      within(main).getByRole("link", { name: "A List Apart" })
    ).not.toBeNull()

    openTrash(desktopSidebar)
    fireEvent.click(
      screen.getByRole("button", { name: "Actions for Smashing Magazine" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }))
    const heading = await screen.findByRole("heading", {
      name: "Delete bookmark forever?",
    })
    const dialog = heading.closest<HTMLElement>(
      "[data-slot=alert-dialog-popup]"
    )
    if (!dialog) throw new Error("Permanent-delete dialog did not render.")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete forever" })
    )

    await waitFor(() => {
      expect(
        within(main).queryByRole("link", { name: "Smashing Magazine" })
      ).toBeNull()
    })
    expect(screen.getByText("Deleted Smashing Magazine forever")).not.toBeNull()
  })

  it("restores a mixed selection with one summary and reaches the empty state", async () => {
    const fixture: BookmarkBulkMutationFixture = async () => undefined
    const { desktopSidebar, main } = renderPage(fixture)
    openTrash(desktopSidebar)
    enterSelection("A List Apart")

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 1 selected bookmark",
      })
    )
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(within(main).getByText("3 selected")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Restore" }))

    await waitFor(() => {
      expect(within(main).getByText("Trash is empty")).not.toBeNull()
    })
    expect(screen.getByText("Restored 3 bookmarks")).not.toBeNull()
    expect(
      screen.getByText("Returned to their previous collections or Uncollected.")
    ).not.toBeNull()
  })

  it("rolls back failed permanent deletion and keeps the selection", async () => {
    let rejectMutation: ((reason: Error) => void) | undefined
    const fixture = (action: BookmarkBulkAction): Promise<void> => {
      if (action.kind !== "delete-forever") return Promise.resolve()

      return new Promise((_, reject) => {
        rejectMutation = reject
      })
    }
    const { desktopSidebar, main } = renderPage(fixture)
    openTrash(desktopSidebar)
    enterSelection("A List Apart")
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 1 selected bookmark",
      })
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }))

    const heading = await screen.findByRole("heading", {
      name: "Delete selected bookmarks forever?",
    })
    const dialog = heading.closest<HTMLElement>(
      "[data-slot=alert-dialog-popup]"
    )
    if (!dialog) throw new Error("Bulk permanent-delete dialog did not render.")
    const deleteButton = within(dialog).getByRole("button", {
      name: "Delete forever",
    })
    fireEvent.click(deleteButton)

    expect(deleteButton.hasAttribute("disabled")).toBe(true)
    if (!rejectMutation) throw new Error("Mutation fixture did not start.")
    await act(async () => rejectMutation?.(new Error("fixture failure")))

    await waitFor(() => {
      expect(
        screen.getAllByText("Could not delete bookmarks forever").length
      ).toBeGreaterThan(0)
    })
    expect(
      within(dialog).getByRole("heading", {
        name: "Delete selected bookmarks forever?",
      })
    ).not.toBeNull()
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(
        within(main)
          .getByRole("checkbox", { name: "A List Apart" })
          .getAttribute("aria-checked")
      ).toBe("true")
    })
    expect(within(main).getByText("1 selected")).not.toBeNull()
    expect(
      within(main).getByLabelText("From Reading list. 29 days left to restore")
    ).not.toBeNull()
  })
})
