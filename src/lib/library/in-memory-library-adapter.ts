import { readInMemoryLibrary } from "@/lib/library/in-memory-library-reads"
import {
  type LibraryAdapter,
  type LibraryCommand,
  type LibraryMutationResult,
  type LibraryReadRequest,
  type LibraryReadResult,
} from "@/lib/library/library-adapter"
import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"
import type {
  Bookmark,
  BookmarkDetail,
  BookmarkId,
  Collection,
  CollectionId,
  DashboardPreferences,
  EpochMilliseconds,
  Tag,
  TagId,
} from "@/lib/library/library-types"
import {
  toCollectionId,
  toEpochMilliseconds,
  toTagId,
} from "@/lib/library/library-types"
import {
  assertUniqueCollectionName,
  assertUniqueTagName,
  assertValidCollectionParent,
  normalizeBookmarkUrl,
  requireUniqueIds,
  validateAlignedOrderInput,
  validateBookmarkTitle,
  validateLibraryName,
  validateOrderKey,
} from "@/lib/library/library-validation"

export interface InMemoryLibrarySeed {
  bookmarkDetails?: BookmarkDetail[]
  bookmarks: Bookmark[]
  collections: Collection[]
  preferences: DashboardPreferences
  recordedEventIds?: string[]
  tags: Tag[]
}

export interface InMemoryLibraryOptions {
  now?: () => EpochMilliseconds
}

const TRASH_RETENTION_MILLISECONDS = 30 * 24 * 60 * 60 * 1_000

const cloneBookmark = (bookmark: Bookmark): Bookmark => ({ ...bookmark })
const cloneCollection = (collection: Collection): Collection => ({
  ...collection,
})
const cloneTag = (tag: Tag): Tag => ({ ...tag })
const clonePreferences = (
  preferences: DashboardPreferences
): DashboardPreferences => ({ ...preferences })
const cloneDetail = (detail: BookmarkDetail): BookmarkDetail => ({
  bookmarkId: detail.bookmarkId,
  collections: detail.collections.map((membership) => ({ ...membership })),
  tagIds: [...detail.tagIds],
})

const nextId = (ids: readonly string[]): string => {
  let greatestId = 0n
  for (const id of ids) {
    const candidate = BigInt(id)
    if (candidate > greatestId) greatestId = candidate
  }
  return (greatestId + 1n).toString()
}

class InMemoryLibraryAdapter implements LibraryAdapter {
  private bookmarks: Bookmark[]
  private collections: Collection[]
  private details: BookmarkDetail[]
  private preferences: DashboardPreferences
  private readonly recordedEventIds: Set<string>
  private tags: Tag[]
  private readonly now: () => EpochMilliseconds

  constructor(seed: InMemoryLibrarySeed, options: InMemoryLibraryOptions) {
    this.bookmarks = seed.bookmarks.map(cloneBookmark)
    this.collections = seed.collections.map(cloneCollection)
    this.details = (seed.bookmarkDetails ?? []).map(cloneDetail)
    this.preferences = clonePreferences(seed.preferences)
    this.recordedEventIds = new Set(seed.recordedEventIds ?? [])
    this.tags = seed.tags.map(cloneTag)
    this.now = options.now ?? (() => toEpochMilliseconds(Date.now()))
  }

  async read(request: LibraryReadRequest): Promise<LibraryReadResult> {
    return readInMemoryLibrary(
      {
        bookmarks: this.bookmarks,
        collections: this.collections,
        details: this.details,
        preferences: this.preferences,
        tags: this.tags,
      },
      request
    )
  }

