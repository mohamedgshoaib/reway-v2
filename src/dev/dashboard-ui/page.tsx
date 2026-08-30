import { LayoutGroup, useReducedMotion } from "motion/react"
import * as React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { SkipLink } from "@/components/ui/skip-link"
import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import {
  createCollectionOrders,
  moveBookmarkId,
  orderBookmarksByIds,
} from "@/dev/dashboard-ui/bookmark-order"
import {
  createCollectionIndex,
  getCollectionDeletion,
  moveCollection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import type { CollectionDraft } from "@/dev/dashboard-ui/collection-management"
import { DashboardMainPanel } from "@/dev/dashboard-ui/dashboard-main-panel"
import {
  mockBookmarks,
  mockCollections,
  mockTags,
  type MockBookmark,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"
import { moveTag, type Tag, type TagDraft } from "@/dev/dashboard-ui/tag-model"
import { useIsMobile } from "@/hooks/use-media-query"

function useBookmarkWireframeState(): {
  actionHandlers: BookmarkActionHandlers
  bookmarks: MockBookmark[]
  selectedBookmarkIds: Set<string>
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>
  setSelectedBookmarkIds: React.Dispatch<React.SetStateAction<Set<string>>>
} {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)
  const [selectedBookmarkIds, setSelectedBookmarkIds] = React.useState<
    Set<string>
  >(() => new Set())

  const updateBookmark = (
    bookmarkId: string,
    update: (bookmark: MockBookmark) => MockBookmark
  ): void => {
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map((bookmark) =>
        bookmark.id === bookmarkId ? update(bookmark) : bookmark
      )
    )
  }

  const actionHandlers: BookmarkActionHandlers = {
    onAddToCollection: (bookmarkId, collection) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: Array.from(
          new Set([...(bookmark.collections ?? []), collection])
        ),
      }))
    },
    onDelete: (bookmarkId) => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
      )
      setSelectedBookmarkIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)
        nextSelectedIds.delete(bookmarkId)
        return nextSelectedIds
      })
    },
    onMoveToCollection: (bookmarkId, collection) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        collections: [collection],
      }))
    },
    onReenrich: (bookmarkId) => {
      updateBookmark(bookmarkId, (bookmark) => ({
        ...bookmark,
        metadataStatus: "pending",
      }))
    },
    onSelectChange: (bookmarkId, selected) => {
      setSelectedBookmarkIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)

        if (selected) {
          nextSelectedIds.add(bookmarkId)
        } else {
          nextSelectedIds.delete(bookmarkId)
        }

        return nextSelectedIds
      })
    },
    onTagsChange: (bookmarkId, tags) => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, tags }))
    },
    onTitleChange: (bookmarkId, title) => {
      updateBookmark(bookmarkId, (bookmark) => ({ ...bookmark, title }))
    },
  }

  return {
    actionHandlers,
    bookmarks,
    selectedBookmarkIds,
    setBookmarks,
    setSelectedBookmarkIds,
  }
}

function useTagWireframeState(
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>
): {
  tags: Tag[]
  onCreateTag: (draft: TagDraft) => void
  onDeleteTag: (tagId: string) => void
  onMoveTag: (sourceId: string, index: number) => void
  onUpdateTag: (tagId: string, draft: TagDraft) => void
} {
  const [tags, setTags] = React.useState(mockTags)

  const onCreateTag = (draft: TagDraft): void => {
    setTags((currentTags) => [
      {
        ...draft,
        createdAt: Date.now(),
        id: `tag-${crypto.randomUUID()}`,
        order: 0,
      },
      ...currentTags.map((tag) => ({ ...tag, order: tag.order + 1 })),
    ])
  }

  const onUpdateTag = (tagId: string, draft: TagDraft): void => {
    setTags((currentTags) =>
      currentTags.map((tag) => (tag.id === tagId ? { ...tag, ...draft } : tag))
    )
  }

  const onDeleteTag = (tagId: string): void => {
    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId))
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map((bookmark) => ({
        ...bookmark,
        tags: bookmark.tags?.filter((bookmarkTagId) => bookmarkTagId !== tagId),
      }))
    )
  }

  const onMoveTag = (sourceId: string, index: number): void => {
    setTags((currentTags) => moveTag(currentTags, sourceId, index))
  }

  return { tags, onCreateTag, onDeleteTag, onMoveTag, onUpdateTag }
}

