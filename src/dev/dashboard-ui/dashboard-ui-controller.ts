import { minimal } from "@sounds"
import { useSound } from "@web-kits/audio/react"
import { useReducedMotion } from "motion/react"
import * as React from "react"

import { TOAST_DEFAULT_TIMEOUT_MS, toastManager } from "@/components/ui/toast"
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
  applyBookmarkTrashAction,
  getBookmarkRestoreSummary,
  type BookmarkTrashAction,
} from "@/dev/dashboard-ui/bookmark-trash"
import { type Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type {
  DashboardAccountMutationAdapter,
  DashboardProfileFixture,
} from "@/dev/dashboard-ui/dashboard-account"
import { useDashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"
import {
  deriveDashboardDestination,
  getDashboardDestinationKey,
  getDashboardDestinationNavigation,
  setDashboardTagActive,
  type DashboardDestination,
} from "@/dev/dashboard-ui/dashboard-destination"
import type { DashboardMainPanel } from "@/dev/dashboard-ui/dashboard-main-panel"
import {
  useDashboardManagementState,
  type DashboardManagementMutationFixture,
} from "@/dev/dashboard-ui/dashboard-management-state"
import type { DashboardSettingsDialog } from "@/dev/dashboard-ui/dashboard-settings"
import {
  MOCK_DASHBOARD_NOW,
  mockBookmarks,
  type MockBookmark,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { DashboardNavigationPreferences } from "@/dev/dashboard-ui/navigation-preferences"
import type { DashboardSidebar } from "@/dev/dashboard-ui/sidebar"
import { useIsMobile } from "@/hooks/use-media-query"

const INITIAL_DESTINATION = {
  collectionId: "research",
  kind: "collection",
} as const satisfies DashboardDestination
const MOCK_BULK_MUTATION_DELAY = 450
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
  if (action.kind === "restore") return `Restored ${count}`
  if (action.kind === "delete-forever") return `Deleted ${count} forever`

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
  if (action.kind === "restore") return "Could not restore bookmarks"
  if (action.kind === "delete-forever") {
    return "Could not delete bookmarks forever"
  }
  return "Could not move bookmarks to Trash"
}

export interface DashboardUiController {
  mainPanelProps: React.ComponentProps<typeof DashboardMainPanel>
  onSidebarOpenChange: (open: boolean) => void
  settingsDialogProps: React.ComponentProps<typeof DashboardSettingsDialog>
  sidebarOpen: boolean
  sidebarProps: React.ComponentProps<typeof DashboardSidebar>
}

export function useDashboardUiController({
  accountMutationAdapter,
  initialNavigationPreferences,
  initialOnboardingOpen,
  initialProfileFixture,
  bulkMutationFixture = runDefaultBulkMutationFixture,
  managementMutationFixture,
}: {
  accountMutationAdapter?: DashboardAccountMutationAdapter
  initialNavigationPreferences: DashboardNavigationPreferences
  initialOnboardingOpen?: boolean
  initialProfileFixture?: DashboardProfileFixture
  bulkMutationFixture?: BookmarkBulkMutationFixture
  managementMutationFixture?: DashboardManagementMutationFixture
}): DashboardUiController {
  const playUndo = useSound(minimal.undo)
  const account = useDashboardAccountState({
    initialOnboardingOpen,
    initialProfileFixture,
    mutationAdapter: accountMutationAdapter,
  })
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const settingsTriggerRef = React.useRef<HTMLElement | null>(null)
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
    bookmarkHandlers: bookmarkActionHandlers,
    bookmarks,
    collectionHandlers: {
      onCreateCollection: handleCreateCollection,
      onDeleteCollection: handleDeleteCollection,
      onMoveCollection: handleMoveCollection,
      onUpdateCollection: handleUpdateCollection,
    },
    collections,
    setBookmarks,
    tagHandlers: {
      onCreateTag: handleCreateTag,
      onDeleteTag: deleteTag,
      onMoveTag: handleMoveTag,
      onUpdateTag: handleUpdateTag,
    },
    tags,
  } = useDashboardManagementState({
    destination,
    mutationFixture: managementMutationFixture,
    onActiveCollectionDeleted: () => {
      setDestination({ kind: "all" })
      dispatchSelection({ destinationKey: "all", type: "destination-changed" })
      setIsReordering(false)
      setSort("date")
    },
  })

  const restoreBookmarkSnapshot = (
    toastId: string,
    snapshot: readonly MockBookmark[]
  ): void => {
    const bookmarkIds = new Set(snapshot.map((bookmark) => bookmark.id))
    setBookmarks(
      (currentBookmarks) =>
        applyBookmarkTrashAction(currentBookmarks, bookmarkIds, {
          kind: "restore",
        }).bookmarks
    )
    playUndo()

    const summary = getBookmarkRestoreSummary(snapshot, collections)
    toastManager.add({
      actionProps: undefined,
      description: summary.description,
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: summary.title,
      type: "success",
    })
  }

  const runSingleBookmarkDelete = (bookmarkId: string): void => {
    const bookmark = bookmarks.find(
      (item) => item.id === bookmarkId && item.trashedAt === undefined
    )
    if (!bookmark) return

    bookmarkActionHandlers.onDelete(bookmarkId)
    const toastId = `dashboard-bookmark-${bookmarkId}`
    toastManager.add({
      actionProps: {
        children: "Undo",
        onClick: () => restoreBookmarkSnapshot(toastId, [bookmark]),
      },
      description: `${bookmark.title} can be restored for 30 days.`,
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: "Moved to Trash",
      type: "success",
    })
  }

  const runSingleTrashAction = (
    bookmarkId: string,
    action: BookmarkTrashAction
  ): void => {
    const bookmark = bookmarks.find(
      (item) => item.id === bookmarkId && item.trashedAt !== undefined
    )
    if (!bookmark) return

    const result = applyBookmarkTrashAction(
      bookmarks,
      new Set([bookmarkId]),
      action
    )
    if (result.affectedCount === 0) return

    setBookmarks(result.bookmarks)
    const toastId = `dashboard-bookmark-${bookmarkId}`
    const summary = getBookmarkRestoreSummary([bookmark], collections)
    toastManager.add({
      actionProps: undefined,
      description: action.kind === "restore" ? summary.description : undefined,
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title:
        action.kind === "restore"
          ? summary.title
          : `Deleted ${bookmark.title} forever`,
      type: "success",
    })
  }

  const actionHandlers: BookmarkActionHandlers = {
    ...bookmarkActionHandlers,
    onDelete: runSingleBookmarkDelete,
    onDeleteForever: (bookmarkId) =>
      runSingleTrashAction(bookmarkId, { kind: "delete-forever" }),
    onRestore: (bookmarkId) =>
      runSingleTrashAction(bookmarkId, { kind: "restore" }),
    onSelectChange: handleBookmarkActionSelection,
  }
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
  const libraryBookmarks = React.useMemo(
    () => bookmarks.filter((bookmark) => bookmark.trashedAt === undefined),
    [bookmarks]
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

    const bookmarkSnapshot = bookmarks.filter((bookmark) => {
      if (!selectedIds.has(bookmark.id)) return false
      if (action.kind === "restore" || action.kind === "delete-forever") {
        return bookmark.trashedAt !== undefined
      }
      if (action.kind === "delete") return bookmark.trashedAt === undefined
      return false
    })

    const result = applyBookmarkBulkAction(
      bookmarks,
      selectedIds,
      action,
      MOCK_DASHBOARD_NOW
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
      const restoreSummary =
        action.kind === "restore"
          ? getBookmarkRestoreSummary(bookmarkSnapshot, collections)
          : null
      toastManager.add({
        actionProps:
          action.kind === "delete"
            ? {
                children: "Undo",
                onClick: () =>
                  restoreBookmarkSnapshot(BULK_TOAST_ID, bookmarkSnapshot),
              }
            : undefined,
        description:
          action.kind === "delete"
            ? `${result.affectedCount === 1 ? "It" : "They"} can be restored for 30 days.`
            : restoreSummary?.description,
        id: BULK_TOAST_ID,
        priority: "low",
        timeout: TOAST_DEFAULT_TIMEOUT_MS,
        title:
          restoreSummary?.title ??
          getBulkSuccessTitle(action, result.affectedCount, collections),
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

  const handleSelectUncollected = (): void =>
    navigateToDestination({ kind: "uncollected" })

  const handleSelectTrash = (): void => navigateToDestination({ kind: "trash" })

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
        bookmarks: libraryBookmarks,
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

  const handleDeleteTag = async (
    tagId: string,
    reopenDelete?: () => void
  ): Promise<boolean> => {
    const wasActive = destinationView.sidebar.tagIds.has(tagId)
    const deleted = await deleteTag(tagId, reopenDelete)
    if (deleted && wasActive) handleTagActiveChange(tagId, false)
    return deleted
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

  const handleOpenSettings = (trigger: HTMLButtonElement): void => {
    settingsTriggerRef.current = trigger
    setSettingsOpen(true)
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
        onOpenSettings: handleOpenSettings,
        onSelectAllBookmarks: handleSelectAllBookmarks,
        onSelectCollection: handleSelectCollection,
        onSelectTrash: handleSelectTrash,
        onSelectUncollected: handleSelectUncollected,
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
        trashActive: destinationView.sidebar.trash,
        uncollectedActive: destinationView.sidebar.uncollected,
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
        variant: destination.kind === "trash" ? "trash" : "library",
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
    settingsDialogProps: {
      account,
      finalFocus: settingsTriggerRef,
      onOpenChange: setSettingsOpen,
      open: settingsOpen,
    },
    sidebarOpen,
    sidebarProps: {
      activeCollection: activeCollectionId,
      activeTagIds: destinationView.sidebar.tagIds,
      allBookmarksActive: destinationView.sidebar.allBookmarks,
      bookmarks: libraryBookmarks,
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
      onOpenSettings: handleOpenSettings,
      onSelectAllBookmarks: handleSelectAllBookmarks,
      onSelectCollection: handleSelectCollection,
      onSelectTrash: handleSelectTrash,
      onSelectUncollected: handleSelectUncollected,
      onSortChange: handleSortChange,
      onStartReorder: handleStartReorder,
      onTagActiveChange: handleTagActiveChange,
      onUpdateCollection: handleUpdateCollection,
      onUpdateTag: handleUpdateTag,
      onViewModeChange: handleViewModeChange,
      sort,
      tagFilterResultCount: destinationView.bookmarks.length,
      tags,
      trashActive: destinationView.sidebar.trash,
      uncollectedActive: destinationView.sidebar.uncollected,
      viewMode,
    },
  }
}