  async mutate(command: LibraryCommand): Promise<LibraryMutationResult> {
    switch (command.kind) {
      case "create-collection":
        return {
          collection: this.createCollection(command.draft),
          kind: "collection",
        }
      case "edit-collection":
        return {
          collection: this.editCollection(
            command.collectionId,
            command.expectedRowVersion,
            command.patch
          ),
          kind: "collection",
        }
      case "delete-collection":
        return this.deleteCollection(command.collectionId)
      case "reorder-collection":
        return this.reorderCollection(command)
      case "rebalance-collections":
        return this.rebalanceCollections(command)
      case "create-tag":
        return { kind: "tag", tag: this.createTag(command.draft) }
      case "edit-tag":
        return {
          kind: "tag",
          tag: this.editTag(
            command.tagId,
            command.expectedRowVersion,
            command.patch
          ),
        }
      case "delete-tag":
        return this.deleteTag(command.tagId)
      case "reorder-tag":
        return this.reorderTag(command)
      case "rebalance-tags":
        return this.rebalanceTags(command)
      case "edit-bookmark":
        return {
          bookmark: this.editBookmark(
            command.bookmarkId,
            command.expectedRowVersion,
            command.patch
          ),
          kind: "bookmark",
        }
      case "replace-bookmark-tags":
        return this.replaceBookmarkTags(command.bookmarkId, command.tagIds)
      case "add-bookmarks-to-collection":
      case "move-bookmarks-to-collection":
        return this.applyCollectionMemberships(command)
      case "remove-bookmarks-from-collection":
        return this.removeCollectionMemberships(command)
      case "trash-bookmarks":
      case "restore-bookmarks":
      case "delete-bookmarks-forever":
        return this.applyTrashMutation(command)
      case "reorder-bookmark":
        return this.reorderBookmark(command)
      case "rebalance-bookmarks":
        return this.rebalanceBookmarks(command)
      case "update-preferences":
        return this.updatePreferences(command)
      case "record-visits":
        return this.recordVisits(command.events)
    }
  }

  private requireBookmark(bookmarkId: BookmarkId): Bookmark {
    const bookmark = this.bookmarks.find(
      (candidate) => candidate.id === bookmarkId
    )
    if (!bookmark)
      throw new LibraryError("not_found", "Bookmark not found.", false)
    return bookmark
  }

  private requireCollection(collectionId: CollectionId): Collection {
    const collection = this.collections.find(
      (candidate) => candidate.id === collectionId
    )
    if (!collection) {
      throw new LibraryError("not_found", "Collection not found.", false)
    }
    return collection
  }

  private requireTag(tagId: TagId): Tag {
    const tag = this.tags.find((candidate) => candidate.id === tagId)
    if (!tag) throw new LibraryError("not_found", "Tag not found.", false)
    return tag
  }

  private getDetail(bookmarkId: BookmarkId): BookmarkDetail {
    let detail = this.details.find(
      (candidate) => candidate.bookmarkId === bookmarkId
    )
    if (!detail) {
      detail = { bookmarkId, collections: [], tagIds: [] }
      this.details.push(detail)
    }
    return detail
  }

  private getDirectBookmarkCount(collectionId: CollectionId): number {
    let count = 0
    for (const detail of this.details) {
      const bookmark = this.bookmarks.find(
        (item) => item.id === detail.bookmarkId
      )
      if (
        bookmark?.trashedAt === null &&
        detail.collections.some((item) => item.collectionId === collectionId)
      ) {
        count += 1
      }
    }
    return count
  }

  private withCollectionCount(collection: Collection): Collection {
    return {
      ...cloneCollection(collection),
      directBookmarkCount: this.getDirectBookmarkCount(collection.id),
    }
  }

  private createCollection(
    draft: Extract<LibraryCommand, { kind: "create-collection" }>["draft"]
  ): Collection {
    const name = validateLibraryName(draft.name)
    assertUniqueCollectionName(this.collections, name)
    assertValidCollectionParent(this.collections, undefined, draft.parentId)
    validateOrderKey(draft.sortOrder)
    this.assertUniqueCollectionOrder(draft.parentId, draft.sortOrder)

    const timestamp = this.now()
    const collection: Collection = {
      bookmarkOrderVersion: 0,
      childOrderVersion: 0,
      color: draft.color,
      createdAt: timestamp,
      directBookmarkCount: 0,
      icon: draft.icon,
      id: toCollectionId(nextId(this.collections.map(({ id }) => id))),
      name,
      parentId: draft.parentId,
      rowVersion: 1,
      sortOrder: draft.sortOrder,
      updatedAt: timestamp,
    }
    this.collections.push(collection)
    return cloneCollection(collection)
  }

