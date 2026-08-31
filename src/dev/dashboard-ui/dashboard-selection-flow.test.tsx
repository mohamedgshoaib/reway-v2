import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toastManager } from "@/components/ui/toast"
import { mockBookmarks } from "@/dev/dashboard-ui/mock-bookmarks"
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

function renderPage(bulkMutationFixture?: BookmarkBulkMutationFixture) {
  return render(
    <DashboardUiPage
      bulkMutationFixture={bulkMutationFixture}
      initialNavigationPreferences={navigationPreferences}
    />
  )
}

function enterSelectionFromBookmarkMenu(bookmarkTitle: string): void {
  fireEvent.click(
    screen.getByRole("button", { name: `Actions for ${bookmarkTitle}` })
  )
  fireEvent.click(screen.getByRole("button", { name: "Select" }))
}

describe("dashboard bookmark selection flow", () => {
  it("enters from the bookmark menu and restores its trigger on Escape", async () => {
    renderPage()
    const bookmark = mockBookmarks[0]

    enterSelectionFromBookmarkMenu(bookmark.title)

    expect(screen.getByText("1 selected")).not.toBeNull()
    const selectedCheckbox = screen.getByRole("checkbox", {
      name: bookmark.title,
    })
    expect(selectedCheckbox.getAttribute("aria-checked")).toBe("true")
    expect(screen.queryByRole("link", { name: bookmark.title })).toBeNull()
    expect(
      screen.queryByRole("button", {
        name: `Actions for ${bookmark.title}, selected`,
      })
    ).toBeNull()

    fireEvent.keyDown(selectedCheckbox, { key: "Escape" })

    await waitFor(() => {
      expect(screen.getByRole("link", { name: bookmark.title })).not.toBeNull()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("button", {
          name: `Actions for ${bookmark.title}`,
        })
      )
    })
  })

  it("keeps zero selected visible and supports destination-scoped Select all", () => {
    renderPage()
    const bookmark = mockBookmarks[0]

    enterSelectionFromBookmarkMenu(bookmark.title)
    fireEvent.click(screen.getByRole("checkbox", { name: bookmark.title }))
    expect(screen.getByText("0 selected")).not.toBeNull()

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 0 selected bookmarks",
      })
    )
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByText("8 selected")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Clear all" })).not.toBeNull()
  })

  it("rolls back a failed bulk action and preserves the selection", async () => {
    const bulkMutationFixture = vi
      .fn<BookmarkBulkMutationFixture>()
      .mockRejectedValue(new Error("Fixture failure"))
    renderPage(bulkMutationFixture)
    const bookmark = mockBookmarks[0]

    enterSelectionFromBookmarkMenu(bookmark.title)
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 1 selected bookmark",
      })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Remove from this collection" })
    )

    expect(
      (await screen.findAllByText("Could not remove bookmarks")).length
    ).toBeGreaterThan(0)
    expect(screen.getByText("1 selected")).not.toBeNull()
    expect(
      screen
        .getByRole("checkbox", { name: bookmark.title })
        .getAttribute("aria-checked")
    ).toBe("true")
    expect(bulkMutationFixture).toHaveBeenCalledOnce()
  })
})
