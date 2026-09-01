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

export function BookmarkControlsBar({
  activeTagIds,
  activeCollection = null,
  allBookmarksActive = activeCollection === null,
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
  onTagActiveChange,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  tagFilterResultCount,
  title,
  viewMode,
}: {
  activeTagIds?: ReadonlySet<string>
  activeCollection?: string | null
  allBookmarksActive?: boolean
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
  onTagActiveChange?: (tagId: string, active: boolean) => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  tagFilterResultCount?: number
  title: string
  viewMode: ViewMode
}): React.ReactElement {
  return (
    <div className="mb-4 flex h-9 min-w-0 items-center gap-2 px-2 min-[800px]:contents">
      <div className="min-[800px]:hidden">
        <MobileDashboardNavigation
          activeTagIds={activeTagIds}
          activeCollection={activeCollection}
          allBookmarksActive={allBookmarksActive}
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
          onTagActiveChange={onTagActiveChange}
          onUpdateCollection={onUpdateCollection}
          onUpdateTag={onUpdateTag}
          onViewModeChange={onViewModeChange}
          sort={sort}
          tagFilterResultCount={tagFilterResultCount}
          tags={tags}
          viewMode={viewMode}
        />
      </div>
      <h1 className="truncate text-base font-semibold text-foreground min-[800px]:sr-only">
        {title}
      </h1>
    </div>
  )
}