  private editCollection(
    collectionId: CollectionId,
    expectedRowVersion: number,
    patch: Extract<LibraryCommand, { kind: "edit-collection" }>["patch"]
  ): Collection {
    const collection = this.requireCollection(collectionId)
    this.assertRowVersion(collection.rowVersion, expectedRowVersion)
    const name = validateLibraryName(patch.name)
    assertUniqueCollectionName(this.collections, name, collectionId)
    Object.assign(collection, {
      color: patch.color,
      icon: patch.icon,
      name,
      rowVersion: collection.rowVersion + 1,
      updatedAt: this.now(),
    })
    return this.withCollectionCount(collection)
  }

  private deleteCollection(
    collectionId: CollectionId
  ): Extract<LibraryMutationResult, { kind: "collection-deleted" }> {
    this.requireCollection(collectionId)
    const deletedIds = new Set<CollectionId>([collectionId])
    for (const collection of this.collections) {
      if (collection.parentId === collectionId) deletedIds.add(collection.id)
    }

    let trashedBookmarkCount = 0
    const now = this.now()
    for (const detail of this.details) {
      const removedMemberships = detail.collections.filter((membership) =>
        deletedIds.has(membership.collectionId)
      )
      if (removedMemberships.length === 0) continue
      detail.collections = detail.collections.filter(
        (membership) => !deletedIds.has(membership.collectionId)
      )
      const bookmark = this.requireBookmark(detail.bookmarkId)
      bookmark.collectionCount = detail.collections.length
      if (bookmark.trashedAt === null && detail.collections.length === 0) {
        bookmark.trashedAt = now
        bookmark.purgeAfter = toEpochMilliseconds(
          now + TRASH_RETENTION_MILLISECONDS
        )
        bookmark.rowVersion += 1
        bookmark.updatedAt = now
        trashedBookmarkCount += 1
      }
    }

    this.collections = this.collections.filter(
      (collection) => !deletedIds.has(collection.id)
    )
    return {
      deletedCollectionCount: deletedIds.size,
      kind: "collection-deleted",
      targetIds: [...deletedIds],
      trashedBookmarkCount,
    }
  }

  private reorderCollection(
    command: Extract<LibraryCommand, { kind: "reorder-collection" }>
  ): Extract<LibraryMutationResult, { kind: "collection-reordered" }> {
    const collection = this.requireCollection(command.collectionId)
    const sourceParentId = collection.parentId
    this.assertCollectionScopeVersion(
      sourceParentId,
      command.expectedSourceVersion
    )
    this.assertCollectionScopeVersion(
      command.parentId,
      command.expectedDestinationVersion
    )
    assertValidCollectionParent(
      this.collections,
      collection.id,
      command.parentId
    )
    validateOrderKey(command.sortOrder)
    this.assertUniqueCollectionOrder(
      command.parentId,
      command.sortOrder,
      command.collectionId
    )

    collection.parentId = command.parentId
    collection.sortOrder = command.sortOrder
    collection.rowVersion += 1
    collection.updatedAt = this.now()
    const sourceVersion = this.incrementCollectionScopeVersion(sourceParentId)
    const destinationVersion =
      command.parentId === sourceParentId
        ? sourceVersion
        : this.incrementCollectionScopeVersion(command.parentId)

    return { destinationVersion, kind: "collection-reordered", sourceVersion }
  }

  private rebalanceCollections(
    command: Extract<LibraryCommand, { kind: "rebalance-collections" }>
  ): Extract<LibraryMutationResult, { kind: "scope-reordered" }> {
    validateAlignedOrderInput(command.collectionIds, command.sortOrders)
    requireUniqueIds(command.collectionIds)
    this.assertCollectionScopeVersion(command.parentId, command.expectedVersion)
    const scopeIds: CollectionId[] = []
    for (const collection of this.collections) {
      if (collection.parentId === command.parentId) {
        scopeIds.push(collection.id)
      }
    }
    this.assertExactScope(scopeIds, command.collectionIds)
    for (const [index, collectionId] of command.collectionIds.entries()) {
      const collection = this.requireCollection(collectionId)
      collection.sortOrder = command.sortOrders[index] ?? collection.sortOrder
      collection.rowVersion += 1
      collection.updatedAt = this.now()
    }
    return {
      kind: "scope-reordered",
      scope: "collections",
      version: this.incrementCollectionScopeVersion(command.parentId),
    }
  }

