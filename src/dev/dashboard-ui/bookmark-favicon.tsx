import { LinkSimpleIcon } from "@phosphor-icons/react"
import type * as React from "react"

export function BookmarkFavicon({
  domain,
}: {
  domain: string | null
}): React.ReactElement {
  if (!domain) {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        <LinkSimpleIcon size={14} />
      </span>
    )
  }

  return (
    <img
      alt=""
      className="size-4 shrink-0 rounded-xs"
      height={16}
      src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
      width={16}
    />
  )
}
