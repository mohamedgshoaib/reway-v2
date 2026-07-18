import { createFileRoute } from "@tanstack/react-router"

import { DashboardUiPage } from "@/dev/dashboard-ui/page"

/**
 * Disposable dashboard shell wireframe route. See
 * src/dev/dashboard-ui/page.tsx for the removal note.
 */
export const Route = createFileRoute("/dashboard-ui")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Dashboard shell — Reway" },
    ],
  }),
  component: DashboardUiPage,
})