  private createTag(
    draft: Extract<LibraryCommand, { kind: "create-tag" }>["draft"]
  ): Tag {
    const name = validateLibraryName(draft.name)
    assertUniqueTagName(this.tags, name)
    validateOrderKey(draft.sortOrder)
    this.assertUniqueTagOrder(draft.sortOrder)
    const timestamp = this.now()
    const tag: Tag = {
      color: draft.color,
      createdAt: timestamp,
      id: toTagId(nextId(this.tags.map(({ id }) => id))),
      name,
      rowVersion: 1,
      sortOrder: draft.sortOrder,
      updatedAt: timestamp,
    }
    this.tags.push(tag)
    return cloneTag(tag)
  }

  private editTag(
    tagId: TagId,
    expectedRowVersion: number,
    patch: Extract<LibraryCommand, { kind: "edit-tag" }>["patch"]
  ): Tag {
    const tag = this.requireTag(tagId)
    this.assertRowVersion(tag.rowVersion, expectedRowVersion)
    const name = validateLibraryName(patch.name)
    assertUniqueTagName(this.tags, name, tagId)
    Object.assign(tag, {
      color: patch.color,
      name,
      rowVersion: tag.rowVersion + 1,
      updatedAt: this.now(),
    })
    return cloneTag(tag)
  }

  private deleteTag(
    tagId: TagId
  ): Extract<LibraryMutationResult, { kind: "tag-deleted" }> {
    this.requireTag(tagId)
    let affectedCount = 0
    for (const detail of this.details) {
      if (!detail.tagIds.includes(tagId)) continue
      detail.tagIds = detail.tagIds.filter((candidate) => candidate !== tagId)
      affectedCount += 1
    }
    this.tags = this.tags.filter((tag) => tag.id !== tagId)
    return { affectedCount, kind: "tag-deleted", targetIds: [tagId] }
  }

  private reorderTag(
    command: Extract<LibraryCommand, { kind: "reorder-tag" }>
  ): Extract<LibraryMutationResult, { kind: "scope-reordered" }> {
    this.assertRowVersion(
      this.preferences.tagOrderVersion,
      command.expectedVersion
    )
    const tag = this.requireTag(command.tagId)
    validateOrderKey(command.sortOrder)
    this.assertUniqueTagOrder(command.sortOrder, command.tagId)
    tag.sortOrder = command.sortOrder
    tag.rowVersion += 1
    tag.updatedAt = this.now()
    this.preferences.tagOrderVersion += 1
    this.preferences.rowVersion += 1
    this.preferences.updatedAt = this.now()
    return {
      kind: "scope-reordered",
      scope: "tags",
      version: this.preferences.tagOrderVersion,
    }
  }

  private rebalanceTags(
    command: Extract<LibraryCommand, { kind: "rebalance-tags" }>
  ): Extract<LibraryMutationResult, { kind: "scope-reordered" }> {
    validateAlignedOrderInput(command.tagIds, command.sortOrders)
    requireUniqueIds(command.tagIds)
    this.assertRowVersion(
      this.preferences.tagOrderVersion,
      command.expectedVersion
    )
    this.assertExactScope(
      this.tags.map(({ id }) => id),
      command.tagIds
    )
    for (const [index, tagId] of command.tagIds.entries()) {
      const tag = this.requireTag(tagId)
      tag.sortOrder = command.sortOrders[index] ?? tag.sortOrder
      tag.rowVersion += 1
      tag.updatedAt = this.now()
    }
    this.preferences.tagOrderVersion += 1
    this.preferences.rowVersion += 1
    this.preferences.updatedAt = this.now()
    return {
      kind: "scope-reordered",
      scope: "tags",
      version: this.preferences.tagOrderVersion,
    }
  }

