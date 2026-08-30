import { TagChevronIcon } from "@phosphor-icons/react"
import type * as React from "react"

import { appearanceTextClasses } from "@/dev/dashboard-ui/appearance-color"
import type { TagColor } from "@/dev/dashboard-ui/tag-model"
import { cn } from "@/lib/utils"

export function TagIcon({
  className,
  color,
}: {
  className?: string
  color: TagColor
}): React.ReactElement {
  return (
    <TagChevronIcon
      aria-hidden="true"
      className={cn(appearanceTextClasses[color.value], className)}
      weight="duotone"
    />
  )
}
