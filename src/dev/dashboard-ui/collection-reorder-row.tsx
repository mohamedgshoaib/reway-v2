"use client"

import { useSortable } from "@dnd-kit/react/sortable"
import {
  ArrowElbowDownRightIcon,
  DotsSixVerticalIcon,
  ProhibitIcon,
} from "@phosphor-icons/react"
import type * as React from "react"

import { ReorderHandle } from "@/components/ui/reorder-handle"
import {
  SidebarMenuButton,
  SidebarMenuButtonLabel,
} from "@/components/ui/sidebar"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import type { FlatCollectionItem } from "@/dev/dashboard-ui/collection-reorder-model"
import { cn } from "@/lib/utils"

export function CollectionDragOverlay({
  childCount,
  collection,
  invalidNesting,
  showNestingHint,
}: {
  childCount: number
  collection: Collection
  invalidNesting: boolean
  showNestingHint: boolean
}): React.ReactElement {
  return (
    <div
      className="relative"
      data-collection-invalid-nesting={invalidNesting || undefined}
    >
      <div
        className={cn(
          "flex h-8 items-center gap-2 rounded-md bg-background px-2 text-sm shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_4px_16px_rgb(0_0_0/0.14)] transition-shadow duration-150",
          invalidNesting && "ring-1 ring-destructive/60"
        )}
      >
        <CollectionIcon
          className="size-4 shrink-0"
          color={collection.color}
          icon={collection.icon}
        />
        <span className="min-w-0 flex-1 truncate">{collection.name}</span>
        {childCount > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            +{childCount}
          </span>
        ) : null}
        <DotsSixVerticalIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          weight="bold"
        />
      </div>
      <output
        aria-hidden={!invalidNesting}
        className={cn(
          "absolute -start-2 -top-2 grid size-5 place-items-center rounded-md bg-background text-destructive shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.12)] transition-[opacity,scale] duration-150",
          invalidNesting ? "scale-100 opacity-100" : "scale-25 opacity-0"
        )}
      >
        <ProhibitIcon aria-hidden="true" className="size-3.5" weight="bold" />
        <span className="sr-only">Cannot nest deeper</span>
      </output>
      {showNestingHint ? (
        <output className="absolute start-6 top-full mt-1 flex h-6 items-center gap-1.5 rounded-md bg-popover px-2 text-xs whitespace-nowrap text-popover-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_8px_rgb(0_0_0/0.12)]">
          <ArrowElbowDownRightIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
            weight="bold"
          />
          Drag right to nest
        </output>
      ) : null}
    </div>
  )
}

export function SortableCollectionRow({
  isProjectedParent,
  item,
  onKeyboardMove,
  showDropGap,
}: {
  isProjectedParent: boolean
  item: FlatCollectionItem
  onKeyboardMove: (collection: Collection, direction: -1 | 1) => void
  showDropGap: boolean
}): React.ReactElement {
  const { handleRef, isDragSource, ref } = useSortable({
    alignment: { x: "start", y: "center" },
    data: { depth: item.depth, parentId: item.parentId },
    id: item.id,
    index: item.index,
    transition: {
      duration: 140,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  })

  return (
    <li
      aria-hidden={(isDragSource && showDropGap) || undefined}
      className={cn(
        "relative min-h-8 list-none",
        item.depth === 1 && "ms-5 border-s border-sidebar-border ps-2"
      )}
      data-collection-depth={item.depth}
      data-collection-projected-parent={isProjectedParent || undefined}
      data-collection-reorder-id={item.id}
      ref={ref}
    >
      {isDragSource && showDropGap ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ring"
          data-collection-drop-gap
        />
      ) : null}
      {isDragSource && showDropGap && item.depth === 1 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-0 top-1/2 w-2 border-t border-sidebar-border"
          data-collection-drop-branch
        />
      ) : null}
      <div className={cn(isDragSource && showDropGap && "invisible")}>
        <SidebarMenuButton
          className={cn(
            "pe-8 transition-[background-color,box-shadow] duration-150",
            isProjectedParent &&
              "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-ring/30 ring-inset"
          )}
        >
          <CollectionIcon
            color={item.collection.color}
            icon={item.collection.icon}
          />
          <SidebarMenuButtonLabel>
            {item.collection.name}
          </SidebarMenuButtonLabel>
        </SidebarMenuButton>
        <ReorderHandle
          className="absolute end-1 top-1"
          label={`Move ${item.collection.name}`}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return

            event.preventDefault()
            event.stopPropagation()
            onKeyboardMove(item.collection, event.key === "ArrowUp" ? -1 : 1)
          }}
          ref={handleRef}
        />
      </div>
    </li>
  )
}
