import { invalidLibraryInput } from "@/lib/library/library-error"
import type {
  AppearanceColor,
  Bookmark,
  BookmarkDetail,
  BookmarkId,
  BookmarkSort,
  Collection,
  CollectionIcon,
  CollectionId,
  CollectionOrder,
  DashboardPreferences,
  EpochMilliseconds,
  LibrarySearchResults,
  Tag,
  TagId,
  TagOrder,
} from "@/lib/library/library-types"

export const DEFAULT_LIBRARY_PAGE_SIZE = 48
export const MAX_LIBRARY_PAGE_SIZE = 96
export const MAX_BOOKMARK_SEARCH_RESULTS = 32
export const MAX_COLLECTION_SEARCH_RESULTS = 16

export type BookmarkDestination =
  | { kind: "all" }
  | { kind: "uncollected" }
  | { kind: "trash" }
  | { collectionId: CollectionId; kind: "collection" }
  | { kind: "tags"; tagIds: TagId[] }

interface PageRequest {
  cursor?: string
  pageSize?: number
}

export type LibraryReadRequest =
  | ({
      destination: BookmarkDestination
      kind: "bookmarks"
      sort: BookmarkSort
    } & PageRequest)
  | ({
      kind: "collections"
      order: CollectionOrder
      parentId: CollectionId | null
    } & PageRequest)
  | ({ kind: "tags"; order: TagOrder } & PageRequest)
  | { bookmarkId: BookmarkId; kind: "bookmark-detail" }
  | {
      bookmarkLimit?: number
      collectionLimit?: number
      kind: "search"
      query: string
    }
  | { kind: "preferences" }

export interface LibraryPage<T> {
  items: T[]
  nextCursor: string | null
}

export type LibraryReadResult =
  | { kind: "bookmarks"; page: LibraryPage<Bookmark> }
  | { kind: "collections"; page: LibraryPage<Collection> }
  | { kind: "tags"; page: LibraryPage<Tag> }
  | { detail: BookmarkDetail; kind: "bookmark-detail" }
  | { kind: "search"; results: LibrarySearchResults }
  | { kind: "preferences"; preferences: DashboardPreferences }

export interface CollectionDraft {
  color: AppearanceColor
  icon: CollectionIcon
  name: string
  parentId: CollectionId | null
  sortOrder: string
}

export interface TagDraft {
  color: AppearanceColor
  name: string
  sortOrder: string
}

export interface VisitEvent {
  bookmarkId: BookmarkId
  eventId: string
}

export type LibraryCommand =
  | { draft: CollectionDraft; kind: "create-collection" }
  | {
      collectionId: CollectionId
      expectedRowVersion: number
      kind: "edit-collection"
      patch: Pick<CollectionDraft, "color" | "icon" | "name">
    }
  | { collectionId: CollectionId; kind: "delete-collection" }
  | {
      collectionId: CollectionId
      expectedDestinationVersion: number
      expectedSourceVersion: number
      kind: "reorder-collection"
      parentId: CollectionId | null
      sortOrder: string
    }
  | {
      collectionIds: CollectionId[]
      expectedVersion: number
      kind: "rebalance-collections"
      parentId: CollectionId | null
      sortOrders: string[]
    }
  | { draft: TagDraft; kind: "create-tag" }
  | {
      expectedRowVersion: number
      kind: "edit-tag"
      patch: Pick<TagDraft, "color" | "name">
      tagId: TagId
    }
  | { kind: "delete-tag"; tagId: TagId }
  | {
      expectedVersion: number
      kind: "reorder-tag"
      sortOrder: string
      tagId: TagId
    }
  | {
      expectedVersion: number
      kind: "rebalance-tags"
      sortOrders: string[]
      tagIds: TagId[]
    }
  | {
      bookmarkId: BookmarkId
      expectedRowVersion: number
      kind: "edit-bookmark"
      patch: { title: string; url: string }
    }
  | { bookmarkId: BookmarkId; kind: "replace-bookmark-tags"; tagIds: TagId[] }
  | {
      bookmarkIds: BookmarkId[]
      collectionId: CollectionId
      kind: "add-bookmarks-to-collection" | "move-bookmarks-to-collection"
      sortOrders: string[]
    }
  | {
      bookmarkIds: BookmarkId[]
      collectionId: CollectionId
      kind: "remove-bookmarks-from-collection"
    }
  | {
      bookmarkIds: BookmarkId[]
      kind: "trash-bookmarks" | "restore-bookmarks" | "delete-bookmarks-forever"
    }
  | {
      bookmarkId: BookmarkId
      collectionId: CollectionId
      expectedVersion: number
      kind: "reorder-bookmark"
      nextBookmarkId: BookmarkId | null
      previousBookmarkId: BookmarkId | null
      sortOrder: string
    }
  | {
      bookmarkIds: BookmarkId[]
      collectionId: CollectionId
      expectedVersion: number
      kind: "rebalance-bookmarks"
      sortOrders: string[]
    }
  | {
      expectedRowVersion: number
      kind: "update-preferences"
      patch: Partial<
        Pick<
          DashboardPreferences,
          | "bookmarkSort"
          | "collectionOrder"
          | "desktopCollectionsOpen"
          | "desktopTagsOpen"
          | "mobileCollectionsOpen"
          | "mobileTagsOpen"
          | "tagOrder"
          | "theme"
          | "viewMode"
        >
      >
    }
  | { events: VisitEvent[]; kind: "record-visits" }

