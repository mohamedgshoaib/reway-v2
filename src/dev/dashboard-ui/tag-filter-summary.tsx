import { XIcon } from "@phosphor-icons/react"
import type * as React from "react"

import { Badge } from "@/components/ui/badge"
import { TagIcon } from "@/dev/dashboard-ui/tag-icon"
import type { Tag } from "@/dev/dashboard-ui/tag-model"

export function TagFilterSummary({
  onClear,
  onRemove,
  tags,
}: {
  onClear: () => void
  onRemove: (tagId: string) => void
  tags: readonly Tag[]
}): React.ReactElement | null {
  if (tags.length === 0) return null

  return (
    <section
      aria-label="Active tag filters"
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-4 px-2 pb-3"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Filtered by
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-4">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            className="h-7 gap-1.5 px-2"
            render={
              <button
                aria-label={`Remove ${tag.name} filter`}
                onClick={() => onRemove(tag.id)}
                type="button"
              />
            }
            variant="secondary"
          >
            <TagIcon color={tag.color} />
            <span>{tag.name}</span>
            <XIcon aria-hidden="true" />
          </Badge>
        ))}
        <Badge
          className="h-7 px-2"
          onClick={onClear}
          render={<button aria-label="Clear tag filters" type="button" />}
          variant="outline"
        >
          Clear
        </Badge>
      </div>
    </section>
  )
}
