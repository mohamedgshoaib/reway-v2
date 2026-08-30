"use client"

import {
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable, useSortable } from "@dnd-kit/react/sortable"
import * as React from "react"

import { ReorderHandle } from "@/components/ui/reorder-handle"
import {
  SidebarMenuButton,
  SidebarMenuButtonLabel,
} from "@/components/ui/sidebar"
import { TagIcon } from "@/dev/dashboard-ui/tag-icon"
import { sortTags, type Tag } from "@/dev/dashboard-ui/tag-model"
import { cn } from "@/lib/utils"

function SortableTagRow({
  draggedIndex,
  index,
  onKeyboardMove,
  tag,
}: {
  draggedIndex: number | null
  index: number
  onKeyboardMove: (tagId: string, direction: -1 | 1) => void
  tag: Tag
}): React.ReactElement {
  const { handleRef, isDragging, isDropTarget, ref } = useSortable({
    accept: "tag",
    id: tag.id,
    index,
    transition: {
      duration: 180,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    },
    type: "tag",
  })
  const insertionEdge =
    draggedIndex === null || draggedIndex === index
      ? null
      : index < draggedIndex
        ? "before"
        : "after"

  return (
    <li
      className={cn(
        "relative list-none",
        isDragging &&
          "z-10 rounded-lg bg-background shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_2px_4px_rgb(0_0_0/0.06),0_8px_20px_rgb(0_0_0/0.08)]"
      )}
      data-tag-reorder-id={tag.id}
      ref={ref}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-1 z-20 h-0.5 rounded-full bg-ring opacity-0 transition-opacity duration-100",
          insertionEdge === "before" ? "-top-px" : "-bottom-px",
          isDropTarget && insertionEdge && "opacity-100"
        )}
        data-tag-insertion-indicator
        data-edge={insertionEdge ?? undefined}
      />
      <SidebarMenuButton className="pe-8">
        <TagIcon color={tag.color} />
        <SidebarMenuButtonLabel>{tag.name}</SidebarMenuButtonLabel>
      </SidebarMenuButton>
      <ReorderHandle
        className="absolute end-1 top-1"
        label={`Move ${tag.name}`}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
          event.preventDefault()
          event.stopPropagation()
          onKeyboardMove(tag.id, event.key === "ArrowUp" ? -1 : 1)
        }}
        ref={handleRef}
      />
    </li>
  )
}

export function TagReorderList({
  onMove,
  tags,
}: {
  onMove: (sourceId: string, index: number) => void
  tags: readonly Tag[]
}): React.ReactElement {
  const [draggedTagId, setDraggedTagId] = React.useState<string | null>(null)
  const orderedTags = sortTags(tags, "custom")
  const draggedIndex = draggedTagId
    ? orderedTags.findIndex((tag) => tag.id === draggedTagId)
    : null

  const moveWithKeyboard = (tagId: string, direction: -1 | 1): void => {
    const currentIndex = orderedTags.findIndex((tag) => tag.id === tagId)
    const nextIndex = Math.max(
      0,
      Math.min(currentIndex + direction, orderedTags.length - 1)
    )
    if (currentIndex === -1 || currentIndex === nextIndex) return
    onMove(tagId, nextIndex)
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        setDraggedTagId(null)
        if (event.canceled) return

        const { source } = event.operation
        if (source && isSortable(source))
          onMove(String(source.id), source.index)
      }}
      onDragStart={(event) => {
        const source = event.operation.source
        if (source) setDraggedTagId(String(source.id))
      }}
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({ dropAnimation: null, keyboardTransition: null }),
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
              : [new PointerActivationConstraints.Distance({ value: 5 })],
        }),
      ]}
    >
      <ul aria-label="Reordering tags" className="list-none">
        {orderedTags.map((tag, index) => (
          <SortableTagRow
            draggedIndex={draggedIndex}
            index={index}
            key={tag.id}
            onKeyboardMove={moveWithKeyboard}
            tag={tag}
          />
        ))}
      </ul>
    </DragDropProvider>
  )
}
