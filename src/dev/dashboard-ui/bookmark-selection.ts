import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

export type BookmarkBulkAction =
  | { kind: "add"; collectionId: string }
  | { kind: "move"; collectionId: string }
  | { kind: "remove"; collectionId: string }
  | { kind: "delete" }

export type BookmarkSelectionMutation =
  | { status: "idle" }
  | {
      action: BookmarkBulkAction
      selectedIds: readonly string[]
      showProgress: boolean
      status: "pending"
    }
  | {
      action: BookmarkBulkAction
      selectedIds: readonly string[]
      status: "failed"
    }

export interface BookmarkSelectionState {
  anchorId: string | null
  destinationKey: string
  mode: "idle" | "selecting"
  mutation: BookmarkSelectionMutation
  selectedIds: ReadonlySet<string>
}

export type BookmarkSelectionEvent =
  | { bookmarkId?: string; type: "enter" }
  | { type: "exit" }
  | {
      bookmarkId: string
      checked: boolean
      extendRange: boolean
      type: "toggle"
      visibleIds: readonly string[]
    }
  | { type: "toggle-all"; visibleIds: readonly string[] }
  | { type: "sort-changed" }
  | { destinationKey: string; type: "destination-changed" }
  | {
      action: BookmarkBulkAction
      selectedIds: readonly string[]
      type: "mutation-started"
    }
  | { type: "mutation-progress-shown" }
  | { type: "mutation-failed" }
  | { type: "mutation-retried" }
  | { type: "mutation-succeeded" }

export interface BookmarkSelectionView {
  allVisibleSelected: boolean
  selectedCount: number
  selectedIds: ReadonlySet<string>
}

export interface BookmarkBulkMutationResult {
  affectedCount: number
  bookmarks: MockBookmark[]
}

export interface BookmarkBulkDestinationAvailability {
  addDisabledReason: string | null
  moveDisabledReason: string | null
}

const idleMutation = (): BookmarkSelectionMutation => ({ status: "idle" })

export function createBookmarkSelectionState(
  destinationKey: string
): BookmarkSelectionState {
  return {
    anchorId: null,
    destinationKey,
    mode: "idle",
    mutation: idleMutation(),
    selectedIds: new Set(),
  }
}

function selectRange(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
  anchorId: string,
  bookmarkId: string
): Set<string> | null {
  const anchorIndex = visibleIds.indexOf(anchorId)
  const bookmarkIndex = visibleIds.indexOf(bookmarkId)
  if (anchorIndex < 0 || bookmarkIndex < 0) return null

  const rangeStart = Math.min(anchorIndex, bookmarkIndex)
  const rangeEnd = Math.max(anchorIndex, bookmarkIndex)
  const nextSelectedIds = new Set(selectedIds)

  for (let index = rangeStart; index <= rangeEnd; index += 1) {
    const id = visibleIds[index]
    if (id) nextSelectedIds.add(id)
  }

  return nextSelectedIds
}

export function reduceBookmarkSelection(
  state: BookmarkSelectionState,
  event: BookmarkSelectionEvent
): BookmarkSelectionState {
  if (event.type === "enter") {
    return {
      ...state,
      anchorId: event.bookmarkId ?? null,
      mode: "selecting",
      mutation: idleMutation(),
      selectedIds: event.bookmarkId ? new Set([event.bookmarkId]) : new Set(),
    }
  }

  if (event.type === "exit") {
    return createBookmarkSelectionState(state.destinationKey)
  }

  if (event.type === "destination-changed") {
    return createBookmarkSelectionState(event.destinationKey)
  }

  if (event.type === "sort-changed") {
    return { ...state, anchorId: null }
  }

  if (event.type === "toggle") {
    if (event.extendRange && state.anchorId) {
      const rangeSelectedIds = selectRange(
        state.selectedIds,
        event.visibleIds,
        state.anchorId,
        event.bookmarkId
      )
      if (rangeSelectedIds) {
        return {
          ...state,
          mode: "selecting",
          selectedIds: rangeSelectedIds,
        }
      }
    }

    const nextSelectedIds = new Set(state.selectedIds)
    if (event.checked) {
      nextSelectedIds.add(event.bookmarkId)
    } else {
      nextSelectedIds.delete(event.bookmarkId)
    }

    return {
      ...state,
      anchorId: event.bookmarkId,
      mode: "selecting",
      selectedIds: nextSelectedIds,
    }
  }

  if (event.type === "toggle-all") {
    const allVisibleSelected =
      event.visibleIds.length > 0 &&
      event.visibleIds.every((id) => state.selectedIds.has(id))

    return {
      ...state,
      anchorId: null,
      mode: "selecting",
      selectedIds: allVisibleSelected ? new Set() : new Set(event.visibleIds),
    }
  }

  if (event.type === "mutation-started") {
    if (event.selectedIds.length === 0 || state.mutation.status === "pending") {
      return state
    }

    return {
      ...state,
      mutation: {
        action: event.action,
        selectedIds: [...event.selectedIds],
        showProgress: false,
        status: "pending",
      },
    }
  }

  if (
    event.type === "mutation-progress-shown" &&
    state.mutation.status === "pending"
  ) {
    return {
      ...state,
      mutation: { ...state.mutation, showProgress: true },
    }
  }

  if (event.type === "mutation-failed" && state.mutation.status === "pending") {
    return {
      ...state,
      mutation: {
        action: state.mutation.action,
        selectedIds: state.mutation.selectedIds,
        status: "failed",
      },
    }
  }

  if (event.type === "mutation-retried" && state.mutation.status === "failed") {
    return {
      ...state,
      mutation: {
        action: state.mutation.action,
        selectedIds: state.mutation.selectedIds,
        showProgress: false,
        status: "pending",
      },
    }
  }

  if (event.type === "mutation-succeeded") {
    return createBookmarkSelectionState(state.destinationKey)
  }

  return state
}

