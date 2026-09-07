import {
  getLibraryPageSize,
  getSearchLimits,
  type LibraryPage,
  type LibraryReadRequest,
  type LibraryReadResult,
} from "@/lib/library/library-adapter"
import {
  decodeLibraryCursor,
  encodeLibraryCursor,
  type LibraryCursorKind,
  type LibraryCursorValue,
} from "@/lib/library/library-cursor"
import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"
import type {
  Bookmark,
  BookmarkDetail,
  Collection,
  DashboardPreferences,
  Tag,
} from "@/lib/library/library-types"

export interface InMemoryLibraryReadState {
  bookmarks: readonly Bookmark[]
  collections: readonly Collection[]
  details: readonly BookmarkDetail[]
  preferences: DashboardPreferences
  tags: readonly Tag[]
}

const compareIds = (first: string, second: string): number =>
  BigInt(first) < BigInt(second) ? -1 : BigInt(first) > BigInt(second) ? 1 : 0

const compareText = (first: string, second: string): number =>
  first.localeCompare(second, undefined, { sensitivity: "base" })

const cloneBookmark = (bookmark: Bookmark): Bookmark => ({ ...bookmark })
const cloneCollection = (collection: Collection): Collection => ({
  ...collection,
})
const cloneTag = (tag: Tag): Tag => ({ ...tag })
const cloneDetail = (detail: BookmarkDetail): BookmarkDetail => ({
  bookmarkId: detail.bookmarkId,
  collections: detail.collections.map((membership) => ({ ...membership })),
  tagIds: [...detail.tagIds],
})

const getCursorValues = (
  item: Bookmark | Collection | Tag,
  order: string
): LibraryCursorValue[] => {
  if ("metadataStatus" in item) {
    if (order === "date") return [item.createdAt]
    if (order === "visits") return [item.visitCount]
    if (order === "alpha") return [item.title]
    return []
  }
  if (order === "newest") return [item.createdAt]
  if (order === "alpha") return [item.name]
  return [item.sortOrder]
}

const paginate = <T extends { id: string }>(
  items: T[],
  pageSize: number,
  cursor: string | undefined,
  kind: LibraryCursorKind,
  binding: string,
  cursorValues: (item: T) => LibraryCursorValue[]
): LibraryPage<T> => {
  let startIndex = 0
  if (cursor !== undefined) {
    const payload = decodeLibraryCursor(cursor, kind, binding)
    const cursorIndex = items.findIndex((item) => item.id === payload.id)
    if (cursorIndex < 0) {
      throw invalidLibraryInput(
        "The pagination cursor no longer matches this view."
      )
    }
    startIndex = cursorIndex + 1
  }

  const pageItems = items.slice(startIndex, startIndex + pageSize)
  const lastItem = pageItems.at(-1)
  return {
    items: pageItems,
    nextCursor:
      startIndex + pageItems.length < items.length && lastItem
        ? encodeLibraryCursor({
            binding,
            id: lastItem.id,
            kind,
            values: cursorValues(lastItem),
            version: 1,
          })
        : null,
  }
}

class InMemoryLibraryReader {
  private readonly state: InMemoryLibraryReadState
  private readonly detailsByBookmarkId: ReadonlyMap<string, BookmarkDetail>

  constructor(state: InMemoryLibraryReadState) {
    this.state = state
    this.detailsByBookmarkId = new Map(
      state.details.map((detail) => [detail.bookmarkId, detail])
    )
  }

  read(request: LibraryReadRequest): LibraryReadResult {
    switch (request.kind) {
      case "bookmarks":
        return { kind: request.kind, page: this.readBookmarks(request) }
      case "collections":
        return { kind: request.kind, page: this.readCollections(request) }
      case "tags":
        return { kind: request.kind, page: this.readTags(request) }
      case "bookmark-detail":
        return {
          detail: this.readBookmarkDetail(request.bookmarkId),
          kind: request.kind,
        }
      case "search":
        return { kind: request.kind, results: this.search(request) }
      case "preferences":
        return {
          kind: request.kind,
          preferences: { ...this.state.preferences },
        }
    }
  }