function useCollectionWireframeState(
  bookmarks: readonly MockBookmark[],
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>
): {
  activeCollection: string | null
  collections: typeof mockCollections
  onCreateCollection: (draft: CollectionDraft) => void
  onDeleteCollection: (collectionId: string) => void
  onMoveCollection: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onUpdateCollection: (collectionId: string, draft: CollectionDraft) => void
  setActiveCollection: React.Dispatch<React.SetStateAction<string | null>>
} {
  const [collections, setCollections] = React.useState(mockCollections)
  const [activeCollection, setActiveCollection] = React.useState<string | null>(
    "research"
  )

  const onCreateCollection = (draft: CollectionDraft): void => {
    const collectionId = `collection-${crypto.randomUUID()}`

    setCollections((currentCollections) => [
      {
        ...draft,
        createdAt: Date.now(),
        id: collectionId,
        order: 0,
      },
      ...currentCollections.map((collection) =>
        collection.parentId === draft.parentId
          ? { ...collection, order: collection.order + 1 }
          : collection
      ),
    ])
  }

  const onUpdateCollection = (
    collectionId: string,
    draft: CollectionDraft
  ): void => {
    setCollections((currentCollections) => {
      const currentCollection = currentCollections.find(
        (collection) => collection.id === collectionId
      )
      if (!currentCollection) return currentCollections

      const parentChanged = currentCollection.parentId !== draft.parentId
      const movedCollections = parentChanged
        ? moveCollection(currentCollections, collectionId, draft.parentId, 0)
        : { collections: [...currentCollections], ok: true as const }

      if (!movedCollections.ok) return currentCollections
      return movedCollections.collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, ...draft }
          : collection
      )
    })
  }

  const onDeleteCollection = (collectionId: string): void => {
    const deletion = getCollectionDeletion(collections, bookmarks, collectionId)

    setCollections(deletion.remainingCollections)
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map((bookmark) => {
        const currentMemberships = bookmark.collections ?? []
        const remainingMemberships = currentMemberships.filter(
          (membership) => !deletion.deletedIds.has(membership)
        )
        const movedToTrash =
          currentMemberships.length > 0 &&
          remainingMemberships.length === 0 &&
          currentMemberships.every((membership) =>
            deletion.deletedIds.has(membership)
          )

        return {
          ...bookmark,
          collections: remainingMemberships,
          trashedAt: movedToTrash ? Date.now() : bookmark.trashedAt,
        }
      })
    )

    if (activeCollection && deletion.deletedIds.has(activeCollection)) {
      setActiveCollection(null)
    }
  }

  const onMoveCollection = (
    sourceId: string,
    parentId: string | null,
    index: number
  ): void => {
    setCollections((currentCollections) => {
      const result = moveCollection(
        currentCollections,
        sourceId,
        parentId,
        index
      )
      return result.ok ? result.collections : currentCollections
    })
  }

  return {
    activeCollection,
    collections,
    onCreateCollection,
    onDeleteCollection,
    onMoveCollection,
    onUpdateCollection,
    setActiveCollection,
  }
}

/**
 * Disposable dashboard shell wireframe. Not linked from product navigation.
 *
 * Slice 6: Collection-scoped reorder mode across the existing list and grid
 * views. Filter is still deferred — see spec/sessions/session-02.md.
 *
 * To remove this page entirely: delete src/routes/dashboard-ui.tsx and
 * src/dev/dashboard-ui/, then run the dev server or build once so
 * src/routeTree.gen.ts regenerates without the /dashboard-ui route.
 */
