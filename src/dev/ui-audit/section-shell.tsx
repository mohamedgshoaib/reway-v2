import type * as React from "react"

/**
 * Shared layout primitives for the /ui audit page only.
 * Deliberately plain (no coss components) so the page shell
 * never depends on the components it is auditing.
 */

export function AuditSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="scroll-mt-20 border-b border-dashed pb-14" id={id}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  )
}

export function AuditGroup({
  label,
  children,
  wrap = true,
}: {
  label: string
  children: React.ReactNode
  wrap?: boolean
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div
        className={
          wrap
            ? "flex flex-wrap items-center gap-3"
            : "flex flex-col items-start gap-3"
        }
      >
        {children}
      </div>
    </div>
  )
}
