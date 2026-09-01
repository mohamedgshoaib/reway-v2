import { useReducedMotion } from "motion/react"
import * as React from "react"

import { toastManager } from "@/components/ui/toast"
import type { BookmarkActionHandlers } from "@/dev/dashboard-ui/bookmark-actions"
import {
  createCollectionOrders,
  moveBookmarkId,
  orderBookmarksByIds,
} from "@/dev/dashboard-ui/bookmark-order"
import {
  applyBookmarkBulkAction,
  createBookmarkSelectionState,
  deriveBookmarkSelection,
  getBookmarkBulkActionKey,
  reduceBookmarkSelection,
  type BookmarkBulkAction,
} from "@/dev/dashboard-ui/bookmark-selection"
import type { BookmarkSelectionChangeHandler } from "@/dev/dashboard-ui/bookmark-selection-control"
import { markBookmarkRangeHintSeen } from "@/dev/dashboard-ui/bookmark-selection-hint-store"
import {
  getCollectionDeletion,
  moveCollection,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import type { CollectionDraft } from "@/dev/dashboard-ui/collection-management"
import {
  deriveDashboardDestination,
  getDashboardDestinationKey,
  getDashboardDestinationNavigation,
  setDashboardTagActive,
  type DashboardDestination,
} from "@/dev/dashboard-ui/dashboard-destination"
import type { DashboardMainPanel } from "@/dev/dashboard-ui/dashboard-main-panel"
import {
  mockBookmarks,
  mockCollections,
  mockTags,
  type MockBookmark,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import type { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"
import { moveTag, type Tag, type TagDraft } from "@/dev/dashboard-ui/tag-model"
import { useIsMobile } from "@/hooks/use-media-query"

const INITIAL_DESTINATION = {
  collectionId: "research",
  kind: "collection",
} as const satisfies DashboardDestination
const MOCK_BULK_MUTATION_DELAY = 450
const MOCK_DELETED_AT = Date.UTC(2026, 7, 31, 9)
const BULK_TOAST_ID = "dashboard-bookmark-bulk-action"

export type BookmarkBulkMutationFixture = (
  action: BookmarkBulkAction
) => Promise<void>

const runDefaultBulkMutationFixture: BookmarkBulkMutationFixture = () =>
  new Promise((resolve) => {
    setTimeout(resolve, MOCK_BULK_MUTATION_DELAY)
  })

function bookmarkCountLabel(count: number): string {
  return `${count} ${count === 1 ? "bookmark" : "bookmarks"}`
}

function getBulkSuccessTitle(
  action: BookmarkBulkAction,
  affectedCount: number,
  collections: readonly Collection[]
): string {
  const count = bookmarkCountLabel(affectedCount)
  if (action.kind === "delete") return `Moved ${count} to Trash`

  const collectionName =
    collections.find((collection) => collection.id === action.collectionId)
      ?.name ?? "collection"
  if (action.kind === "add") return `Added ${count} to ${collectionName}`
  if (action.kind === "move") return `Moved ${count} to ${collectionName}`
  return `Removed ${count} from ${collectionName}`
}

function getBulkErrorTitle(action: BookmarkBulkAction): string {
  if (action.kind === "add") return "Could not add bookmarks"
  if (action.kind === "move") return "Could not move bookmarks"
  if (action.kind === "remove") return "Could not remove bookmarks"
  return "Could not move bookmarks to Trash"
}

function useBookmarkWireframeState(): {
  actionHandlers: Omit<BookmarkActionHandlers, "onSelectChange">
  bookmarks: MockBookmark[]
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>
} {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)

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

  const actionHandlers: Omit<BookmarkActionHandlers, "onSelectChange"> = {
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
        currentBookmarks.map((bookmark) =>
          bookmark.id === bookmarkId
            ? { ...bookmark, trashedAt: MOCK_DELETED_AT }
            : bookmark
        )
      )
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
    setBookmarks,
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
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>,
  destination: DashboardDestination,
  onActiveCollectionDeleted: () => void
): {
  collections: typeof mockCollections
  onCreateCollection: (draft: CollectionDraft) => void
  onDeleteCollection: (collectionId: string) => void
  onMoveCollection: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onUpdateCollection: (collectionId: string, draft: CollectionDraft) => void
} {
  const [collections, setCollections] = React.useState(mockCollections)

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

    if (
      destination.kind === "collection" &&
      deletion.deletedIds.has(destination.collectionId)
    ) {
      onActiveCollectionDeleted()
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
    collections,
    onCreateCollection,
    onDeleteCollection,
    onMoveCollection,
    onUpdateCollection,
  }
}

export interface DashboardUiController {
  mainPanelProps: React.ComponentProps<typeof DashboardMainPanel>
  onSidebarOpenChange: (open: boolean) => void
  sidebarOpen: boolean
  sidebarProps: React.ComponentProps<typeof DashboardSidebar>
}

export function useDashboardUiController({
  initialNavigationPreferences,
  bulkMutationFixture = runDefaultBulkMutationFixture,
}: {
  initialNavigationPreferences: DashboardNavigationPreferences
  bulkMutationFixture?: BookmarkBulkMutationFixture
}): DashboardUiController {
  const [destination, setDestination] =
    React.useState<DashboardDestination>(INITIAL_DESTINATION)
  const [selectionState, dispatchSelection] = React.useReducer(
    reduceBookmarkSelection,
    getDashboardDestinationKey(INITIAL_DESTINATION),
    createBookmarkSelectionState
  )
  const [selectionAnnouncement, setSelectionAnnouncement] = React.useState("")
  const [tagFilterAnnouncement, setTagFilterAnnouncement] = React.useState("")
  const [isReordering, setIsReordering] = React.useState(false)
  const [sort, setSort] = React.useState<SortOption>("date")
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")
  const selectionEntryBookmarkIdRef = React.useRef<string | null>(null)
  const updateSelection: BookmarkSelectionChangeHandler = (
    bookmarkId,
    checked,
    extendRange,
    visibleIds
  ) => {
    const rangeApplied =
      extendRange &&
      selectionState.anchorId !== null &&
      visibleIds.includes(selectionState.anchorId) &&
      visibleIds.includes(bookmarkId)
    if (rangeApplied) markBookmarkRangeHintSeen()

    dispatchSelection({
      bookmarkId,
      checked,
      extendRange,
      type: "toggle",
      visibleIds,
    })
    if (selectionState.mode === "idle") {
      setSelectionAnnouncement("Selection mode is active.")
    }
  }
  const handleBookmarkActionSelection = (
    bookmarkId: string,
    selected: boolean
  ): void => {
    if (selected && selectionState.mode === "idle") {
      selectionEntryBookmarkIdRef.current = bookmarkId
    }
    updateSelection(bookmarkId, selected, false, [bookmarkId])
  }
  const {
    actionHandlers: bookmarkActionHandlers,
    bookmarks,
    setBookmarks,
  } = useBookmarkWireframeState()
  const actionHandlers: BookmarkActionHandlers = {
    ...bookmarkActionHandlers,
    onSelectChange: handleBookmarkActionSelection,
  }
  const {
    tags,
    onCreateTag: handleCreateTag,
    onDeleteTag: deleteTag,
    onMoveTag: handleMoveTag,
    onUpdateTag: handleUpdateTag,
  } = useTagWireframeState(setBookmarks)
  const {
    collections,
    onCreateCollection: handleCreateCollection,
    onDeleteCollection: handleDeleteCollection,
    onMoveCollection: handleMoveCollection,
    onUpdateCollection: handleUpdateCollection,
  } = useCollectionWireframeState(bookmarks, setBookmarks, destination, () => {
    setDestination({ kind: "all" })
    dispatchSelection({ destinationKey: "all", type: "destination-changed" })
    setIsReordering(false)
    setSort("date")
  })
  const [collectionOrders, setCollectionOrders] = React.useState<
    Record<string, string[]>
  >(() => createCollectionOrders(mockBookmarks))
  const isDraggingRef = React.useRef(false)
  const bulkMutationTokenRef = React.useRef(0)
  const bulkMutationInFlightRef = React.useRef(false)
  const bulkRollbackRef = React.useRef<MockBookmark[] | null>(null)
  const bulkProgressTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const isMobile = useIsMobile()
  const shouldReduceMotion = useReducedMotion()
  const effectiveViewMode = isMobile && viewMode === "grid" ? "list" : viewMode
  const destinationView = React.useMemo(
    () =>
      deriveDashboardDestination({
        bookmarks,
        collections,
        destination,
        tags,
      }),
    [bookmarks, collections, destination, tags]
  )
  const activeCollectionId = destinationView.sidebar.collectionId
  const activeTags = tags.filter((tag) =>
    destinationView.sidebar.tagIds.has(tag.id)
  )
  const scopedBookmarks = destinationView.bookmarks
  const visibleBookmarks = React.useMemo(() => {
    if (!(activeCollectionId && sort === "custom")) return scopedBookmarks

    return orderBookmarksByIds(
      scopedBookmarks,
      collectionOrders[activeCollectionId] ??
        scopedBookmarks.map((bookmark) => bookmark.id)
    )
  }, [activeCollectionId, collectionOrders, scopedBookmarks, sort])
  const canReorder = destinationView.canReorder
  const activeCollectionName = activeCollectionId
    ? destinationView.heading
    : null
  const destinationBookmarkIds = React.useMemo(
    () => destinationView.bookmarks.map((bookmark) => bookmark.id),
    [destinationView.bookmarks]
  )
  const selectionView = React.useMemo(
    () => deriveBookmarkSelection(selectionState, destinationBookmarkIds),
    [destinationBookmarkIds, selectionState]
  )
  const selectionMode = selectionState.mode === "selecting"

  const clearBulkProgressTimer = (): void => {
    if (bulkProgressTimerRef.current === null) return
    clearTimeout(bulkProgressTimerRef.current)
    bulkProgressTimerRef.current = null
  }

  const cancelPendingBulkMutation = (): void => {
    bulkMutationTokenRef.current += 1
    clearBulkProgressTimer()
    bulkMutationInFlightRef.current = false
    if (bulkRollbackRef.current) {
      setBookmarks(bulkRollbackRef.current)
      bulkRollbackRef.current = null
    }
  }

  const focusSelectionEntry = (): void => {
    const bookmarkId = selectionEntryBookmarkIdRef.current
    selectionEntryBookmarkIdRef.current = null
    requestAnimationFrame(() => {
      const trigger = Array.from(
        document.querySelectorAll<HTMLElement>("[data-bookmark-actions]")
      ).find((element) => element.dataset.bookmarkActions === bookmarkId)
      const fallback = document.querySelector<HTMLElement>(
        "#dashboard-main-content"
      )
      ;(trigger ?? fallback)?.focus()
    })
  }

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

  const exitSelectionMode = (): void => {
    cancelPendingBulkMutation()
    dispatchSelection({ type: "exit" })
    setSelectionAnnouncement("")
    focusSelectionEntry()
  }

  const executeBulkAction = async (
    action: BookmarkBulkAction,
    selectedIds: ReadonlySet<string>,
    trigger: HTMLElement | null,
    retry: boolean
  ): Promise<boolean> => {
    if (bulkMutationInFlightRef.current || selectedIds.size === 0) return false

    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      action,
      MOCK_DELETED_AT
    )
    if (result.affectedCount === 0) return false

    bulkMutationInFlightRef.current = true
    const token = bulkMutationTokenRef.current + 1
    bulkMutationTokenRef.current = token
    bulkRollbackRef.current = [...bookmarks]
    setBookmarks(result.bookmarks)
    dispatchSelection(
      retry
        ? { type: "mutation-retried" }
        : {
            action,
            selectedIds: [...selectedIds],
            type: "mutation-started",
          }
    )
    bulkProgressTimerRef.current = setTimeout(() => {
      if (bulkMutationTokenRef.current !== token) return
      dispatchSelection({ type: "mutation-progress-shown" })
    }, 300)

    if (retry) {
      toastManager.update(BULK_TOAST_ID, {
        actionProps: undefined,
        description: "Your selection is unchanged until this succeeds.",
        timeout: 0,
        title: "Retrying",
        type: "loading",
      })
    }

    try {
      await bulkMutationFixture(action)
      if (bulkMutationTokenRef.current !== token) return false

      clearBulkProgressTimer()
      bulkMutationInFlightRef.current = false
      bulkRollbackRef.current = null
      dispatchSelection({ type: "mutation-succeeded" })
      toastManager.add({
        id: BULK_TOAST_ID,
        priority: "low",
        title: getBulkSuccessTitle(action, result.affectedCount, collections),
        type: "success",
      })
      setSelectionAnnouncement("")
      focusSelectionEntry()
      return true
    } catch {
      if (bulkMutationTokenRef.current !== token) return false

      clearBulkProgressTimer()
      bulkMutationInFlightRef.current = false
      setBookmarks(bulkRollbackRef.current ?? [...bookmarks])
      bulkRollbackRef.current = null
      dispatchSelection({ type: "mutation-failed" })
      toastManager.add({
        actionProps: {
          children: "Retry",
          onClick: () => {
            void executeBulkAction(action, selectedIds, trigger, true)
          },
        },
        description: "Your selection and bookmarks were restored.",
        id: BULK_TOAST_ID,
        priority: "high",
        timeout: 0,
        title: getBulkErrorTitle(action),
        type: "error",
      })
      requestAnimationFrame(() => trigger?.focus())
      return false
    }
  }

  const handleRunBulkAction = (
    action: BookmarkBulkAction,
    trigger: HTMLElement | null
  ): Promise<boolean> => {
    const failedMutation = selectionState.mutation
    const retryingFailedAction =
      failedMutation.status === "failed" &&
      getBookmarkBulkActionKey(failedMutation.action) ===
        getBookmarkBulkActionKey(action)
    const selectedIds = new Set(
      retryingFailedAction
        ? failedMutation.selectedIds
        : selectionView.selectedIds
    )

    return executeBulkAction(action, selectedIds, trigger, retryingFailedAction)
  }

  const navigateToDestination = (
    nextDestination: DashboardDestination
  ): void => {
    const navigation = getDashboardDestinationNavigation(
      destination,
      nextDestination
    )
    if (!navigation.destinationChanged) return

    cancelPendingBulkMutation()
    setDestination(nextDestination)
    if (navigation.clearSelection) {
      selectionEntryBookmarkIdRef.current = null
      dispatchSelection({
        destinationKey: getDashboardDestinationKey(nextDestination),
        type: "destination-changed",
      })
      setSelectionAnnouncement("")
    }
    if (!navigation.sortOptions.includes(sort)) {
      setSort(navigation.sortOptions[0])
    }
    if (navigation.exitReorder && isReordering) exitReorderMode(false)
  }

  const handleSelectAllBookmarks = (): void =>
    navigateToDestination({ kind: "all" })

  const handleSelectCollection = (collectionId: string): void =>
    navigateToDestination({ collectionId, kind: "collection" })

  const handleTagActiveChange = (tagId: string, active: boolean): void => {
    const nextDestination = setDashboardTagActive(destination, tagId, active)
    if (
      getDashboardDestinationKey(nextDestination) ===
      getDashboardDestinationKey(destination)
    ) {
      return
    }

    if (isMobile) {
      const tagName = tags.find((tag) => tag.id === tagId)?.name ?? "Tag"
      const nextResultCount = deriveDashboardDestination({
        bookmarks,
        collections,
        destination: nextDestination,
        tags,
      }).bookmarks.length
      setTagFilterAnnouncement(
        `${tagName} filter ${active ? "added" : "removed"}. ${bookmarkCountLabel(nextResultCount)} shown.`
      )
    }

    navigateToDestination(nextDestination)
  }

  const handleClearTagFilters = (): void => {
    if (destination.kind !== "tags") return

    if (isMobile) {
      const allBookmarkCount = deriveDashboardDestination({
        bookmarks,
        collections,
        destination: { kind: "all" },
        tags,
      }).bookmarks.length
      setTagFilterAnnouncement(
        `Tag filters cleared. ${bookmarkCountLabel(allBookmarkCount)} shown.`
      )
    }

    navigateToDestination({ kind: "all" })
  }

  const handleDeleteTag = (tagId: string): void => {
    const wasActive = destinationView.sidebar.tagIds.has(tagId)
    deleteTag(tagId)
    if (wasActive) handleTagActiveChange(tagId, false)
  }

  const handleSortChange = (nextSort: SortOption): void => {
    if (!isReordering) {
      setSort(nextSort)
      dispatchSelection({ type: "sort-changed" })
    }
  }

  const handleViewModeChange = (nextViewMode: ViewMode): void => {
    if (!isReordering) setViewMode(nextViewMode)
  }

  const handleStartReorder = (): void => {
    if (!(activeCollectionId && canReorder) || selectionMode) return

    setSort("custom")
    setIsReordering(true)
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-reorder-handle]")?.focus()
    })
  }

  const handleMove = (fromIndex: number, toIndex: number): void => {
    if (!activeCollectionId) return

    const visibleIds = visibleBookmarks.map((bookmark) => bookmark.id)
    setCollectionOrders((currentOrders) => ({
      ...currentOrders,
      [activeCollectionId]: moveBookmarkId(visibleIds, fromIndex, toIndex),
    }))
  }

  const handleToggleAllSelection = (): void => {
    dispatchSelection({
      type: "toggle-all",
      visibleIds: destinationBookmarkIds,
    })
  }

  return {
    mainPanelProps: {
      actionHandlers,
      activeCollectionName,
      activeTags,
      collections,
      controlsProps: {
        activeCollection: activeCollectionId,
        activeTagIds: destinationView.sidebar.tagIds,
        allBookmarksActive: destinationView.sidebar.allBookmarks,
        bookmarks,
        canReorder,
        collections,
        isReordering,
        mobileNavigationDisclosures: initialNavigationPreferences.mobile,
        onCreateCollection: handleCreateCollection,
        onCreateTag: handleCreateTag,
        onDeleteCollection: handleDeleteCollection,
        onDeleteTag: handleDeleteTag,
        onMoveCollection: handleMoveCollection,
        onMoveTag: handleMoveTag,
        onSelectAllBookmarks: handleSelectAllBookmarks,
        onSelectCollection: handleSelectCollection,
        onSortChange: handleSortChange,
        onStartReorder: handleStartReorder,
        onTagActiveChange: handleTagActiveChange,
        onUpdateCollection: handleUpdateCollection,
        onUpdateTag: handleUpdateTag,
        onViewModeChange: handleViewModeChange,
        sort,
        tagFilterResultCount: destinationView.bookmarks.length,
        tags,
        title: destinationView.heading,
        viewMode,
      },
      effectiveViewMode,
      emptyState: destinationView.emptyState,
      isDraggingRef,
      isReordering,
      onDirectSelectionChange: updateSelection,
      onExitReorder: exitReorderMode,
      onExitSelection: exitSelectionMode,
      onMove: handleMove,
      onClearTagFilters: handleClearTagFilters,
      onRemoveTagFilter: (tagId) => handleTagActiveChange(tagId, false),
      onSelectCollection: handleSelectCollection,
      selectedBookmarkIds: selectionView.selectedIds,
      selectionAnnouncement,
      selectionBarsProps: {
        activeCollectionId,
        allVisibleSelected: selectionView.allVisibleSelected,
        bookmarks,
        collections,
        mutation: selectionState.mutation,
        onClose: exitSelectionMode,
        onRunAction: handleRunBulkAction,
        onToggleAll: handleToggleAllSelection,
        selectedCount: selectionView.selectedCount,
        selectedIds: selectionView.selectedIds,
        visibleCount: destinationView.bookmarks.length,
      },
      selectionMode,
      shouldReduceMotion,
      sidebarOpen,
      sort,
      tagFilterAnnouncement,
      tags,
      visibleBookmarks,
    },
    onSidebarOpenChange: setSidebarOpen,
    sidebarOpen,
    sidebarProps: {
      activeCollection: activeCollectionId,
      activeTagIds: destinationView.sidebar.tagIds,
      allBookmarksActive: destinationView.sidebar.allBookmarks,
      bookmarks,
      canReorder,
      collections,
      initialDisclosures: initialNavigationPreferences.desktop,
      isReordering,
      onCreateCollection: handleCreateCollection,
      onCreateTag: handleCreateTag,
      onDeleteCollection: handleDeleteCollection,
      onDeleteTag: handleDeleteTag,
      onMoveCollection: handleMoveCollection,
      onMoveTag: handleMoveTag,
      onSelectAllBookmarks: handleSelectAllBookmarks,
      onSelectCollection: handleSelectCollection,
      onSortChange: handleSortChange,
      onStartReorder: handleStartReorder,
      onTagActiveChange: handleTagActiveChange,
      onUpdateCollection: handleUpdateCollection,
      onUpdateTag: handleUpdateTag,
      onViewModeChange: handleViewModeChange,
      sort,
      tagFilterResultCount: destinationView.bookmarks.length,
      tags,
      viewMode,
    },
  }
}