  private getDetail(bookmarkId: string): BookmarkDetail {
    return (
      this.detailsByBookmarkId.get(bookmarkId) ?? {
        bookmarkId: bookmarkId as BookmarkDetail["bookmarkId"],
        collections: [],
        tagIds: [],
      }
    )
  }

  private readBookmarks(
    request: Extract<LibraryReadRequest, { kind: "bookmarks" }>
  ): LibraryPage<Bookmark> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const destination = request.destination
    const destinationBinding =
      destination.kind === "collection"
        ? `collection:${destination.collectionId}`
        : destination.kind === "tags"
          ? `tags:${[...destination.tagIds].sort(compareIds).join(",")}`
          : destination.kind
    const binding = `bookmarks:${destinationBinding}:${request.sort}`
    if (request.sort === "custom" && destination.kind !== "collection") {
      throw invalidLibraryInput(
        "Custom order requires a collection destination."
      )
    }

    const bookmarks = this.state.bookmarks
      .filter((bookmark) => {
        const isTrashed = bookmark.trashedAt !== null
        if (destination.kind === "trash") return isTrashed
        if (isTrashed) return false

        const detail = this.getDetail(bookmark.id)
        if (destination.kind === "uncollected") {
          return detail.collections.length === 0
        }
        if (destination.kind === "collection") {
          return detail.collections.some(
            (membership) => membership.collectionId === destination.collectionId
          )
        }
        if (destination.kind === "tags") {
          const selectedTags = new Set(destination.tagIds)
          return detail.tagIds.some((tagId) => selectedTags.has(tagId))
        }
        return true
      })
      .sort((first, second) => {
        if (request.sort === "date") {
          return (
            second.createdAt - first.createdAt ||
            compareIds(second.id, first.id)
          )
        }
        if (request.sort === "visits") {
          return (
            second.visitCount - first.visitCount ||
            compareIds(second.id, first.id)
          )
        }
        if (request.sort === "alpha") {
          return (
            compareText(first.title, second.title) ||
            compareIds(first.id, second.id)
          )
        }
        const collectionId = (
          destination as Extract<typeof destination, { kind: "collection" }>
        ).collectionId
        const firstOrder = this.getDetail(first.id).collections.find(
          (item) => item.collectionId === collectionId
        )?.sortOrder
        const secondOrder = this.getDetail(second.id).collections.find(
          (item) => item.collectionId === collectionId
        )?.sortOrder
        return (
          (firstOrder ?? "").localeCompare(secondOrder ?? "") ||
          compareIds(first.id, second.id)
        )
      })
      .map(cloneBookmark)