export function deriveBookmarkSelection(
  state: BookmarkSelectionState,
  visibleIds: readonly string[]
): BookmarkSelectionView {
  const selectedIds = new Set(
    visibleIds.filter((id) => state.selectedIds.has(id))
  )

  return {
    allVisibleSelected:
      visibleIds.length > 0 && selectedIds.size === visibleIds.length,
    selectedCount: selectedIds.size,
    selectedIds,
  }
}

export function getBookmarkBulkActionKey(action: BookmarkBulkAction): string {
  return action.kind === "delete"
    ? action.kind
    : `${action.kind}:${action.collectionId}`
}

export function getBookmarkBulkDestinationDisabledReason(
  bookmarks: readonly MockBookmark[],
  selectedIds: ReadonlySet<string>,
  action: Extract<BookmarkBulkAction, { kind: "add" | "move" }>
): string | null {
  const selectedBookmarks = bookmarks.filter((bookmark) =>
    selectedIds.has(bookmark.id)
  )
  if (selectedBookmarks.length === 0) return "Select a bookmark first."

  if (action.kind === "add") {
    const changesNone = selectedBookmarks.every((bookmark) =>
      bookmark.collections?.includes(action.collectionId)
    )
    return changesNone ? "Already in this collection." : null
  }

  const changesNone = selectedBookmarks.every(
    (bookmark) =>
      bookmark.collections?.length === 1 &&
      bookmark.collections[0] === action.collectionId
  )
  return changesNone ? "Already only in this collection." : null
}

export function deriveBookmarkBulkDestinationAvailability(
  bookmarks: readonly MockBookmark[],
  selectedIds: ReadonlySet<string>,
  collectionIds: readonly string[]
): ReadonlyMap<string, BookmarkBulkDestinationAvailability> {
  const membershipCounts = new Map<string, number>()
  const exclusiveMembershipCounts = new Map<string, number>()
  let selectedCount = 0

  for (const bookmark of bookmarks) {
    if (!selectedIds.has(bookmark.id)) continue
    selectedCount += 1
    const memberships = new Set(bookmark.collections ?? [])
    for (const collectionId of memberships) {
      membershipCounts.set(
        collectionId,
        (membershipCounts.get(collectionId) ?? 0) + 1
      )
    }
    if (memberships.size === 1) {
      const [collectionId] = memberships
      if (collectionId) {
        exclusiveMembershipCounts.set(
          collectionId,
          (exclusiveMembershipCounts.get(collectionId) ?? 0) + 1
        )
      }
    }
  }

  return new Map(
    collectionIds.map((collectionId) => [
      collectionId,
      {
        addDisabledReason:
          selectedCount === 0
            ? "Select a bookmark first."
            : membershipCounts.get(collectionId) === selectedCount
              ? "Already in this collection."
              : null,
        moveDisabledReason:
          selectedCount === 0
            ? "Select a bookmark first."
            : exclusiveMembershipCounts.get(collectionId) === selectedCount
              ? "Already only in this collection."
              : null,
      },
    ])
  )
}

export function applyBookmarkBulkAction(
  bookmarks: readonly MockBookmark[],
  selectedIds: ReadonlySet<string>,
  action: BookmarkBulkAction,
  deletedAt: number
): BookmarkBulkMutationResult {
  let affectedCount = 0
  const nextBookmarks = bookmarks.map((bookmark) => {
    if (!selectedIds.has(bookmark.id)) return bookmark

    const memberships = bookmark.collections ?? []
    if (action.kind === "add") {
      if (memberships.includes(action.collectionId)) return bookmark
      affectedCount += 1
      return {
        ...bookmark,
        collections: [...memberships, action.collectionId],
      }
    }

    if (action.kind === "move") {
      if (memberships.length === 1 && memberships[0] === action.collectionId) {
        return bookmark
      }
      affectedCount += 1
      return { ...bookmark, collections: [action.collectionId] }
    }

    if (action.kind === "remove") {
      if (!memberships.includes(action.collectionId)) return bookmark
      affectedCount += 1
      return {
        ...bookmark,
        collections: memberships.filter(
          (collectionId) => collectionId !== action.collectionId
        ),
      }
    }

    if (bookmark.trashedAt !== undefined) return bookmark
    affectedCount += 1
    return { ...bookmark, trashedAt: deletedAt }
  })

  return { affectedCount, bookmarks: nextBookmarks }
}
