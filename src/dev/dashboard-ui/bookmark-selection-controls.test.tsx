import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BookmarkSelectionMutation } from "@/dev/dashboard-ui/bookmark-selection"
import { BookmarkSelectionBars } from "@/dev/dashboard-ui/bookmark-selection-controls"
import {
  mockBookmarks,
  mockCollections,
} from "@/dev/dashboard-ui/mock-bookmarks"

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const idleMutation: BookmarkSelectionMutation = { status: "idle" }

function renderBars({
  mutation = idleMutation,
  selectedIds = new Set(["1", "2"]),
}: {
  mutation?: BookmarkSelectionMutation
  selectedIds?: ReadonlySet<string>
} = {}) {
  const onClose = vi.fn<() => void>()
  const onRunAction = vi.fn<
    React.ComponentProps<typeof BookmarkSelectionBars>["onRunAction"]
  >(() => Promise.resolve(true))
  const onToggleAll = vi.fn<() => void>()
  const result = render(
    <BookmarkSelectionBars
      activeCollectionId="research"
      allVisibleSelected={false}
      bookmarks={mockBookmarks}
      collections={mockCollections}
      mutation={mutation}
      onClose={onClose}
      onRunAction={onRunAction}
      onToggleAll={onToggleAll}
      selectedCount={selectedIds.size}
      selectedIds={selectedIds}
      visibleCount={8}
    />
  )

  return { ...result, onClose, onRunAction, onToggleAll }
}

describe("bookmark selection controls", () => {
  it("opens one reachable mobile action sheet", async () => {
    const { onToggleAll } = renderBars()

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 2 selected bookmarks",
      })
    )

    expect(
      await screen.findByRole("heading", { name: "Bookmark actions" })
    ).not.toBeNull()
    expect(screen.getByText("2 selected bookmarks")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(onToggleAll).toHaveBeenCalledOnce()
  })

  it("keeps bulk actions disabled at zero selected", () => {
    renderBars({ selectedIds: new Set() })

    expect(screen.getByText("0 selected")).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 0 selected bookmarks",
      })
    )
    expect(
      screen.getByRole("button", { name: "Add" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "Move" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "Delete" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen
        .getByRole("button", { name: "Select all" })
        .hasAttribute("disabled")
    ).toBe(false)
  })

  it("confirms Delete with the stable selected count", async () => {
    const { onRunAction } = renderBars()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open actions for 2 selected bookmarks",
      })
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(
      await screen.findByRole("heading", {
        name: "Delete selected bookmarks?",
      })
    ).not.toBeNull()
    expect(
      screen.getByText(/2 selected bookmarks will move to Trash/)
    ).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Delete bookmarks" }))
    await waitFor(() => {
      expect(onRunAction).toHaveBeenCalledWith(
        { kind: "delete" },
        expect.any(HTMLElement)
      )
    })
  })
})
