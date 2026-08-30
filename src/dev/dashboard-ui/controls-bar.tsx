import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type { CollectionDraft } from "@/dev/dashboard-ui/collection-management"
import {
  mockBookmarks,
  mockCollections,
  mockTags,
  type MockBookmark,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationDisclosures } from "@/dev/dashboard-ui/navigation-preferences"
import { MobileDashboardNavigation } from "@/dev/dashboard-ui/sidebar"
import type { Tag, TagDraft } from "@/dev/dashboard-ui/tag-model"

/**
 * Mobile navigation access. Desktop navigation now owns its expand control,
 * so the content area has no header there.
 */
export function BookmarkControlsBar({
  activeCollection = null,
  bookmarks = mockBookmarks,
  canReorder = false,
  collections = mockCollections,
  tags = mockTags,
  isReordering = false,
  mobileNavigationDisclosures,
  onNavigate,
  onCreateCollection,
  onCreateTag,
  onDeleteCollection,
  onDeleteTag,
  onMoveCollection,
  onMoveTag,
  onSelectAllBookmarks,
  onSelectCollection,
  onSortChange,
  onStartReorder,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  viewMode,
}: {
  activeCollection?: string | null
  bookmarks?: readonly MockBookmark[]
  canReorder?: boolean
  collections?: readonly Collection[]
  tags?: readonly Tag[]
  isReordering?: boolean
  mobileNavigationDisclosures: DashboardNavigationDisclosures
  onNavigate?: () => void
  onCreateCollection?: (draft: CollectionDraft) => void
  onCreateTag?: (draft: TagDraft) => void
  onDeleteCollection?: (collectionId: string) => void
  onDeleteTag?: (tagId: string) => void
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  viewMode: ViewMode
}): React.ReactElement {
  return (
    <div className="mb-4 flex h-9 items-center px-2 min-[800px]:hidden">
      <MobileDashboardNavigation
        activeCollection={activeCollection}
        bookmarks={bookmarks}
        canReorder={canReorder}
        collections={collections}
        initialDisclosures={mobileNavigationDisclosures}
        isReordering={isReordering}
        onNavigate={onNavigate}
        onCreateCollection={onCreateCollection}
        onCreateTag={onCreateTag}
        onDeleteCollection={onDeleteCollection}
        onDeleteTag={onDeleteTag}
        onMoveCollection={onMoveCollection}
        onMoveTag={onMoveTag}
        onSelectAllBookmarks={onSelectAllBookmarks}
        onSelectCollection={onSelectCollection}
        onSortChange={onSortChange}
        onStartReorder={onStartReorder}
        onUpdateCollection={onUpdateCollection}
        onUpdateTag={onUpdateTag}
        onViewModeChange={onViewModeChange}
        sort={sort}
        tags={tags}
        viewMode={viewMode}
      />
    </div>
  )
}
