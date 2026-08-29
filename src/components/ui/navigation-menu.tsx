"use client"

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { CaretDownIcon } from "@phosphor-icons/react"
import { cva } from "class-variance-authority"
import type React from "react"

import { cn } from "@/lib/utils"

export const NavigationMenu: typeof NavigationMenuPrimitive.Root =
  NavigationMenuPrimitive.Root

export const NavigationMenuPortal: typeof NavigationMenuPrimitive.Portal =
  NavigationMenuPrimitive.Portal

export const NavigationMenuItem: typeof NavigationMenuPrimitive.Item =
  NavigationMenuPrimitive.Item

// Exported so nav-bar-level links (an `<a>`, not a trigger button) can match
// the triggers beside them: `className={navigationMenuTriggerVariants()}`.
//
// `after:absolute after:inset-0` squares off the hit area. `rounded-lg` clips
// the trigger's own hit testing to the rounded shape, leaving dead pixels in
// the corners where adjacent triggers meet; parking there past the 50ms
// closeDelay closes the popup, so the next trigger opens fresh instead of
// morphing across. The pseudo-element is not clipped by the parent's radius,
// so it restores a rectangular target while keeping the rounded visual.
// No cursor-pointer: triggers act in place (open a popup) rather than
// navigate, matching MenuItem/SelectItem's cursor-default convention. Links
// sharing these variants still get `pointer` from the UA stylesheet.
export const navigationMenuTriggerVariants = cva(
  "relative flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap text-foreground no-underline transition-[color,background-color] outline-none select-none after:absolute after:inset-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
)

export function NavigationMenuList({
  className,
  ...props
}: NavigationMenuPrimitive.List.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.List
      className={cn(
        // No gap between items, ever — including any usage-level override
        // (audience/submenu trigger stacks, content link lists inside
        // Content panels, any orientation). Any gap, however small, is dead
        // space no item's hit-box covers: cursor movement through it can
        // land past the trigger's closeDelay grace with nothing under it,
        // closing the popup mid-approach. Space items with their own
        // padding instead (see navigationMenuTriggerVariants and LinkCard),
        // never with `gap-*` on the list.
        //
        // Horizontal only. NavigationMenu exposes no `data-orientation`
        // anywhere (unlike Tabs/ToggleGroup), so a vertical Root must pass
        // `flex-col items-stretch` itself — as Base UI's own examples do.
        "relative flex list-none items-center",
        className
      )}
      data-slot="navigation-menu-list"
      {...props}
    />
  )
}

export function NavigationMenuTrigger({
  className,
  ...props
}: NavigationMenuPrimitive.Trigger.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Trigger
      className={cn(navigationMenuTriggerVariants(), className)}
      data-slot="navigation-menu-trigger"
      {...props}
    />
  )
}

export function NavigationMenuIcon({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Icon.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Icon
      className={cn(
        // Base UI reference: transition-transform 200ms plain `ease`.
        "flex items-center justify-center text-muted-foreground transition-transform duration-200 ease-[ease] data-popup-open:rotate-180",
        className
      )}
      data-slot="navigation-menu-icon"
      {...props}
    >
      {children ?? <CaretDownIcon />}
    </NavigationMenuPrimitive.Icon>
  )
}

export function NavigationMenuContent({
  className,
  ...props
}: NavigationMenuPrimitive.Content.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Content
      className={cn(
        "h-full w-[calc(100vw-var(--spacing)*10)] p-2 transition-[opacity,transform,translate] duration-(--duration) ease-(--easing) data-ending-style:opacity-0 data-starting-style:opacity-0 sm:w-max",
        "data-starting-style:data-[activation-direction=left]:-translate-x-1/2 data-starting-style:data-[activation-direction=right]:translate-x-1/2",
        "data-ending-style:data-[activation-direction=left]:translate-x-1/2 data-ending-style:data-[activation-direction=right]:-translate-x-1/2",
        className
      )}
      data-slot="navigation-menu-content"
      {...props}
    />
  )
}

export function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuPrimitive.Link.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Link
      className={cn(
        "block rounded-lg no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring data-active:text-accent-foreground",
        className
      )}
      data-slot="navigation-menu-link"
      {...props}
    />
  )
}

