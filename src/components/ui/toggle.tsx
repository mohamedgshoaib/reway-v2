"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { minimal } from "@sounds"
import { useSound } from "@web-kits/audio/react"
import { cva, type VariantProps } from "class-variance-authority"
import type React from "react"

import { cn } from "@/lib/utils"

export const toggleVariants = cva(
  "relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium whitespace-nowrap text-foreground transition-[scale,box-shadow] duration-150 ease-out-strong outline-none select-none before:pointer-events-none before:absolute before:-z-10 before:transition-colors before:duration-150 before:ease-out-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 data-pressed:text-accent-foreground sm:text-sm pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [:active,[data-pressed]]:scale-97",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 min-w-9 px-[calc(--spacing(2)-1px)] sm:h-8 sm:min-w-8",
        lg: "h-10 min-w-10 px-[calc(--spacing(2.5)-1px)] sm:h-9 sm:min-w-9",
        sm: "h-8 min-w-8 px-[calc(--spacing(1.5)-1px)] sm:h-7 sm:min-w-7",
      },
      variant: {
        default:
          "border-transparent before:inset-0.5 before:rounded-md hover:before:bg-accent data-pressed:before:bg-input/64",
        outline:
          "border-input bg-background shadow-xs/5 not-dark:bg-clip-padding before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] hover:bg-accent data-pressed:bg-input/64 dark:bg-input/32 dark:not-disabled:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/2%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/6%)] dark:hover:bg-input/64 dark:data-pressed:bg-input [:disabled,:active,[data-pressed]]:shadow-none",
      },
    },
  }
)

export function Toggle({
  className,
  variant,
  size,
  onPressedChange,
  ...props
}: TogglePrimitive.Props &
  VariantProps<typeof toggleVariants>): React.ReactElement {
  const playOn = useSound(minimal.toggleOn)
  const playOff = useSound(minimal.toggleOff)

  return (
    <TogglePrimitive
      className={cn(toggleVariants({ className, size, variant }))}
      data-slot="toggle"
      onPressedChange={(pressed, eventDetails) => {
        if (pressed) {
          playOn()
        } else {
          playOff()
        }
        onPressedChange?.(pressed, eventDetails)
      }}
      {...props}
    />
  )
}

export { TogglePrimitive }