  private editBookmark(
    bookmarkId: BookmarkId,
    expectedRowVersion: number,
    patch: Extract<LibraryCommand, { kind: "edit-bookmark" }>["patch"]
  ): Bookmark {
    const bookmark = this.requireBookmark(bookmarkId)
    this.assertRowVersion(bookmark.rowVersion, expectedRowVersion)
    bookmark.title = validateBookmarkTitle(patch.title)
    bookmark.url = normalizeBookmarkUrl(patch.url)
    bookmark.domain = new URL(bookmark.url).hostname
    bookmark.rowVersion += 1
    bookmark.updatedAt = this.now()
    return cloneBookmark(bookmark)
  }

  private replaceBookmarkTags(
    bookmarkId: BookmarkId,
    tagIds: TagId[]
  ): Extract<LibraryMutationResult, { kind: "bookmark-tags-replaced" }> {
    this.requireBookmark(bookmarkId)
    if (new Set(tagIds).size !== tagIds.length) {
      throw invalidLibraryInput("Tag IDs must be unique.")
    }
    for (const tagId of tagIds) this.requireTag(tagId)
    this.getDetail(bookmarkId).tagIds = [...tagIds]
    return {
      affectedCount: tagIds.length,
      bookmarkId,
      kind: "bookmark-tags-replaced",
      requiresRefetch: true,
      tagIds: [...tagIds],
    }
  }

  private applyCollectionMemberships(
    command: Extract<
      LibraryCommand,
      {
        kind: "add-bookmarks-to-collection" | "move-bookmarks-to-collection"
      }
    >
  ): Extract<LibraryMutationResult, { kind: "bulk" }> {
    validateAlignedOrderInput(command.bookmarkIds, command.sortOrders)
    requireUniqueIds(command.bookmarkIds)
    this.requireCollection(command.collectionId)
    for (const bookmarkId of command.bookmarkIds) {
      const bookmark = this.requireBookmark(bookmarkId)
      if (bookmark.trashedAt !== null) {
        throw new LibraryError(
          "conflict",
          "A selected bookmark is in Trash.",
          true
        )
      }
    }
    for (const [index, bookmarkId] of command.bookmarkIds.entries()) {
      const detail = this.getDetail(bookmarkId)
      if (command.kind === "move-bookmarks-to-collection")
        detail.collections = []
      detail.collections = detail.collections.filter(
        (membership) => membership.collectionId !== command.collectionId
      )
      detail.collections.push({
        collectionId: command.collectionId,
        sortOrder: command.sortOrders[index] ?? "",
      })
      this.requireBookmark(bookmarkId).collectionCount =
        detail.collections.length
    }
    return {
      affectedCount: command.bookmarkIds.length,
      kind: "bulk",
      requiresRefetch: true,
      targetIds: [...command.bookmarkIds],
    }
  }

  private removeCollectionMemberships(
    command: Extract<
      LibraryCommand,
      { kind: "remove-bookmarks-from-collection" }
    >
  ): Extract<LibraryMutationResult, { kind: "bulk" }> {
    requireUniqueIds(command.bookmarkIds)
    this.requireCollection(command.collectionId)
    for (const bookmarkId of command.bookmarkIds) {
      const bookmark = this.requireBookmark(bookmarkId)
      if (bookmark.trashedAt !== null) {
        throw new LibraryError(
          "conflict",
          "A selected bookmark is in Trash.",
          true
        )
      }
      const detail = this.getDetail(bookmarkId)
      if (
        !detail.collections.some(
          (membership) => membership.collectionId === command.collectionId
        )
      ) {
        throw new LibraryError(
          "not_found",
          "Bookmark membership not found.",
          true
        )
      }
    }
    for (const bookmarkId of command.bookmarkIds) {
      const detail = this.getDetail(bookmarkId)
      detail.collections = detail.collections.filter(
        (membership) => membership.collectionId !== command.collectionId
      )
      this.requireBookmark(bookmarkId).collectionCount =
        detail.collections.length
    }
    return {
      affectedCount: command.bookmarkIds.length,
      kind: "bulk",
      requiresRefetch: true,
      targetIds: [...command.bookmarkIds],
    }
  }

