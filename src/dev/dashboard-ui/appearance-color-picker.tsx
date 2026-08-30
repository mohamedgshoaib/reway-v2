"use client"

import type * as React from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group"
import {
  appearancePalette,
  type AppearancePaletteColor,
} from "@/dev/dashboard-ui/appearance-color"

export function AppearanceColorPicker({
  onValueChange,
  renderIcon,
  value,
}: {
  onValueChange: (color: AppearancePaletteColor) => void
  renderIcon: (color: AppearancePaletteColor) => React.ReactElement
  value: AppearancePaletteColor
}): React.ReactElement {
  return (
    <RadioGroup
      aria-label="Color"
      className="flex flex-row flex-wrap gap-3"
      onValueChange={(nextValue) =>
        onValueChange(nextValue as AppearancePaletteColor)
      }
      value={value}
    >
      {appearancePalette.map((color) => {
        const label = color[0].toUpperCase() + color.slice(1)

        return (
          <Label
            className="relative flex size-7 items-center justify-center gap-0 rounded-md bg-transparent outline-none after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-1/2 hover:bg-accent/50 has-data-checked:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            data-slot="appearance-color-option"
            key={color}
          >
            <RadioPrimitive.Root className="sr-only" value={color} />
            {renderIcon(color)}
            <span className="sr-only">{label}</span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
