import { LayoutGroup } from "motion/react"
import type React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { SkipLink } from "@/components/ui/skip-link"
import { ToastProvider } from "@/components/ui/toast"
import { DashboardMainPanel } from "@/dev/dashboard-ui/dashboard-main-panel"
import {
  useDashboardUiController,
  type BookmarkBulkMutationFixture,
} from "@/dev/dashboard-ui/dashboard-ui-controller"
import type { DashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"

export type { BookmarkBulkMutationFixture }

/**
 * Disposable dashboard shell wireframe. Not linked from product navigation.
 *
 * To remove it: delete src/routes/dashboard-ui.tsx and
 * src/dev/dashboard-ui/, then run the dev server or build once so
 * src/routeTree.gen.ts drops the /dashboard-ui route.
 */
export function DashboardUiPage({
  initialNavigationPreferences,
  bulkMutationFixture,
}: {
  initialNavigationPreferences: DashboardNavigationPreferences
  bulkMutationFixture?: BookmarkBulkMutationFixture
}): React.ReactElement {
  const { mainPanelProps, onSidebarOpenChange, sidebarOpen, sidebarProps } =
    useDashboardUiController({
      bulkMutationFixture,
      initialNavigationPreferences,
    })

  return (
    <ToastProvider>
      <div className="h-svh bg-background [padding-inline-start:env(safe-area-inset-left)] [padding-inline-end:env(safe-area-inset-right)] [padding-block-start:env(safe-area-inset-top)] [padding-block-end:env(safe-area-inset-bottom)] min-[800px]:p-0">
        <SkipLink href="#dashboard-main-content">Skip to content</SkipLink>
        <div className="flex h-full flex-col px-4 py-4 min-[800px]:px-6 min-[800px]:py-10">
          <LayoutGroup id="dashboard-sidebar">
            <SidebarProvider
              className="mx-auto min-h-0 w-full max-w-[896px] min-w-0 flex-1 min-[800px]:gap-6"
              onOpenChange={onSidebarOpenChange}
              open={sidebarOpen}
            >
              <DashboardSidebar {...sidebarProps} />
              <DashboardMainPanel {...mainPanelProps} />
            </SidebarProvider>
          </LayoutGroup>
        </div>
      </div>
    </ToastProvider>
  )
}