  private applyTrashMutation(
    command: Extract<
      LibraryCommand,
      {
        kind:
          | "trash-bookmarks"
          | "restore-bookmarks"
          | "delete-bookmarks-forever"
      }
    >
  ): Extract<LibraryMutationResult, { kind: "bulk" }> {
    requireUniqueIds(command.bookmarkIds)
    for (const bookmarkId of command.bookmarkIds) {
      const bookmark = this.requireBookmark(bookmarkId)
      const needsTrash = command.kind !== "trash-bookmarks"
      if ((bookmark.trashedAt !== null) !== needsTrash) {
        throw new LibraryError(
          "conflict",
          "A bookmark has changed state.",
          true
        )
      }
    }

    if (command.kind === "delete-bookmarks-forever") {
      const deletedIds = new Set(command.bookmarkIds)
      this.bookmarks = this.bookmarks.filter(
        (bookmark) => !deletedIds.has(bookmark.id)
      )
      this.details = this.details.filter(
        (detail) => !deletedIds.has(detail.bookmarkId)
      )
    } else {
      const now = this.now()
      for (const bookmarkId of command.bookmarkIds) {
        const bookmark = this.requireBookmark(bookmarkId)
        bookmark.trashedAt = command.kind === "trash-bookmarks" ? now : null
        bookmark.purgeAfter =
          command.kind === "trash-bookmarks"
            ? toEpochMilliseconds(now + TRASH_RETENTION_MILLISECONDS)
            : null
        bookmark.rowVersion += 1
        bookmark.updatedAt = now
      }
    }

    return {
      affectedCount: command.bookmarkIds.length,
      kind: "bulk",
      requiresRefetch: true,
      targetIds: [...command.bookmarkIds],
    }
  }

  private reorderBookmark(
    command: Extract<LibraryCommand, { kind: "reorder-bookmark" }>
  ): Extract<LibraryMutationResult, { kind: "scope-reordered" }> {
    const collection = this.requireCollection(command.collectionId)
    this.assertRowVersion(
      collection.bookmarkOrderVersion,
      command.expectedVersion
    )
    validateOrderKey(command.sortOrder)
    const detail = this.getDetail(command.bookmarkId)
    const membership = detail.collections.find(
      (item) => item.collectionId === command.collectionId
    )
    if (!membership) {
      throw new LibraryError(
        "not_found",
        "Bookmark membership not found.",
        false
      )
    }
    for (const neighborId of [
      command.previousBookmarkId,
      command.nextBookmarkId,
    ]) {
      if (neighborId !== null) this.requireBookmark(neighborId)
    }
    membership.sortOrder = command.sortOrder
    collection.bookmarkOrderVersion += 1
    collection.rowVersion += 1
    collection.updatedAt = this.now()
    return {
      kind: "scope-reordered",
      scope: "bookmarks",
      version: collection.bookmarkOrderVersion,
    }
  }

  private rebalanceBookmarks(
    command: Extract<LibraryCommand, { kind: "rebalance-bookmarks" }>
  ): Extract<LibraryMutationResult, { kind: "scope-reordered" }> {
    validateAlignedOrderInput(command.bookmarkIds, command.sortOrders)
    requireUniqueIds(command.bookmarkIds)
    const collection = this.requireCollection(command.collectionId)
    this.assertRowVersion(
      collection.bookmarkOrderVersion,
      command.expectedVersion
    )
    const scopeIds = this.details.flatMap((detail) =>
      detail.collections.some(
        (membership) => membership.collectionId === command.collectionId
      )
        ? [detail.bookmarkId]
        : []
    )
    this.assertExactScope(scopeIds, command.bookmarkIds)
    for (const [index, bookmarkId] of command.bookmarkIds.entries()) {
      const membership = this.getDetail(bookmarkId).collections.find(
        (item) => item.collectionId === command.collectionId
      )
      if (membership)
        membership.sortOrder = command.sortOrders[index] ?? membership.sortOrder
    }
    collection.bookmarkOrderVersion += 1
    collection.rowVersion += 1
    collection.updatedAt = this.now()
    return {
      kind: "scope-reordered",
      scope: "bookmarks",
      version: collection.bookmarkOrderVersion,
    }
  }

