import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type { FlatCollectionItem } from "@/dev/dashboard-ui/collection-reorder-model"
import {
  CollectionDragOverlay,
  SortableCollectionRow,
} from "@/dev/dashboard-ui/collection-reorder-row"

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    handleRef: vi.fn<(element: Element | null) => void>(),
    isDragSource: true,
    ref: vi.fn<(element: Element | null) => void>(),
  }),
}))

const collection: Collection = {
  createdAt: 1,
  icon: "folder",
  id: "media",
  name: "Media",
  order: 0,
  parentId: null,
}

const item: FlatCollectionItem = {
  collection,
  depth: 0,
  hasChildren: false,
  id: collection.id,
  index: 0,
  parentId: null,
}

afterEach(cleanup)

describe("collection reorder feedback", () => {
  it("removes the gap as soon as app drag state ends", () => {
    const { rerender } = render(
      <SidebarProvider>
        <SortableCollectionRow
          isProjectedParent={false}
          item={item}
          onKeyboardMove={vi.fn<
            (collection: Collection, direction: -1 | 1) => void
          >()}
          showDropGap
        />
      </SidebarProvider>
    )

    const row = document.querySelector("[data-collection-reorder-id=media]")
    expect(row?.getAttribute("aria-hidden")).toBe("true")
    expect(document.querySelector("[data-collection-drop-gap]")).not.toBeNull()

    rerender(
      <SidebarProvider>
        <SortableCollectionRow
          isProjectedParent={false}
          item={item}
          onKeyboardMove={vi.fn<
            (collection: Collection, direction: -1 | 1) => void
          >()}
          showDropGap={false}
        />
      </SidebarProvider>
    )

    expect(row?.getAttribute("aria-hidden")).toBeNull()
    expect(document.querySelector("[data-collection-drop-gap]")).toBeNull()
    expect(screen.getByText("Media").parentElement?.className).not.toContain(
      "invisible"
    )
  })

  it("marks the future parent without changing row height", () => {
    render(
      <SidebarProvider>
        <SortableCollectionRow
          isProjectedParent
          item={item}
          onKeyboardMove={vi.fn<
            (collection: Collection, direction: -1 | 1) => void
          >()}
          showDropGap={false}
        />
      </SidebarProvider>
    )

    const row = document.querySelector(
      "[data-collection-projected-parent=true]"
    )
    expect(row).not.toBeNull()
    expect(row?.className).toContain("min-h-8")
    expect(screen.getByText("Media").closest("button")?.className).toContain(
      "ring-inset"
    )
  })

  it("puts blocked-depth feedback and the first-use hint on the overlay", () => {
    render(
      <CollectionDragOverlay
        childCount={0}
        collection={collection}
        invalidNesting
        showNestingHint
      />
    )

    expect(screen.getByText("Drag right to nest")).not.toBeNull()
    expect(
      document.querySelector("[data-collection-invalid-nesting=true]")
    ).not.toBeNull()
  })
})
