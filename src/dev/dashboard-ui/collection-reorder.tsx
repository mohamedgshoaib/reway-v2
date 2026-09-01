"use client"

import { DragDropProvider, DragOverlay } from "@dnd-kit/react"
import type * as React from "react"

import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import {
  CollectionDragOverlay,
  SortableCollectionRow,
} from "@/dev/dashboard-ui/collection-reorder-row"
import { useCollectionReorderState } from "@/dev/dashboard-ui/collection-reorder-state"

export function CollectionReorderList({
  collections,
  onMove,
}: {
  collections: readonly Collection[]
  onMove: (sourceId: string, parentId: string | null, index: number) => void
}): React.ReactElement {
  const {
    draggedChildCount,
    draggedCollectionId,
    draggedItem,
    flattenedItems,
    invalidNestingIntent,
    moveWithKeyboard,
    projectedParentId,
    providerProps,
    showNestingHint,
  } = useCollectionReorderState({ collections, onMove })

  return (
    <DragDropProvider {...providerProps}>
      <ul aria-label="Reordering collections" className="list-none">
        {flattenedItems.map((item) => (
          <SortableCollectionRow
            isProjectedParent={item.id === projectedParentId}
            item={item}
            key={item.id}
            onKeyboardMove={moveWithKeyboard}
            showDropGap={item.id === draggedCollectionId}
          />
        ))}
      </ul>
      <DragOverlay
        className="z-50 w-[calc(var(--sidebar-width)-1rem)]"
        dropAnimation={null}
      >
        {draggedItem ? (
          <CollectionDragOverlay
            childCount={draggedChildCount}
            collection={draggedItem.collection}
            invalidNesting={invalidNestingIntent}
            showNestingHint={showNestingHint}
          />
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  )
}
