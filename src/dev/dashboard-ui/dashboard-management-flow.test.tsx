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

import { toastManager } from "@/components/ui/toast"
import type { DashboardManagementMutationFixture } from "@/dev/dashboard-ui/dashboard-management-state"
import { DashboardUiPage } from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

function deferred(): {
  promise: Promise<void>
  reject: (error: Error) => void
  resolve: () => void
} {
  let rejectPromise: ((error: Error) => void) | undefined
  let resolvePromise: (() => void) | undefined
  const promise = new Promise<void>((resolve, reject) => {
    rejectPromise = reject
    resolvePromise = resolve
  })

  return {
    promise,
    reject: (error) => rejectPromise?.(error),
    resolve: () => resolvePromise?.(),
  }
}

function renderPage(
  managementMutationFixture: DashboardManagementMutationFixture
): HTMLElement {
  const view = render(
    <DashboardUiPage
      initialNavigationPreferences={navigationPreferences}
      managementMutationFixture={managementMutationFixture}
    />
  )
  const sidebar = view.container.querySelector<HTMLElement>("aside")
  if (!sidebar) throw new Error("Dashboard sidebar did not render.")
  return sidebar
}

beforeEach(() => {
  toastManager.close()
})

afterEach(() => {
  cleanup()
  toastManager.close()
  vi.restoreAllMocks()
})

describe("dashboard management feedback", () => {
  it("creates a tag optimistically, names the result, and restores focus", async () => {
    const sidebar = renderPage(async () => undefined)
    const create = within(sidebar).getByRole("button", { name: "New tag" })

    fireEvent.click(create)
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Watch later" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect(
      within(sidebar).getByRole("button", { name: "Filter by Watch later" })
    ).not.toBeNull()
    expect(screen.getByText("Created Watch later")).not.toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(create))
  })

  it("rolls back a failed create and reopens its preserved draft on Retry", async () => {
    const failedCreate = deferred()
    const mutationFixture = vi
      .fn<DashboardManagementMutationFixture>()
      .mockReturnValueOnce(failedCreate.promise)
      .mockResolvedValueOnce(undefined)
    const sidebar = renderPage(mutationFixture)

    fireEvent.click(within(sidebar).getByRole("button", { name: "New tag" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Watch later" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    await act(async () => failedCreate.reject(new Error("fixture failure")))

    await waitFor(() => {
      expect(screen.getAllByText("Could not create Watch later")).toHaveLength(
        2
      )
    })
    expect(
      within(sidebar).queryByRole("button", { name: "Filter by Watch later" })
    ).toBeNull()

    fireEvent.click(screen.getByText("Retry"))

    expect(screen.getByRole("heading", { name: "New tag" })).not.toBeNull()
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveProperty(
      "value",
      "Watch later"
    )
    expect(
      screen.getByText("Could not save this tag. Try again.")
    ).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    await waitFor(() => {
      expect(
        within(sidebar).getByRole("button", { name: "Filter by Watch later" })
      ).not.toBeNull()
    })
    expect(mutationFixture).toHaveBeenCalledTimes(2)
  })

  it("keeps a dirty editor open on outside press but lets Escape discard it", async () => {
    const sidebar = renderPage(async () => undefined)

    fireEvent.click(
      within(sidebar).getByRole("button", { name: "Actions for Design" })
    )
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Visual design" },
    })

    fireEvent.pointerDown(document.body)
    expect(screen.getByRole("heading", { name: "Edit tag" })).not.toBeNull()

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Edit tag" })).toBeNull()
    })
    expect(
      within(sidebar).getByRole("button", { name: "Filter by Design" })
    ).not.toBeNull()
  })

  it("blocks dismissal while tag deletion is pending", async () => {
    const pendingDelete = deferred()
    const sidebar = renderPage((mutation) =>
      mutation.kind === "tag-delete" ? pendingDelete.promise : Promise.resolve()
    )

    fireEvent.click(
      within(sidebar).getByRole("button", { name: "Actions for Design" })
    )
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete tag" }))

    const pendingButton = screen.getByRole("button", { name: "Deleting…" })
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)

    fireEvent.keyDown(document, { key: "Escape" })
    expect(
      screen.getByRole("heading", { name: "Delete Design?" })
    ).not.toBeNull()

    await act(async () => pendingDelete.resolve())
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Delete Design?" })
      ).toBeNull()
    })
    expect(screen.getByText("Deleted Design")).not.toBeNull()
    await waitFor(() => {
      expect(document.activeElement).toBe(
        within(sidebar).getByRole("button", { name: "Tags" })
      )
    })
  })

  it("restores the complete collection snapshot with edit Undo", async () => {
    const sidebar = renderPage(async () => undefined)

    const researchRow = within(sidebar)
      .getByRole("button", { name: "Research" })
      .closest<HTMLElement>("li")
    if (!researchRow) throw new Error("Research collection row did not render.")
    fireEvent.click(
      within(researchRow).getByRole("button", { name: "Actions for Research" })
    )
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Source material" },
    })
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      within(sidebar).getByRole("button", { name: "Source material" })
    ).not.toBeNull()
    expect(screen.getByText("Updated Source material")).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))

    const restored = within(sidebar).getByRole("button", { name: "Research" })
    expect(restored).not.toBeNull()
    expect(restored.querySelector("svg")?.getAttribute("class")).toContain(
      "text-teal-700"
    )
    expect(screen.getByText("Restored Research")).not.toBeNull()
  })

  it("updates a bookmark title with one named Undo result", async () => {
    renderPage(async () => undefined)

    fireEvent.click(screen.getByRole("button", { name: "Actions for Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Claude docs" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(screen.getByRole("link", { name: "Claude docs" })).not.toBeNull()
    expect(screen.getByText("Updated Claude docs")).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(screen.getByRole("link", { name: "Claude" })).not.toBeNull()
    expect(screen.getByText("Restored Claude")).not.toBeNull()
  })

  it("ignores a stale failure after a newer edit of the same bookmark", async () => {
    const firstUpdate = deferred()
    const mutationFixture = vi
      .fn<DashboardManagementMutationFixture>()
      .mockReturnValueOnce(firstUpdate.promise)
      .mockResolvedValueOnce(undefined)
    renderPage(mutationFixture)

    fireEvent.click(screen.getByRole("button", { name: "Actions for Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Claude docs" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    fireEvent.click(
      screen.getByRole("button", { name: "Actions for Claude docs" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Claude reference" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await act(async () => firstUpdate.reject(new Error("stale failure")))

    expect(
      screen.getByRole("link", { name: "Claude reference" })
    ).not.toBeNull()
    expect(screen.getByText("Updated Claude reference")).not.toBeNull()
    expect(screen.queryByText("Could not update Claude docs")).toBeNull()
    expect(mutationFixture).toHaveBeenCalledTimes(2)
  })

  it("names a single-bookmark move and updates the current destination", () => {
    renderPage(async () => undefined)

    fireEvent.click(screen.getByRole("button", { name: "Actions for Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Move to collection" }))
    fireEvent.click(screen.getByRole("button", { name: "Client work" }))

    expect(screen.queryByRole("link", { name: "Claude" })).toBeNull()
    expect(screen.getByText("Moved Claude to Client work")).not.toBeNull()
  })
})
