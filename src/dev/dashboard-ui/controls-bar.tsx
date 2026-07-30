import type { SortOption, ViewMode } from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationDisclosures } from "@/dev/dashboard-ui/navigation-preferences"
import { MobileDashboardNavigation } from "@/dev/dashboard-ui/sidebar"

/**
 * Mobile navigation access. Desktop navigation now owns its expand control,
 * so the content area has no header there.
 */
export function BookmarkControlsBar({
  activeCollection = null,
  canReorder = false,
  isReordering = false,
  mobileNavigationDisclosures,
  onNavigate,
  onSelectAllBookmarks,
  onSelectCollection,
  onSortChange,
  onStartReorder,
  onViewModeChange,
  sort,
  viewMode,
}: {
  activeCollection?: string | null
  canReorder?: boolean
  isReordering?: boolean
  mobileNavigationDisclosures: DashboardNavigationDisclosures
  onNavigate?: () => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  viewMode: ViewMode
}): React.ReactElement {
  return (
    <div className="mb-4 flex h-9 items-center px-2 min-[800px]:hidden">
      <MobileDashboardNavigation
        activeCollection={activeCollection}
        canReorder={canReorder}
        initialDisclosures={mobileNavigationDisclosures}
        isReordering={isReordering}
        onNavigate={onNavigate}
        onSelectAllBookmarks={onSelectAllBookmarks}
        onSelectCollection={onSelectCollection}
        onSortChange={onSortChange}
        onStartReorder={onStartReorder}
        onViewModeChange={onViewModeChange}
        sort={sort}
        viewMode={viewMode}
      />
    </div>
  )
}
