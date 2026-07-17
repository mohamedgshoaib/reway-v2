"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type React from "react"

import { cn } from "@/lib/utils"

export const TooltipCreateHandle: typeof TooltipPrimitive.createHandle =
  TooltipPrimitive.createHandle

export const TooltipProvider: typeof TooltipPrimitive.Provider =
  TooltipPrimitive.Provider

export const Tooltip: typeof TooltipPrimitive.Root = TooltipPrimitive.Root

export function TooltipTrigger(
  props: TooltipPrimitive.Trigger.Props
): React.ReactElement {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

export function TooltipPopup({
  className,
  align = "center",
  sideOffset = 4,
  side = "top",
  anchor,
  children,
  portalProps,
  ...props
}: TooltipPrimitive.Popup.Props & {
  align?: TooltipPrimitive.Positioner.Props["align"]
  side?: TooltipPrimitive.Positioner.Props["side"]
  sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"]
  anchor?: TooltipPrimitive.Positioner.Props["anchor"]
  portalProps?: TooltipPrimitive.Portal.Props
}): React.ReactElement {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Positioner
        align={align}
        anchor={anchor}
        // duration/ease are Base UI's "Animating the Tooltip" reference
        // verbatim; coss ships this transition list with no timing, which
        // falls back to Tailwind's default 150ms/ease instead of the
        // intended 0.35s glide between adjacent triggers sharing a handle.
        className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-instant:transition-none"
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) rounded-md border bg-popover text-xs text-balance text-popover-foreground shadow-md/5 transition-[width,height,scale,opacity] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-ending-style:opacity-0 data-instant:duration-0 data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            className
          )}
          data-slot="tooltip-popup"
          {...props}
        >
          <TooltipPrimitive.Viewport
            // Content transition for grouped/detached triggers, mirroring Base
            // UI's "Animating the Tooltip" reference selector-for-selector (the
            // `[&_[data-current]]` arbitrary form, not a `**:data-current:`
            // variant chain, which does not compile reliably for the compound
            // direction+starting-style rules). Base UI wraps the content in
            // `data-current`/`data-previous` direct-child divs, freezes each to
            // the popup width via the inherited `--popup-width`, then slides the
            // incoming content in from `data-activation-direction` while fading.
            // The slide is what hides the width morph clipping the text — without
            // it the popup grows and reveals the content word by word.
            // `data-activation-direction` is set only when triggers share a
            // `handle`; single tooltips just cross-fade.
            className="relative size-full overflow-clip px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)] [&_[data-current]]:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding))] [&_[data-current]]:translate-x-0 [&_[data-current]]:opacity-100 [&_[data-current]]:transition-[translate,opacity] [&_[data-current]]:duration-[350ms,175ms] [&_[data-current]]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[activation-direction~=left]:[&_[data-current][data-starting-style]]:-translate-x-1/2 data-[activation-direction~=left]:[&_[data-current][data-starting-style]]:opacity-0 data-[activation-direction~=right]:[&_[data-current][data-starting-style]]:translate-x-1/2 data-[activation-direction~=right]:[&_[data-current][data-starting-style]]:opacity-0 [&_[data-previous]]:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding))] [&_[data-previous]]:translate-x-0 [&_[data-previous]]:opacity-100 [&_[data-previous]]:transition-[translate,opacity] [&_[data-previous]]:duration-[350ms,175ms] [&_[data-previous]]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[activation-direction~=left]:[&_[data-previous][data-ending-style]]:translate-x-1/2 data-[activation-direction~=left]:[&_[data-previous][data-ending-style]]:opacity-0 data-[activation-direction~=right]:[&_[data-previous][data-ending-style]]:-translate-x-1/2 data-[activation-direction~=right]:[&_[data-previous][data-ending-style]]:opacity-0 [[data-instant]_&_[data-current]]:transition-none [[data-instant]_&_[data-previous]]:transition-none"
            data-slot="tooltip-viewport"
          >
            {children}
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { TooltipPrimitive, TooltipPopup as TooltipContent }