  private updatePreferences(
    command: Extract<LibraryCommand, { kind: "update-preferences" }>
  ): Extract<LibraryMutationResult, { kind: "preferences" }> {
    this.assertRowVersion(
      this.preferences.rowVersion,
      command.expectedRowVersion
    )
    this.preferences = {
      ...this.preferences,
      ...command.patch,
      rowVersion: this.preferences.rowVersion + 1,
      updatedAt: this.now(),
    }
    return {
      kind: "preferences",
      preferences: clonePreferences(this.preferences),
    }
  }

  private recordVisits(
    events: Extract<LibraryCommand, { kind: "record-visits" }>["events"]
  ): Extract<LibraryMutationResult, { kind: "visits-recorded" }> {
    if (events.length === 0)
      throw invalidLibraryInput("Visit events cannot be empty.")
    const eventIds = events.map(({ eventId }) => eventId)
    if (new Set(eventIds).size !== eventIds.length) {
      throw invalidLibraryInput(
        "Visit event IDs must be unique within a batch."
      )
    }
    for (const { bookmarkId } of events) {
      const bookmark = this.requireBookmark(bookmarkId)
      if (bookmark.trashedAt !== null) {
        throw new LibraryError("not_found", "Bookmark not found.", false)
      }
    }

    let insertedCount = 0
    for (const { bookmarkId, eventId } of events) {
      if (this.recordedEventIds.has(eventId)) continue
      this.recordedEventIds.add(eventId)
      this.requireBookmark(bookmarkId).visitCount += 1
      insertedCount += 1
    }
    return { insertedCount, kind: "visits-recorded" }
  }

  private assertRowVersion(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new LibraryError(
        "conflict",
        "The item changed. Refetch and retry.",
        true
      )
    }
  }

  private assertUniqueCollectionOrder(
    parentId: CollectionId | null,
    sortOrder: string,
    editingId?: CollectionId
  ): void {
    if (
      this.collections.some(
        (collection) =>
          collection.id !== editingId &&
          collection.parentId === parentId &&
          collection.sortOrder === sortOrder
      )
    ) {
      throw new LibraryError("conflict", "The collection order changed.", true)
    }
  }

  private assertUniqueTagOrder(sortOrder: string, editingId?: TagId): void {
    if (
      this.tags.some(
        (tag) => tag.id !== editingId && tag.sortOrder === sortOrder
      )
    ) {
      throw new LibraryError("conflict", "The tag order changed.", true)
    }
  }

  private getCollectionScopeVersion(parentId: CollectionId | null): number {
    return parentId === null
      ? this.preferences.rootCollectionOrderVersion
      : this.requireCollection(parentId).childOrderVersion
  }

  private assertCollectionScopeVersion(
    parentId: CollectionId | null,
    expectedVersion: number
  ): void {
    this.assertRowVersion(
      this.getCollectionScopeVersion(parentId),
      expectedVersion
    )
  }

  private incrementCollectionScopeVersion(
    parentId: CollectionId | null
  ): number {
    if (parentId === null) {
      this.preferences.rootCollectionOrderVersion += 1
      this.preferences.rowVersion += 1
      this.preferences.updatedAt = this.now()
      return this.preferences.rootCollectionOrderVersion
    }

    const parent = this.requireCollection(parentId)
    parent.childOrderVersion += 1
    parent.rowVersion += 1
    parent.updatedAt = this.now()
    return parent.childOrderVersion
  }

  private assertExactScope<T>(actualIds: T[], requestedIds: T[]): void {
    const requestedIdSet = new Set(requestedIds)
    if (
      actualIds.length !== requestedIds.length ||
      actualIds.some((id) => !requestedIdSet.has(id))
    ) {
      throw new LibraryError("conflict", "The order scope changed.", true)
    }
  }
}

export const createInMemoryLibraryAdapter = (
  seed: InMemoryLibrarySeed,
  options: InMemoryLibraryOptions = {}
): LibraryAdapter => new InMemoryLibraryAdapter(seed, options)