// Standalone export so nested *inline* submenus can compose List + Viewport
// without a Portal/Positioner/Popup, per the Base UI "Nested inline
// submenus" example. NavigationMenuPopup renders one internally.
export function NavigationMenuViewport({
  className,
  ...props
}: NavigationMenuPrimitive.Viewport.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Viewport
      className={cn("relative overflow-hidden", className)}
      data-slot="navigation-menu-viewport"
      {...props}
    />
  )
}

export function NavigationMenuBackdrop({
  className,
  ...props
}: NavigationMenuPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <NavigationMenuPrimitive.Backdrop
      className={cn(
        "pointer-events-none fixed inset-0 z-40 bg-black/32 backdrop-blur-sm transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      data-slot="navigation-menu-backdrop"
      {...props}
    />
  )
}

export function NavigationMenuPopup({
  children,
  className,
  side = "bottom",
  // Base UI's Positioner defaults to "center"; this project aligns navigation
  // popups to the trigger's leading edge instead. "start" is logical, so it
  // flips to the right edge under RTL.
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  anchor,
  collisionPadding = { top: 5, bottom: 5, left: 20, right: 20 },
  collisionAvoidance,
  showBackdrop = false,
  portalProps,
  positionerClassName,
  ...props
}: NavigationMenuPrimitive.Popup.Props & {
  portalProps?: NavigationMenuPrimitive.Portal.Props
  side?: NavigationMenuPrimitive.Positioner.Props["side"]
  align?: NavigationMenuPrimitive.Positioner.Props["align"]
  sideOffset?: NavigationMenuPrimitive.Positioner.Props["sideOffset"]
  alignOffset?: NavigationMenuPrimitive.Positioner.Props["alignOffset"]
  anchor?: NavigationMenuPrimitive.Positioner.Props["anchor"]
  collisionPadding?: NavigationMenuPrimitive.Positioner.Props["collisionPadding"]
  collisionAvoidance?: NavigationMenuPrimitive.Positioner.Props["collisionAvoidance"]
  showBackdrop?: boolean
  positionerClassName?: string
}): React.ReactElement {
  return (
    <NavigationMenuPortal {...portalProps}>
      {showBackdrop && <NavigationMenuBackdrop />}
      <NavigationMenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className={cn(
          // The ::before bridge keeps hover alive across the gap between the
          // trigger and the popup, so the menu does not close mid-approach.
          "z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--duration) ease-(--easing) before:absolute before:content-[''] data-instant:transition-none",
          "data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:-top-2 data-[side=bottom]:before:h-2",
          "data-[side=top]:before:inset-x-0 data-[side=top]:before:-bottom-2 data-[side=top]:before:h-2",
          "data-[side=left]:before:inset-y-0 data-[side=left]:before:-right-2 data-[side=left]:before:w-2",
          "data-[side=right]:before:inset-y-0 data-[side=right]:before:-left-2 data-[side=right]:before:w-2",
          positionerClassName
        )}
        collisionAvoidance={collisionAvoidance}
        collisionPadding={collisionPadding}
        data-slot="navigation-menu-positioner"
        side={side}
        sideOffset={sideOffset}
        // Base UI tunes the size-morph on these values; kept verbatim and
        // scoped here rather than promoted to global tokens.
        style={
          {
            "--duration": "0.35s",
            "--easing": "cubic-bezier(0.22, 1, 0.36, 1)",
          } as React.CSSProperties
        }
      >
        <NavigationMenuPrimitive.Popup
          // Animation values are Base UI's reference verbatim: scale-90 +
          // opacity on enter/exit, exit at 150ms plain `ease` restricted to
          // [opacity,scale] so width/height snap instead of morphing shut.
          className={cn(
            "relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-lg border bg-popover text-popover-foreground shadow-lg/5 transition-[opacity,transform,width,height,scale] duration-(--duration) ease-(--easing) outline-none not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-90 data-ending-style:opacity-0 data-ending-style:transition-[opacity,scale] data-ending-style:duration-150 data-ending-style:ease-[ease] data-starting-style:scale-90 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            className
          )}
          data-slot="navigation-menu-popup"
          {...props}
        >
          <NavigationMenuViewport className="size-full">
            {children}
          </NavigationMenuViewport>
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPortal>
  )
}

export { NavigationMenuPrimitive }
