import type { SortOption, ViewMode } from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationDisclosures } from "@/dev/dashboard-ui/navigation-preferences"
import { MobileDashboardNavigation } from "@/dev/dashboard-ui/sidebar"

/**
 * Mobile navigation access. Desktop navigation now owns its expand control,
 * so the content area has no header there.
 */
export function BookmarkControlsBar({
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  mobileNavigationDisclosures,
}: {
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  viewMode: ViewMode
  onViewModeChange: (viewMode: ViewMode) => void
  mobileNavigationDisclosures: DashboardNavigationDisclosures
}): React.ReactElement {
  return (
    <div className="mb-4 flex h-9 items-center px-2 min-[800px]:hidden">
      <MobileDashboardNavigation
        initialDisclosures={mobileNavigationDisclosures}
        onSortChange={onSortChange}
        onViewModeChange={onViewModeChange}
        sort={sort}
        viewMode={viewMode}
      />
    </div>
  )
}
