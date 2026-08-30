import { CheckCircleIcon } from "@phosphor-icons/react"
import type * as React from "react"

export function BookmarkSelectionIndicator(): React.ReactElement {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-foreground">
      <CheckCircleIcon aria-hidden="true" weight="fill" />
      <span className="sr-only">Selected</span>
    </span>
  )
}
