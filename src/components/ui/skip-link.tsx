import type * as React from "react"

import { cn } from "@/lib/utils"

export function SkipLink({
  className,
  children,
  ...props
}: React.ComponentProps<"a">): React.ReactElement {
  return (
    <a
      className={cn(
        "sr-only z-100 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}
