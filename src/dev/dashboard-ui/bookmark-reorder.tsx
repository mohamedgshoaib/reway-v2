"use client"

import { closestCenter, closestCorners } from "@dnd-kit/collision"
import {
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable, useSortable } from "@dnd-kit/react/sortable"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import { ReorderHandle } from "@/components/ui/reorder-handle"

export type BookmarkReorderLayout = "grid" | "list"

export function BookmarkReorderArea({
  children,
  onDraggingChange,
  onMove,
}: {
  children: React.ReactNode
  onDraggingChange: (dragging: boolean) => void
  onMove: (fromIndex: number, toIndex: number) => void
}): React.ReactElement {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        onDraggingChange(false)

        if (event.canceled) return

        const { source } = event.operation
        if (!isSortable(source)) return

        const { index, initialIndex } = source
        if (initialIndex !== index) onMove(initialIndex, index)
      }}
      onDragStart={() => onDraggingChange(true)}
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({
          dropAnimation: null,
          keyboardTransition: null,
        }),
      ]}
      sensors={(defaults) => [
        ...defaults.filter((sensor) => sensor !== PointerSensor),
        PointerSensor.configure({
          activationConstraints: (event) =>
            event.pointerType === "touch"
              ? [
                  new PointerActivationConstraints.Delay({
                    tolerance: 5,
                    value: 250,
                  }),
                ]
              : [
                  new PointerActivationConstraints.Distance({
                    value: 5,
                  }),
                ],
        }),
      ]}
    >
      {children}
    </DragDropProvider>
  )
}

export function useBookmarkSortable({
  id,
  index,
  layout,
}: {
  id: string
  index: number
  layout: BookmarkReorderLayout
}): {
  handleRef: (element: Element | null) => void
  isDragging: boolean
  ref: (element: Element | null) => void
} {
  const { handleRef, isDragging, ref } = useSortable({
    accept: "bookmark",
    collisionDetector: layout === "list" ? closestCorners : closestCenter,
    id,
    index,
    transition: {
      duration: 180,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    },
    type: "bookmark",
  })

  return { handleRef, isDragging, ref }
}

export function BookmarkDragHandle({
  bookmarkTitle,
  handleRef,
}: {
  bookmarkTitle: string
  handleRef: (element: Element | null) => void
}): React.ReactElement {
  return (
    <ReorderHandle
      className="pointer-coarse:size-7 [:active,[data-pressed]]:scale-100"
      label={`Move ${bookmarkTitle}`}
      ref={handleRef}
    />
  )
}

export function BookmarkReorderBar({
  collection,
  onDone,
}: {
  collection: string
  onDone: () => void
}): React.ReactElement {
  return (
    <div
      aria-label={`Reordering ${collection}`}
      className="mx-2 mb-2 flex min-h-10 items-center gap-3 rounded-lg bg-accent ps-3 pe-1.5 min-[800px]:mt-2 sm:pe-2"
      data-slot="bookmark-reorder-bar"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-sm font-medium text-foreground">
          Reordering
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {collection}
        </span>
      </div>
      <Button onClick={onDone} size="xs" variant="secondary">
        Done
      </Button>
    </div>
  )
}