    return paginate(
      bookmarks,
      pageSize,
      request.cursor,
      "bookmarks",
      binding,
      (bookmark) => getCursorValues(bookmark, request.sort)
    )
  }

  private readCollections(
    request: Extract<LibraryReadRequest, { kind: "collections" }>
  ): LibraryPage<Collection> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const binding = `collections:${request.parentId ?? "root"}:${request.order}`
    const activeBookmarkIds = new Set(
      this.state.bookmarks
        .filter((bookmark) => bookmark.trashedAt === null)
        .map((bookmark) => bookmark.id)
    )
    const counts = new Map<string, number>()
    for (const detail of this.state.details) {
      if (!activeBookmarkIds.has(detail.bookmarkId)) continue
      for (const membership of detail.collections) {
        counts.set(
          membership.collectionId,
          (counts.get(membership.collectionId) ?? 0) + 1
        )
      }
    }
    const collections = this.state.collections
      .filter((collection) => collection.parentId === request.parentId)
      .sort((first, second) => {
        if (request.order === "newest") {
          return (
            second.createdAt - first.createdAt ||
            compareIds(second.id, first.id)
          )
        }
        if (request.order === "alpha") {
          return (
            compareText(first.name, second.name) ||
            compareIds(first.id, second.id)
          )
        }
        return (
          first.sortOrder.localeCompare(second.sortOrder) ||
          compareIds(first.id, second.id)
        )
      })
      .map((collection) => ({
        ...cloneCollection(collection),
        directBookmarkCount: counts.get(collection.id) ?? 0,
      }))

    return paginate(
      collections,
      pageSize,
      request.cursor,
      "collections",
      binding,
      (collection) => getCursorValues(collection, request.order)
    )
  }

  private readTags(
    request: Extract<LibraryReadRequest, { kind: "tags" }>
  ): LibraryPage<Tag> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const binding = `tags:${request.order}`
    const tags = [...this.state.tags]
      .sort((first, second) => {
        if (request.order === "newest") {
          return (
            second.createdAt - first.createdAt ||
            compareIds(second.id, first.id)
          )
        }
        if (request.order === "alpha") {
          return (
            compareText(first.name, second.name) ||
            compareIds(first.id, second.id)
          )
        }
        return (
          first.sortOrder.localeCompare(second.sortOrder) ||
          compareIds(first.id, second.id)
        )
      })
      .map(cloneTag)

    return paginate(tags, pageSize, request.cursor, "tags", binding, (tag) =>
      getCursorValues(tag, request.order)
    )
  }

  private readBookmarkDetail(
    bookmarkId: Extract<
      LibraryReadRequest,
      { kind: "bookmark-detail" }
    >["bookmarkId"]
  ): BookmarkDetail {
    if (!this.state.bookmarks.some((bookmark) => bookmark.id === bookmarkId)) {
      throw new LibraryError("not_found", "Bookmark not found.", false)
    }
    return cloneDetail(this.getDetail(bookmarkId))
  }

  private search(
    request: Extract<LibraryReadRequest, { kind: "search" }>
  ): Extract<LibraryReadResult, { kind: "search" }>["results"] {
    const query = request.query.trim().toLocaleLowerCase()
    if (query.length === 0 || query.length > 200) {
      throw invalidLibraryInput("Search text must contain 1 to 200 characters.")
    }
    const { bookmarkLimit, collectionLimit } = getSearchLimits(
      request.bookmarkLimit,
      request.collectionLimit
    )
    const collectionsById = new Map(
      this.state.collections.map((collection) => [collection.id, collection])
    )
    const collectionPath = (collection: Collection): string => {
      const parent =
        collection.parentId === null
          ? undefined
          : collectionsById.get(collection.parentId)
      return parent ? `${parent.name} / ${collection.name}` : collection.name
    }

    return {
      bookmarks: this.state.bookmarks
        .filter(
          (bookmark) =>
            bookmark.trashedAt === null &&
            [bookmark.title, bookmark.url, bookmark.domain ?? ""].some(
              (value) => value.toLocaleLowerCase().includes(query)
            )
        )
        .sort((first, second) => compareText(first.title, second.title))
        .slice(0, bookmarkLimit)
        .map(({ domain, faviconUrl, id, title, url }) => ({
          domain,
          faviconUrl,
          id,
          title,
          url,
        })),
      collections: this.state.collections
        .filter((collection) =>
          collectionPath(collection).toLocaleLowerCase().includes(query)
        )
        .sort((first, second) =>
          compareText(collectionPath(first), collectionPath(second))
        )
        .slice(0, collectionLimit)
        .map((collection) => ({
          color: collection.color,
          icon: collection.icon,
          id: collection.id,
          name: collection.name,
          parentId: collection.parentId,
          path: collectionPath(collection),
        })),
    }
  }
}

export const readInMemoryLibrary = (
  state: InMemoryLibraryReadState,
  request: LibraryReadRequest
): LibraryReadResult => new InMemoryLibraryReader(state).read(request)
