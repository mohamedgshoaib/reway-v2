import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import {
  CollectionDeleteDialog,
  type CollectionDraft,
} from "@/dev/dashboard-ui/collection-management"
import { CollectionReorderList } from "@/dev/dashboard-ui/collection-reorder"
import {
  mockCollections,
  mockTags,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"
import { TagDeleteDialog } from "@/dev/dashboard-ui/tag-management"
import type { TagDraft } from "@/dev/dashboard-ui/tag-model"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderSidebar(): void {
  render(
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
}

describe("collection UI regressions", () => {
  it("lets the row fill the space before its independent action", () => {
    renderSidebar()

    const childButton = screen.getByRole("button", {
      name: "Streaming platforms",
    })
    const childRow = childButton.closest("li")
    const count = childRow?.querySelector<HTMLElement>(
      "[data-slot=sidebar-menu-badge]"
    )
    const action = screen.getByRole("button", {
      name: "Actions for Streaming platforms",
    })
    const childIcon = childButton.querySelector("svg")

    expect(childButton.className).toContain("w-full")
    expect(childButton.className).not.toContain(
      "[&>svg]:text-sidebar-accent-foreground"
    )
    expect(childIcon?.getAttribute("class")).toContain("text-red-700")
    expect(childIcon?.getAttribute("class")).toContain("dark:text-red-400")
    expect(count?.className).toContain("peer-data-[size=md]/menu-button:top-1")
    expect(count?.className).toContain("max-[799px]:hidden")
    expect(count?.style.opacity).toBe("")
    expect(action?.className).toContain("size-6")
    expect(action?.className).toContain("rounded-md")
    expect(action?.className).toContain("after:-inset-1")
    expect(action?.className).toContain("top-1/2")
    expect(action?.className).toContain("-translate-y-1/2")
    expect(action?.className).not.toContain("peer-data-[size=md]/menu-button")
  })

  it("shows collection labels instead of stored parent values", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "New collection" }))

    const parentCollection = screen.getByRole("combobox", {
      name: "Parent collection",
    })
    expect(parentCollection.textContent).toContain("Top level")
    expect(parentCollection.textContent).not.toContain("__top_level__")
  })

  it("loads the icon combobox lazily and creates a colored collection", async () => {
    const onCreateCollection = vi.fn<(draft: CollectionDraft) => void>()

    render(
      <SidebarProvider>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onCreateCollection={onCreateCollection}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "New collection" }))

    expect(screen.queryByLabelText("Collection preview")).toBeNull()
    expect(screen.queryByRole("button", { name: "Change icon" })).toBeNull()

    const iconField = await screen.findByRole("combobox", { name: "Icon" })
    expect((iconField as HTMLInputElement).value).toBe("Folder")

    const neutral = screen.getByRole("radio", { name: "Neutral" })
    const neutralOption = neutral.parentElement
    const neutralIcon = neutralOption?.querySelector("svg")
    expect(neutral.parentElement?.querySelector("svg")).not.toBeNull()
    expect(
      neutral.parentElement?.querySelector(":scope > span:not(.sr-only)")
    ).toBeNull()
    expect(neutralOption?.className).toContain("flex")
    expect(neutralOption?.className).toContain("items-center")
    expect(neutralOption?.className).toContain("justify-center")
    expect(neutral.className).toBe("sr-only")
    expect(neutralIcon?.getAttribute("class")).toContain("size-6")
    expect(neutralOption?.className).toContain("has-data-checked:bg-accent")
    expect(neutralOption?.className).not.toContain("border-primary")
    expect(neutralOption?.className).not.toContain("grid")

    fireEvent.click(screen.getByRole("radio", { name: "Blue" }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Dinner ideas" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect(onCreateCollection).toHaveBeenCalledWith({
      color: { kind: "palette", value: "blue" },
      icon: "folder",
      name: "Dinner ideas",
      parentId: null,
    })
  })

  it("keeps new collection names neutral until submit", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "New collection" }))

    const name = screen.getByRole("textbox", { name: "Name" })
    const create = screen.getByRole("button", { name: "Create" })
    expect(name.getAttribute("aria-invalid")).toBeNull()
    expect((create as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText("Enter a collection name.")).toBeNull()

    fireEvent.blur(name)
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }))
    expect(name.getAttribute("aria-invalid")).toBeNull()
    expect(screen.queryByText("Enter a collection name.")).toBeNull()

    fireEvent.click(create)
    expect(name.getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByText("Enter a collection name.")).not.toBeNull()
    expect(document.activeElement).toBe(name)
  })

  it("keeps collection and tag header action hit areas separate", () => {
    renderSidebar()

    const collectionMenu = screen.getByRole("button", {
      name: "Collection options",
    })
    const collectionAdd = screen.getByRole("button", {
      name: "New collection",
    })
    const collectionActions = collectionMenu.closest(
      "[data-slot=sidebar-group-actions]"
    )

    expect(collectionActions).not.toBeNull()
    expect(collectionActions).toBe(collectionAdd.parentElement)
    expect(collectionActions?.className).toContain("after:min-w-0")

    const tagMenu = screen.getByRole("button", { name: "Tag options" })
    const tagAdd = screen.getByRole("button", { name: "New tag" })
    const tagActions = tagMenu.closest("[data-slot=sidebar-group-actions]")

    expect(tagActions).not.toBeNull()
    expect(tagActions).toBe(tagAdd.parentElement)
    expect(tagActions?.className).toContain("after:min-w-0")
  })

  it("commits a keyboard reorder from the drag handle", () => {
    const onMove =
      vi.fn<
        (sourceId: string, parentId: string | null, index: number) => void
      >()

    render(
      <SidebarProvider>
        <CollectionReorderList collections={mockCollections} onMove={onMove} />
      </SidebarProvider>
    )

    const handle = screen.getByRole("button", { name: "Move Research" })
    handle.focus()
    fireEvent.keyDown(handle, { code: "ArrowDown", key: "ArrowDown" })

    expect(onMove).toHaveBeenCalledWith("research", null, 1)
  })

  it("keeps reorder pointer gestures out of a parent drawer", () => {
    const onParentPointerDown = vi.fn<() => void>()

    render(
      <div onPointerDown={onParentPointerDown}>
        <SidebarProvider>
          <CollectionReorderList
            collections={mockCollections}
            onMove={vi.fn<
              (sourceId: string, parentId: string | null, index: number) => void
            >()}
          />
        </SidebarProvider>
      </div>
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Move Research" }))

    expect(onParentPointerDown).not.toHaveBeenCalled()
  })

  it("uses one flat sortable list without competing nest targets", () => {
    render(
      <SidebarProvider>
        <CollectionReorderList
          collections={mockCollections}
          onMove={vi.fn<
            (sourceId: string, parentId: string | null, index: number) => void
          >()}
        />
      </SidebarProvider>
    )

    expect(screen.queryByText(/Move into/i)).toBeNull()
    expect(screen.queryByText(/Move nested collections first/i)).toBeNull()
    expect(screen.queryByText(/Move to top level/i)).toBeNull()
    expect(document.querySelector("[data-collection-nest-target]")).toBeNull()

    const list = screen.getByRole("list", {
      name: "Reordering collections",
    })
    expect(list.querySelectorAll(":scope > li")).toHaveLength(
      mockCollections.length
    )
    expect(list.querySelector('[data-collection-depth="1"]')).not.toBeNull()
  })

  it("enters explicit collection reorder mode from the section menu", async () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Collection options" }))
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Custom" }))
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Reorder collections" })
    )

    const handle = screen.getByRole("button", { name: "Move Research" })
    await waitFor(() => {
      expect(handle.getAttribute("aria-roledescription")).toBe("draggable")
    })
    expect(screen.getByText("Reordering collections")).not.toBeNull()
    const done = screen.getByRole("button", { name: "Done" })
    const actions = done.closest("[data-slot=sidebar-group-actions]")
    expect(actions?.className).not.toContain("pointer-fine:opacity-0")
  })

  it("creates a flat tag with its color identity", () => {
    const onCreateTag = vi.fn<(draft: TagDraft) => void>()

    render(
      <SidebarProvider>
        <DashboardSidebar
          initialDisclosures={{ collections: true, tags: true }}
          onCreateTag={onCreateTag}
          onSortChange={vi.fn<(sort: SortOption) => void>()}
          onViewModeChange={vi.fn<(viewMode: ViewMode) => void>()}
          sort="date"
          viewMode="list"
        />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "New tag" }))
    expect(screen.queryByRole("button", { name: "Custom" })).toBeNull()

    const roseOption = screen.getByRole("radio", { name: "Rose" })
    expect(roseOption.parentElement?.querySelector("svg")).not.toBeNull()

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Watch later" },
    })
    fireEvent.click(roseOption)
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect(onCreateTag).toHaveBeenCalledWith({
      color: { kind: "palette", value: "rose" },
      name: "Watch later",
    })
  })

  it("keeps new tag names neutral until submit", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "New tag" }))

    const name = screen.getByRole("textbox", { name: "Name" })
    const create = screen.getByRole("button", { name: "Create" })
    expect(name.getAttribute("aria-invalid")).toBeNull()
    expect((create as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText("Enter a tag name.")).toBeNull()

    fireEvent.blur(name)
    fireEvent.click(screen.getByRole("radio", { name: "Rose" }))
    expect(name.getAttribute("aria-invalid")).toBeNull()
    expect(screen.queryByText("Enter a tag name.")).toBeNull()

    fireEvent.click(create)
    expect(name.getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByText("Enter a tag name.")).not.toBeNull()
  })

  it("keeps destructive confirmations focused on the decision", () => {
    const collectionDialog = render(
      <CollectionDeleteDialog
        bookmarks={[]}
        collectionId={mockCollections[0].id}
        collections={mockCollections}
        onDelete={vi.fn<(collectionId: string) => void>()}
        onOpenChange={vi.fn<(open: boolean) => void>()}
      />
    )

    const collectionHeader = screen
      .getByRole("heading", { name: `Delete ${mockCollections[0].name}?` })
      .closest("[data-slot=alert-dialog-header]")
    expect(collectionHeader?.querySelector("svg")).toBeNull()

    collectionDialog.unmount()

    render(
      <TagDeleteDialog
        bookmarks={[]}
        onDelete={vi.fn<(tagId: string) => void>()}
        onOpenChange={vi.fn<(open: boolean) => void>()}
        tagId={mockTags[0].id}
        tags={mockTags}
      />
    )

    const tagHeader = screen
      .getByRole("heading", { name: `Delete ${mockTags[0].name}?` })
      .closest("[data-slot=alert-dialog-header]")
    expect(tagHeader?.querySelector("svg")).toBeNull()
  })

  it("enters explicit tag reorder mode from the tag section menu", async () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Tag options" }))
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Custom" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Reorder tags" }))

    const handle = screen.getByRole("button", { name: "Move Design" })
    await waitFor(() => {
      expect(handle.getAttribute("aria-roledescription")).toBe("draggable")
    })
    expect(screen.getByText("Reordering tags")).not.toBeNull()
    const done = screen.getByRole("button", { name: "Done" })
    const actions = done.closest("[data-slot=sidebar-group-actions]")
    expect(actions?.className).not.toContain("pointer-fine:opacity-0")

    fireEvent.click(screen.getByRole("button", { name: "All bookmarks" }))
    expect(screen.queryByText("Reordering tags")).toBeNull()
  })
})
