import type * as React from "react"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import { ActionsSection } from "@/dev/ui-audit/sections/actions"
import { DataLayoutSection } from "@/dev/ui-audit/sections/data-layout"
import { FeedbackSection } from "@/dev/ui-audit/sections/feedback"
import { FormsSelectionSection } from "@/dev/ui-audit/sections/forms-selection"
import { FormsTextSection } from "@/dev/ui-audit/sections/forms-text"
import { NavigationSection } from "@/dev/ui-audit/sections/navigation"
import { OverlaysSection } from "@/dev/ui-audit/sections/overlays"
import { SidebarSection } from "@/dev/ui-audit/sections/sidebar"

const nav = [
  { id: "actions", label: "Actions" },
  { id: "forms-text", label: "Forms — text" },
  { id: "forms-selection", label: "Forms — selection" },
  { id: "overlays", label: "Overlays" },
  { id: "feedback", label: "Feedback" },
  { id: "navigation", label: "Navigation" },
  { id: "data-layout", label: "Data & layout" },
  { id: "sidebar", label: "Sidebar" },
] as const

/**
 * Disposable component audit page. Not linked from product navigation.
 *
 * To remove this page entirely: delete src/routes/ui.tsx and
 * src/dev/ui-audit/, then run the dev server or build once so
 * src/routeTree.gen.ts regenerates without the /ui route.
 */
export function UiAuditPage(): React.ReactElement {
  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-10">
          <aside className="sticky top-10 hidden h-fit w-44 shrink-0 flex-col gap-1 text-sm md:flex">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              UI audit
            </p>
            {nav.map((item) => (
              <a
                className="rounded-sm px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                href={`#${item.id}`}
                key={item.id}
              >
                {item.label}
              </a>
            ))}
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-14">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Component audit</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Every coss primitive currently installed under{" "}
                  <code>src/components/ui</code>, rendered with its documented
                  variants and states. This page is dev-only scaffolding, not
                  product UI — see the removal note in{" "}
                  <code>src/dev/ui-audit/page.tsx</code>.
                </p>
              </div>
              <ThemeToggle className="shrink-0" />
            </header>

            <ActionsSection />
            <FormsTextSection />
            <FormsSelectionSection />
            <OverlaysSection />
            <FeedbackSection />
            <NavigationSection />
            <DataLayoutSection />
            <SidebarSection />
          </main>
        </div>
      </AnchoredToastProvider>
    </ToastProvider>
  )
}
