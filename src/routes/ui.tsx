import { createFileRoute } from "@tanstack/react-router"

import { UiAuditPage } from "@/dev/ui-audit/page"

/**
 * Disposable component audit route. See src/dev/ui-audit/page.tsx
 * for the removal note.
 */
export const Route = createFileRoute("/ui")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "UI audit — Reway" },
    ],
  }),
  component: UiAuditPage,
})
