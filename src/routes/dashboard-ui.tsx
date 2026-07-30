import { createFileRoute } from "@tanstack/react-router"

import { getDashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import { DashboardUiPage } from "@/dev/dashboard-ui/page"

/**
 * Disposable dashboard shell wireframe route. See
 * src/dev/dashboard-ui/page.tsx for the removal note.
 */
export const Route = createFileRoute("/dashboard-ui")({
  loader: () => getDashboardNavigationPreferences(),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Dashboard shell — Reway" },
    ],
  }),
  component: DashboardUiRoute,
})

function DashboardUiRoute(): React.ReactElement {
  const navigationPreferences = Route.useLoaderData()

  return (
    <DashboardUiPage initialNavigationPreferences={navigationPreferences} />
  )
}
