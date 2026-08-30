"use client"

import { DotsSixVerticalIcon } from "@phosphor-icons/react"
import type * as React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ReorderHandle({
  className,
  label,
  onPointerDown,
  ...props
}: Omit<ButtonProps, "aria-label" | "children" | "size" | "variant"> & {
  label: string
}): React.ReactElement {
  return (
    <Button
      aria-label={label}
      className={cn("cursor-grab touch-none active:cursor-grabbing", className)}
      data-reorder-handle
      onPointerDown={(event) => {
        event.stopPropagation()
        onPointerDown?.(event)
      }}
      size="icon-xs"
      variant="ghost"
      {...props}
    >
      <DotsSixVerticalIcon aria-hidden="true" weight="bold" />
    </Button>
  )
}
