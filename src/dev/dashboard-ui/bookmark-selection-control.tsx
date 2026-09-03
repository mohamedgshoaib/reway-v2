import type React from "react"

import type { CheckboxPrimitive } from "@/components/ui/checkbox"
import { Checkbox } from "@/components/ui/checkbox"
import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

export type BookmarkSelectionChangeHandler = (
  bookmarkId: string,
  checked: boolean,
  extendRange: boolean,
  visibleIds: readonly string[]
) => void

export function BookmarkLeadingFavicon({
  bookmark,
  className,
}: {
  bookmark: MockBookmark
  className?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        "relative -my-2 -ms-2 flex size-10 shrink-0 items-center justify-center pointer-coarse:size-11",
        className
      )}
      data-slot="bookmark-leading-control"
    >
      <BookmarkFavicon domain={bookmark.domain} />
    </span>
  )
}

function hasShiftModifier(event: Event): boolean {
  return "shiftKey" in event && event.shiftKey === true
}

function SelectionCheckbox({
  bookmark,
  checked,
  labelId,
  onSelectionChange,
  visibleIds,
}: {
  bookmark: MockBookmark
  checked: boolean
  labelId: string
  onSelectionChange: BookmarkSelectionChangeHandler
  visibleIds: readonly string[]
}): React.ReactElement {
  const handleCheckedChange: CheckboxPrimitive.Root.Props["onCheckedChange"] = (
    nextChecked,
    eventDetails
  ) => {
    onSelectionChange(
      bookmark.id,
      nextChecked,
      hasShiftModifier(eventDetails.event),
      visibleIds
    )
  }

  return (
    <Checkbox
      aria-labelledby={labelId}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      sound={false}
      static
    />
  )
}

export function BookmarkLeadingControl({
  bookmark,
  checked,
  labelId,
  onSelectionChange,
  visibleIds,
}: {
  bookmark: MockBookmark
  checked: boolean
  labelId: string
  onSelectionChange: BookmarkSelectionChangeHandler
  visibleIds: readonly string[]
}): React.ReactElement {
  return (
    <span
      className="relative -my-2 -ms-2 flex size-10 shrink-0 items-center justify-center pointer-coarse:size-11"
      data-slot="bookmark-leading-control"
    >
      <SelectionCheckbox
        bookmark={bookmark}
        checked={checked}
        labelId={labelId}
        onSelectionChange={onSelectionChange}
        visibleIds={visibleIds}
      />
    </span>
  )
}