export type LibraryMutationResult =
  | { collection: Collection; kind: "collection" }
  | { kind: "tag"; tag: Tag }
  | { bookmark: Bookmark; kind: "bookmark" }
  | { kind: "preferences"; preferences: DashboardPreferences }
  | {
      deletedCollectionCount: number
      kind: "collection-deleted"
      targetIds: CollectionId[]
      trashedBookmarkCount: number
    }
  | {
      affectedCount: number
      kind: "tag-deleted"
      targetIds: TagId[]
    }
  | {
      destinationVersion: number
      kind: "collection-reordered"
      sourceVersion: number
    }
  | {
      kind: "scope-reordered"
      scope: "collections" | "tags" | "bookmarks"
      version: number
    }
  | {
      affectedCount: number
      kind: "bulk"
      requiresRefetch: true
      targetIds: BookmarkId[]
    }
  | {
      affectedCount: number
      bookmarkId: BookmarkId
      kind: "bookmark-tags-replaced"
      requiresRefetch: true
      tagIds: TagId[]
    }
  | { insertedCount: number; kind: "visits-recorded" }

export interface LibraryAdapter {
  mutate(command: LibraryCommand): Promise<LibraryMutationResult>
  read(request: LibraryReadRequest): Promise<LibraryReadResult>
}

export const getLibraryPageSize = (pageSize?: number): number => {
  const resolvedPageSize = pageSize ?? DEFAULT_LIBRARY_PAGE_SIZE
  if (
    !Number.isInteger(resolvedPageSize) ||
    resolvedPageSize < 1 ||
    resolvedPageSize > MAX_LIBRARY_PAGE_SIZE
  ) {
    throw invalidLibraryInput(
      `Page size must be between 1 and ${MAX_LIBRARY_PAGE_SIZE}.`
    )
  }

  return resolvedPageSize
}

export const getSearchLimits = (
  bookmarkLimit?: number,
  collectionLimit?: number
): { bookmarkLimit: number; collectionLimit: number } => {
  const resolvedBookmarkLimit = bookmarkLimit ?? MAX_BOOKMARK_SEARCH_RESULTS
  const resolvedCollectionLimit =
    collectionLimit ?? MAX_COLLECTION_SEARCH_RESULTS

  if (
    !Number.isInteger(resolvedBookmarkLimit) ||
    resolvedBookmarkLimit < 1 ||
    resolvedBookmarkLimit > MAX_BOOKMARK_SEARCH_RESULTS ||
    !Number.isInteger(resolvedCollectionLimit) ||
    resolvedCollectionLimit < 1 ||
    resolvedCollectionLimit > MAX_COLLECTION_SEARCH_RESULTS
  ) {
    throw invalidLibraryInput("Search limits exceed the allowed result bounds.")
  }

  return {
    bookmarkLimit: resolvedBookmarkLimit,
    collectionLimit: resolvedCollectionLimit,
  }
}

export const toTimestamp = (
  value: Date | EpochMilliseconds
): EpochMilliseconds =>
  typeof value === "number" ? value : (value.getTime() as EpochMilliseconds)