export function DashboardUiPage({
  initialNavigationPreferences,
}: {
  initialNavigationPreferences: DashboardNavigationPreferences
}): React.ReactElement {
  const {
    actionHandlers,
    bookmarks,
    selectedBookmarkIds,
    setBookmarks,
    setSelectedBookmarkIds,
  } = useBookmarkWireframeState()
  const {
    tags,
    onCreateTag: handleCreateTag,
    onDeleteTag: handleDeleteTag,
    onMoveTag: handleMoveTag,
    onUpdateTag: handleUpdateTag,
  } = useTagWireframeState(setBookmarks)
  const {
    activeCollection,
    collections,
    onCreateCollection: handleCreateCollection,
    onDeleteCollection: handleDeleteCollection,
    onMoveCollection: handleMoveCollection,
    onUpdateCollection: handleUpdateCollection,
    setActiveCollection,
  } = useCollectionWireframeState(bookmarks, setBookmarks)
  const [sort, setSort] = React.useState<SortOption>("date")
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")
  const [collectionOrders, setCollectionOrders] = React.useState<
    Record<string, string[]>
  >(() => createCollectionOrders(mockBookmarks))
  const [isReordering, setIsReordering] = React.useState(false)
  const isDraggingRef = React.useRef(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const isMobile = useIsMobile()
  const shouldReduceMotion = useReducedMotion()
  const effectiveViewMode = isMobile && viewMode === "grid" ? "list" : viewMode
  const scopedBookmarks = React.useMemo(
    () =>
      activeCollection
        ? bookmarks.filter(
            (bookmark) =>
              !bookmark.trashedAt &&
              bookmark.collections?.includes(activeCollection)
          )
        : bookmarks.filter((bookmark) => !bookmark.trashedAt),
    [activeCollection, bookmarks]
  )
  const visibleBookmarks = React.useMemo(() => {
    if (!(activeCollection && sort === "custom")) return scopedBookmarks

    return orderBookmarksByIds(
      scopedBookmarks,
      collectionOrders[activeCollection] ??
        scopedBookmarks.map((bookmark) => bookmark.id)
    )
  }, [activeCollection, collectionOrders, scopedBookmarks, sort])
  const canReorder = activeCollection !== null && scopedBookmarks.length >= 2
  const activeCollectionName =
    collections.find((collection) => collection.id === activeCollection)
      ?.name ?? null
  const collectionIndex = React.useMemo(
    () => createCollectionIndex(collections, bookmarks, "custom"),
    [bookmarks, collections]
  )
  const activeCollectionNode = activeCollection
    ? collectionIndex.roots.find(
        (root) => root.collection.id === activeCollection
      )
    : undefined

  const focusDisplayTrigger = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          isMobile
            ? "[aria-label='Open navigation']"
            : "[data-dashboard-display-trigger]"
        )
        ?.focus()
    })
  }

  const exitReorderMode = (restoreFocus: boolean): void => {
    isDraggingRef.current = false
    setIsReordering(false)
    if (restoreFocus) focusDisplayTrigger()
  }

  const handleSelectAllBookmarks = (): void => {
    setActiveCollection(null)
    setSelectedBookmarkIds(new Set())
    if (sort === "custom") setSort("date")
  }

  const handleSelectCollection = (collection: string): void => {
    setActiveCollection(collection)
    setSelectedBookmarkIds(new Set())
  }

  const handleNavigation = (): void => {
    if (isReordering) exitReorderMode(false)
  }

  const handleSortChange = (nextSort: SortOption): void => {
    if (!isReordering) setSort(nextSort)
  }

  const handleViewModeChange = (nextViewMode: ViewMode): void => {
    if (!isReordering) setViewMode(nextViewMode)
  }

  const handleStartReorder = (): void => {
    if (!(activeCollection && canReorder)) return

    setSort("custom")
    setSelectedBookmarkIds(new Set())
    setIsReordering(true)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-reorder-handle]")?.focus()
    })
  }

  const handleMove = (fromIndex: number, toIndex: number): void => {
    if (!activeCollection) return

    const visibleIds = visibleBookmarks.map((bookmark) => bookmark.id)
    setCollectionOrders((currentOrders) => ({
      ...currentOrders,
      [activeCollection]: moveBookmarkId(visibleIds, fromIndex, toIndex),
    }))
  }

  return (
    // h-svh (fixed, not min-h-svh) gives this column a real, bounded
    // height — a min-height-only parent never gives flex-1 children
    // anything definite to fill, so they just grow with their content
    // instead of clipping. min-h-0 at every level below overrides
    // flexbox's default min-height:auto (which refuses to shrink a flex
    // item below its content size), letting the chain actually reach the
    // scroll region instead of pushing the whole page taller.
    <div className="h-svh bg-background [padding-inline-start:env(safe-area-inset-left)] [padding-inline-end:env(safe-area-inset-right)] [padding-block-start:env(safe-area-inset-top)] [padding-block-end:env(safe-area-inset-bottom)] min-[800px]:p-0">
      <SkipLink href="#dashboard-main-content">Skip to content</SkipLink>
      <div className="flex h-full flex-col px-4 py-4 min-[800px]:px-6 min-[800px]:py-10">
        <LayoutGroup id="dashboard-sidebar">
          <SidebarProvider
            className="mx-auto min-h-0 w-full max-w-[896px] min-w-0 flex-1 min-[800px]:gap-6"
            onOpenChange={setSidebarOpen}
            open={sidebarOpen}
          >
            <DashboardSidebar
              activeCollection={activeCollection}
              bookmarks={bookmarks}
              canReorder={canReorder}
              collections={collections}
              initialDisclosures={initialNavigationPreferences.desktop}
              isReordering={isReordering}
              onCreateCollection={handleCreateCollection}
              onCreateTag={handleCreateTag}
              onDeleteCollection={handleDeleteCollection}
              onDeleteTag={handleDeleteTag}
              onMoveCollection={handleMoveCollection}
              onMoveTag={handleMoveTag}
              onNavigate={handleNavigation}
              onSelectAllBookmarks={handleSelectAllBookmarks}
              onSelectCollection={handleSelectCollection}
              onSortChange={handleSortChange}
              onStartReorder={handleStartReorder}
              onUpdateCollection={handleUpdateCollection}
              onUpdateTag={handleUpdateTag}
              onViewModeChange={handleViewModeChange}
              sort={sort}
              tags={tags}
              viewMode={viewMode}
            />

            <DashboardMainPanel
              actionHandlers={actionHandlers}
              activeCollectionName={activeCollectionName}
              activeCollectionNode={activeCollectionNode}
              collections={collections}
              controlsProps={{
                activeCollection,
                bookmarks,
                canReorder,
                collections,
                isReordering,
                mobileNavigationDisclosures:
                  initialNavigationPreferences.mobile,
                onCreateCollection: handleCreateCollection,
                onCreateTag: handleCreateTag,
                onDeleteCollection: handleDeleteCollection,
                onDeleteTag: handleDeleteTag,
                onMoveCollection: handleMoveCollection,
                onMoveTag: handleMoveTag,
                onNavigate: handleNavigation,
                onSelectAllBookmarks: handleSelectAllBookmarks,
                onSelectCollection: handleSelectCollection,
                onSortChange: handleSortChange,
                onStartReorder: handleStartReorder,
                onUpdateCollection: handleUpdateCollection,
                onUpdateTag: handleUpdateTag,
                onViewModeChange: handleViewModeChange,
                sort,
                tags,
                title: activeCollectionName ?? "All bookmarks",
                viewMode,
              }}
              effectiveViewMode={effectiveViewMode}
              isDraggingRef={isDraggingRef}
              isReordering={isReordering}
              onExitReorder={exitReorderMode}
              onMove={handleMove}
              onSelectCollection={handleSelectCollection}
              selectedBookmarkIds={selectedBookmarkIds}
              shouldReduceMotion={shouldReduceMotion}
              sidebarOpen={sidebarOpen}
              sort={sort}
              tags={tags}
              visibleBookmarks={visibleBookmarks}
            />
          </SidebarProvider>
        </LayoutGroup>
      </div>
    </div>
  )
}
