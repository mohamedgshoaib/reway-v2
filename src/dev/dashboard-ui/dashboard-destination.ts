import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type {
  MockBookmark,
  SortOption,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { Tag } from "@/dev/dashboard-ui/tag-model"

export type DashboardDestination =
  | { kind: "all" }
  | { kind: "collection"; collectionId: string }
  | { kind: "tags"; tagIds: readonly string[] }
  | { kind: "uncollected" }
  | { kind: "trash" }

export interface DashboardDestinationEmptyState {
  childCollections: readonly { id: string; name: string }[]
  description: string
  title: string
}

export interface DashboardDestinationSidebarState {
  allBookmarks: boolean
  collectionId: string | null
  tagIds: ReadonlySet<string>
  trash: boolean
  uncollected: boolean
}

export interface DashboardDestinationView {
  bookmarks: MockBookmark[]
  canRemoveFromCurrentCollection: boolean
  canReorder: boolean
  emptyState: DashboardDestinationEmptyState
  heading: string
  key: string
  sidebar: DashboardDestinationSidebarState
  sortOptions: readonly SortOption[]
}

export interface DashboardDestinationNavigation {
  clearSelection: boolean
  destinationChanged: boolean
  exitReorder: boolean
  sortOptions: readonly SortOption[]
}

const SYSTEM_SORT_OPTIONS = ["date", "visits", "alpha"] as const
const COLLECTION_SORT_OPTIONS = [...SYSTEM_SORT_OPTIONS, "custom"] as const

export function getDashboardDestinationKey(
  destination: DashboardDestination
): string {
  if (destination.kind === "collection") {
    return `collection:${destination.collectionId}`
  }

  if (destination.kind === "tags") {
    const tagIds = [...new Set(destination.tagIds)].sort()
    return `tags:${tagIds.join(",")}`
  }

  return destination.kind
}

function getSortOptions(
  destination: DashboardDestination
): readonly SortOption[] {
  return destination.kind === "collection"
    ? COLLECTION_SORT_OPTIONS
    : SYSTEM_SORT_OPTIONS
}

function getCollectionEmptyState(
  collection: Collection | undefined,
  collections: readonly Collection[]
): DashboardDestinationEmptyState {
  const childCollections = collection
    ? collections
        .filter((candidate) => candidate.parentId === collection.id)
        .sort(
          (first, second) =>
            first.order - second.order || second.createdAt - first.createdAt
        )
        .map((child) => ({ id: child.id, name: child.name }))
    : []

  return {
    childCollections,
    description: collection
      ? `No bookmarks saved directly to ${collection.name}.`
      : "This collection is no longer available.",
    title: "No bookmarks here",
  }
}

function getTagHeading(
  activeTagIds: ReadonlySet<string>,
  tags: readonly Tag[]
): string {
  const activeTagNames = tags
    .filter((tag) => activeTagIds.has(tag.id))
    .map((tag) => tag.name)

  if (activeTagNames.length === 1) return activeTagNames[0]
  if (activeTagIds.size > 0) return `${activeTagIds.size} tags`
  return "Tagged bookmarks"
}

export function deriveDashboardDestination({
  bookmarks,
  collections,
  destination,
  tags,
}: {
  bookmarks: readonly MockBookmark[]
  collections: readonly Collection[]
  destination: DashboardDestination
  tags: readonly Tag[]
}): DashboardDestinationView {
  const activeTagIds = new Set(
    destination.kind === "tags" ? destination.tagIds : []
  )
  const collection =
    destination.kind === "collection"
      ? collections.find(
          (candidate) => candidate.id === destination.collectionId
        )
      : undefined
  const visibleBookmarks = bookmarks.filter((bookmark) => {
    const isTrashed = bookmark.trashedAt !== undefined

    if (destination.kind === "trash") return isTrashed
    if (isTrashed) return false
    if (destination.kind === "all") return true
    if (destination.kind === "collection") {
      return bookmark.collections?.includes(destination.collectionId) ?? false
    }
    if (destination.kind === "tags") {
      return bookmark.tags?.some((tagId) => activeTagIds.has(tagId)) ?? false
    }

    return (bookmark.collections?.length ?? 0) === 0
  })

  let emptyState: DashboardDestinationEmptyState
  let heading: string

  if (destination.kind === "collection") {
    heading = collection?.name ?? "Collection"
    emptyState = getCollectionEmptyState(collection, collections)
  } else if (destination.kind === "tags") {
    heading = getTagHeading(activeTagIds, tags)
    emptyState = {
      childCollections: [],
      description: "Try another tag or clear the filters.",
      title: "No bookmarks match",
    }
  } else if (destination.kind === "uncollected") {
    heading = "Uncollected"
    emptyState = {
      childCollections: [],
      description: "Bookmarks without a collection appear here.",
      title: "No uncollected bookmarks",
    }
  } else if (destination.kind === "trash") {
    heading = "Trash"
    emptyState = {
      childCollections: [],
      description: "Deleted bookmarks stay here for 30 days.",
      title: "Trash is empty",
    }
  } else {
    heading = "All bookmarks"
    emptyState = {
      childCollections: [],
      description: "Save a tab from the extension to add your first bookmark.",
      title: "No bookmarks yet",
    }
  }

  return {
    bookmarks: visibleBookmarks,
    canRemoveFromCurrentCollection: destination.kind === "collection",
    canReorder:
      destination.kind === "collection" && visibleBookmarks.length >= 2,
    emptyState,
    heading,
    key: getDashboardDestinationKey(destination),
    sidebar: {
      allBookmarks: destination.kind === "all",
      collectionId:
        destination.kind === "collection" ? destination.collectionId : null,
      tagIds: activeTagIds,
      trash: destination.kind === "trash",
      uncollected: destination.kind === "uncollected",
    },
    sortOptions: getSortOptions(destination),
  }
}

export function getDashboardDestinationNavigation(
  currentDestination: DashboardDestination,
  nextDestination: DashboardDestination
): DashboardDestinationNavigation {
  const destinationChanged =
    getDashboardDestinationKey(currentDestination) !==
    getDashboardDestinationKey(nextDestination)

  return {
    clearSelection: destinationChanged,
    destinationChanged,
    exitReorder: destinationChanged,
    sortOptions: getSortOptions(nextDestination),
  }
}
