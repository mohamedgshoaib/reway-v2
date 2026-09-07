import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  LibraryCommand,
  LibraryMutationResult,
} from "@/lib/library/library-adapter"
import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"
import type { BookmarkId, CollectionId } from "@/lib/library/library-types"
import {
  normalizeBookmarkUrl,
  requireUniqueIds,
  toNumericId,
  validateAlignedOrderInput,
  validateBookmarkTitle,
  validateLibraryName,
  validateOrderKey,
} from "@/lib/library/library-validation"
import { throwPostgrestError } from "@/lib/library/supabase-library-error"
import {
  mapSupabaseBookmark,
  mapSupabaseCollection,
  mapSupabasePreferences,
  mapSupabaseTag,
} from "@/lib/library/supabase-library-mappers"
import type { Database } from "@/types/database.generated"

type SupabaseLibraryClient = SupabaseClient<Database>
type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]
type BookmarkWithStats = BookmarkRow & {
  bookmark_stats?: { visit_count: number }[] | null
}

const toNullableNumericId = (id: CollectionId | null): number =>
  id === null ? (null as unknown as number) : toNumericId(id)

const requireRpcNumber = (value: number | null): number => {
  if (value === null) {
    throw new LibraryError(
      "unexpected",
      "The library returned invalid data.",
      true
    )
  }
  return value
}

export class SupabaseLibraryMutations {
  private readonly client: SupabaseLibraryClient
  private ownerIdPromise: Promise<string> | undefined

  constructor(client: SupabaseLibraryClient) {
    this.client = client
  }

  async mutate(command: LibraryCommand): Promise<LibraryMutationResult> {
    switch (command.kind) {
      case "create-collection":
        return this.createCollection(command)
      case "edit-collection":
        return this.editCollection(command)
      case "delete-collection":
        return this.deleteCollection(command.collectionId)
      case "reorder-collection":
        return this.reorderCollection(command)
      case "rebalance-collections":
        return this.rebalanceCollections(command)
      case "create-tag":
        return this.createTag(command)
      case "edit-tag":
        return this.editTag(command)
      case "delete-tag":
        return this.deleteTag(command.tagId)
      case "reorder-tag":
        return this.reorderTag(command)
      case "rebalance-tags":
        return this.rebalanceTags(command)
      case "edit-bookmark":
        return this.editBookmark(command)
      case "replace-bookmark-tags":
        return this.replaceBookmarkTags(command)
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
        return this.recordVisits(command)
    }
  }

  private getOwnerId(): Promise<string> {
    this.ownerIdPromise ??= this.client.auth
      .getClaims()
      .then(({ data, error }) => {
        const subject = data?.claims?.sub
        if (error || typeof subject !== "string" || subject.length === 0) {
          throw new LibraryError(
            "forbidden",
            "Sign in to change the library.",
            false
          )
        }
        return subject
      })
    return this.ownerIdPromise
  }

  private async createCollection(
    command: Extract<LibraryCommand, { kind: "create-collection" }>
  ): Promise<LibraryMutationResult> {
    const name = validateLibraryName(command.draft.name)
    const sortOrder = validateOrderKey(command.draft.sortOrder)
    const userId = await this.getOwnerId()
    const { data, error } = await this.client
      .from("collections")
      .insert({
        color: command.draft.color,
        icon: command.draft.icon,
        name,
        parent_id:
          command.draft.parentId === null
            ? null
            : toNumericId(command.draft.parentId),
        sort_order: sortOrder,
        user_id: userId,
      })
      .select("*")
      .single()
    if (error) throwPostgrestError(error)
    if (!data) {
      throw new LibraryError(
        "unexpected",
        "The library returned invalid data.",
        true
      )
    }
    return { collection: mapSupabaseCollection(data), kind: "collection" }
  }

  private async editCollection(
    command: Extract<LibraryCommand, { kind: "edit-collection" }>
  ): Promise<LibraryMutationResult> {
    const collectionId = toNumericId(command.collectionId)
    const { data, error } = await this.client
      .from("collections")
      .update({
        color: command.patch.color,
        icon: command.patch.icon,
        name: validateLibraryName(command.patch.name),
      })
      .eq("id", collectionId)
      .eq("row_version", command.expectedRowVersion)
      .select("*")
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) return this.throwCollectionConflictOrMissing(collectionId)
    const directBookmarkCount = await this.readDirectBookmarkCount(collectionId)
    return {
      collection: mapSupabaseCollection(data, directBookmarkCount),
      kind: "collection",
    }
  }

  private async deleteCollection(
    collectionId: CollectionId
  ): Promise<LibraryMutationResult> {
    const numericCollectionId = toNumericId(collectionId)
    const { data: childRows, error: childError } = await this.client
      .from("collections")
      .select("id")
      .eq("parent_id", numericCollectionId)
      .order("id")
    if (childError) throwPostgrestError(childError)
    const targetIds = [
      collectionId,
      ...(childRows ?? []).map((row) => String(row.id) as CollectionId),
    ]
    const { data, error } = await this.client.rpc("delete_collection", {
      collection_id: numericCollectionId,
    })
    if (error) throwPostgrestError(error)
    const result = data?.[0]
    if (!result) {
      throw new LibraryError(
        "unexpected",
        "The library returned invalid data.",
        true
      )
    }
    return {
      deletedCollectionCount: result.deleted_collection_count,
      kind: "collection-deleted",
      targetIds,
      trashedBookmarkCount: result.trashed_bookmark_count,
    }
  }

  private async reorderCollection(
    command: Extract<LibraryCommand, { kind: "reorder-collection" }>
  ): Promise<LibraryMutationResult> {
    const { data, error } = await this.client.rpc("reorder_collection", {
      collection_id: toNumericId(command.collectionId),
      expected_destination_version: command.expectedDestinationVersion,
      expected_source_version: command.expectedSourceVersion,
      parent_id: toNullableNumericId(command.parentId),
      sort_order: validateOrderKey(command.sortOrder),
    })
    if (error) throwPostgrestError(error)
    const result = data?.[0]
    if (!result) {
      throw new LibraryError(
        "unexpected",
        "The library returned invalid data.",
        true
      )
    }
    return {
      destinationVersion: result.destination_version,
      kind: "collection-reordered",
      sourceVersion: result.source_version,
    }
  }

  private async rebalanceCollections(
    command: Extract<LibraryCommand, { kind: "rebalance-collections" }>
  ): Promise<LibraryMutationResult> {
    validateAlignedOrderInput(command.collectionIds, command.sortOrders)
    requireUniqueIds(command.collectionIds)
    const { data, error } = await this.client.rpc("rebalance_collections", {
      collection_ids: command.collectionIds.map(toNumericId),
      expected_version: command.expectedVersion,
      parent_id: toNullableNumericId(command.parentId),
      sort_orders: command.sortOrders,
    })
    if (error) throwPostgrestError(error)
    return {
      kind: "scope-reordered",
      scope: "collections",
      version: requireRpcNumber(data),
    }
  }

  private async createTag(
    command: Extract<LibraryCommand, { kind: "create-tag" }>
  ): Promise<LibraryMutationResult> {
    const userId = await this.getOwnerId()
    const { data, error } = await this.client
      .from("tags")
      .insert({
        color: command.draft.color,
        name: validateLibraryName(command.draft.name),
        sort_order: validateOrderKey(command.draft.sortOrder),
        user_id: userId,
      })
      .select("*")
      .single()
    if (error) throwPostgrestError(error)
    if (!data) {
      throw new LibraryError(
        "unexpected",
        "The library returned invalid data.",
        true
      )
    }
    return { kind: "tag", tag: mapSupabaseTag(data) }
  }

  private async editTag(
    command: Extract<LibraryCommand, { kind: "edit-tag" }>
  ): Promise<LibraryMutationResult> {
    const tagId = toNumericId(command.tagId)
    const { data, error } = await this.client
      .from("tags")
      .update({
        color: command.patch.color,
        name: validateLibraryName(command.patch.name),
      })
      .eq("id", tagId)
      .eq("row_version", command.expectedRowVersion)
      .select("*")
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) return this.throwTagConflictOrMissing(tagId)
    return { kind: "tag", tag: mapSupabaseTag(data) }
  }

  private async deleteTag(
    tagId: Extract<LibraryCommand, { kind: "delete-tag" }>["tagId"]
  ): Promise<LibraryMutationResult> {
    const { data, error } = await this.client.rpc("delete_tag", {
      tag_id: toNumericId(tagId),
    })
    if (error) throwPostgrestError(error)
    return {
      affectedCount: requireRpcNumber(data),
      kind: "tag-deleted",
      targetIds: [tagId],
    }
  }

  private async reorderTag(
    command: Extract<LibraryCommand, { kind: "reorder-tag" }>
  ): Promise<LibraryMutationResult> {
    const { data, error } = await this.client.rpc("reorder_tag", {
      expected_version: command.expectedVersion,
      sort_order: validateOrderKey(command.sortOrder),
      tag_id: toNumericId(command.tagId),
    })
    if (error) throwPostgrestError(error)
    return {
      kind: "scope-reordered",
      scope: "tags",
      version: requireRpcNumber(data),
    }
  }

  private async rebalanceTags(
    command: Extract<LibraryCommand, { kind: "rebalance-tags" }>
  ): Promise<LibraryMutationResult> {
    validateAlignedOrderInput(command.tagIds, command.sortOrders)
    requireUniqueIds(command.tagIds)
    const { data, error } = await this.client.rpc("rebalance_tags", {
      expected_version: command.expectedVersion,
      sort_orders: command.sortOrders,
      tag_ids: command.tagIds.map(toNumericId),
    })
    if (error) throwPostgrestError(error)
    return {
      kind: "scope-reordered",
      scope: "tags",
      version: requireRpcNumber(data),
    }
  }

  private async editBookmark(
    command: Extract<LibraryCommand, { kind: "edit-bookmark" }>
  ): Promise<LibraryMutationResult> {
    const bookmarkId = toNumericId(command.bookmarkId)
    const { data, error } = await this.client
      .from("bookmarks")
      .update({
        title: validateBookmarkTitle(command.patch.title),
        url: normalizeBookmarkUrl(command.patch.url),
      })
      .eq("id", bookmarkId)
      .eq("row_version", command.expectedRowVersion)
      .select("*,bookmark_stats(visit_count)")
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) return this.throwBookmarkConflictOrMissing(bookmarkId)
    const row = data as unknown as BookmarkWithStats
    return {
      bookmark: mapSupabaseBookmark(
        row,
        row.bookmark_stats?.[0]?.visit_count ?? 0
      ),
      kind: "bookmark",
    }
  }

  private async replaceBookmarkTags(
    command: Extract<LibraryCommand, { kind: "replace-bookmark-tags" }>
  ): Promise<LibraryMutationResult> {
    if (new Set(command.tagIds).size !== command.tagIds.length) {
      throw invalidLibraryInput("Tag IDs must be unique.")
    }
    const { data, error } = await this.client.rpc("replace_bookmark_tags", {
      bookmark_id: toNumericId(command.bookmarkId),
      tag_ids: command.tagIds.map(toNumericId),
    })
    if (error) throwPostgrestError(error)
    return {
      affectedCount: requireRpcNumber(data),
      bookmarkId: command.bookmarkId,
      kind: "bookmark-tags-replaced",
      requiresRefetch: true,
      tagIds: [...command.tagIds],
    }
  }

  private async applyCollectionMemberships(
    command: Extract<
      LibraryCommand,
      {
        kind: "add-bookmarks-to-collection" | "move-bookmarks-to-collection"
      }
    >
  ): Promise<LibraryMutationResult> {
    validateAlignedOrderInput(command.bookmarkIds, command.sortOrders)
    requireUniqueIds(command.bookmarkIds)
    const functionName =
      command.kind === "add-bookmarks-to-collection"
        ? "add_bookmarks_to_collection"
        : "move_bookmarks_to_collection"
    const args = {
      bookmark_ids: command.bookmarkIds.map(toNumericId),
      collection_id: toNumericId(command.collectionId),
      sort_orders: command.sortOrders,
    }
    const result =
      functionName === "add_bookmarks_to_collection"
        ? await this.client.rpc("add_bookmarks_to_collection", args)
        : await this.client.rpc("move_bookmarks_to_collection", args)
    if (result.error) throwPostgrestError(result.error)
    return this.bulkResult(command.bookmarkIds, requireRpcNumber(result.data))
  }

  private async removeCollectionMemberships(
    command: Extract<
      LibraryCommand,
      { kind: "remove-bookmarks-from-collection" }
    >
  ): Promise<LibraryMutationResult> {
    requireUniqueIds(command.bookmarkIds)
    const { data, error } = await this.client.rpc(
      "remove_bookmarks_from_collection",
      {
        bookmark_ids: command.bookmarkIds.map(toNumericId),
        collection_id: toNumericId(command.collectionId),
      }
    )
    if (error) throwPostgrestError(error)
    return this.bulkResult(command.bookmarkIds, requireRpcNumber(data))
  }

  private async applyTrashMutation(
    command: Extract<
      LibraryCommand,
      {
        kind:
          | "trash-bookmarks"
          | "restore-bookmarks"
          | "delete-bookmarks-forever"
      }
    >
  ): Promise<LibraryMutationResult> {
    requireUniqueIds(command.bookmarkIds)
    const args = { bookmark_ids: command.bookmarkIds.map(toNumericId) }
    const result =
      command.kind === "trash-bookmarks"
        ? await this.client.rpc("trash_bookmarks", args)
        : command.kind === "restore-bookmarks"
          ? await this.client.rpc("restore_bookmarks", args)
          : await this.client.rpc("delete_bookmarks_forever", args)
    if (result.error) throwPostgrestError(result.error)
    return this.bulkResult(command.bookmarkIds, requireRpcNumber(result.data))
  }

  private async reorderBookmark(
    command: Extract<LibraryCommand, { kind: "reorder-bookmark" }>
  ): Promise<LibraryMutationResult> {
    const { data, error } = await this.client.rpc("reorder_bookmark", {
      bookmark_id: toNumericId(command.bookmarkId),
      collection_id: toNumericId(command.collectionId),
      expected_version: command.expectedVersion,
      next_bookmark_id: this.nullableBookmarkId(command.nextBookmarkId),
      previous_bookmark_id: this.nullableBookmarkId(command.previousBookmarkId),
      sort_order: validateOrderKey(command.sortOrder),
    })
    if (error) throwPostgrestError(error)
    return {
      kind: "scope-reordered",
      scope: "bookmarks",
      version: requireRpcNumber(data),
    }
  }

  private async rebalanceBookmarks(
    command: Extract<LibraryCommand, { kind: "rebalance-bookmarks" }>
  ): Promise<LibraryMutationResult> {
    validateAlignedOrderInput(command.bookmarkIds, command.sortOrders)
    requireUniqueIds(command.bookmarkIds)
    const { data, error } = await this.client.rpc("rebalance_bookmarks", {
      bookmark_ids: command.bookmarkIds.map(toNumericId),
      collection_id: toNumericId(command.collectionId),
      expected_version: command.expectedVersion,
      sort_orders: command.sortOrders,
    })
    if (error) throwPostgrestError(error)
    return {
      kind: "scope-reordered",
      scope: "bookmarks",
      version: requireRpcNumber(data),
    }
  }

  private async updatePreferences(
    command: Extract<LibraryCommand, { kind: "update-preferences" }>
  ): Promise<LibraryMutationResult> {
    const patch = command.patch
    const { data, error } = await this.client
      .from("dashboard_preferences")
      .update({
        bookmark_sort: patch.bookmarkSort,
        collection_order_mode: patch.collectionOrder,
        desktop_collections_open: patch.desktopCollectionsOpen,
        desktop_tags_open: patch.desktopTagsOpen,
        mobile_collections_open: patch.mobileCollectionsOpen,
        mobile_tags_open: patch.mobileTagsOpen,
        tag_order_mode: patch.tagOrder,
        theme: patch.theme,
        view_mode: patch.viewMode,
      })
      .eq("row_version", command.expectedRowVersion)
      .select("*")
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) {
      const { data: current, error: currentError } = await this.client
        .from("dashboard_preferences")
        .select("user_id")
        .maybeSingle()
      if (currentError) throwPostgrestError(currentError)
      if (!current) {
        throw new LibraryError(
          "not_found",
          "Library preferences were not found.",
          true
        )
      }
      throw new LibraryError("conflict", "The preferences changed.", true)
    }
    return { kind: "preferences", preferences: mapSupabasePreferences(data) }
  }

  private async recordVisits(
    command: Extract<LibraryCommand, { kind: "record-visits" }>
  ): Promise<LibraryMutationResult> {
    if (command.events.length === 0) {
      throw invalidLibraryInput("Visit events cannot be empty.")
    }
    const eventIds = command.events.map(({ eventId }) => eventId)
    if (new Set(eventIds).size !== eventIds.length) {
      throw invalidLibraryInput(
        "Visit event IDs must be unique within a batch."
      )
    }
    const { data, error } = await this.client.rpc("record_bookmark_visits", {
      bookmark_ids: command.events.map(({ bookmarkId }) =>
        toNumericId(bookmarkId)
      ),
      event_ids: eventIds,
    })
    if (error) throwPostgrestError(error)
    return {
      insertedCount: requireRpcNumber(data),
      kind: "visits-recorded",
    }
  }

  private bulkResult(
    bookmarkIds: BookmarkId[],
    affectedCount: number
  ): LibraryMutationResult {
    return {
      affectedCount,
      kind: "bulk",
      requiresRefetch: true,
      targetIds: [...bookmarkIds],
    }
  }

  private nullableBookmarkId(bookmarkId: BookmarkId | null): number {
    return bookmarkId === null
      ? (null as unknown as number)
      : toNumericId(bookmarkId)
  }

  private async readDirectBookmarkCount(collectionId: number): Promise<number> {
    const { count, error } = await this.client
      .from("bookmark_collections")
      .select("bookmark_id,bookmarks!inner(id)", { count: "exact", head: true })
      .eq("collection_id", collectionId)
      .is("bookmarks.trashed_at", null)
    if (error) throwPostgrestError(error)
    return count ?? 0
  }

  private async throwCollectionConflictOrMissing(id: number): Promise<never> {
    const { data, error } = await this.client
      .from("collections")
      .select("id")
      .eq("id", id)
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data)
      throw new LibraryError("not_found", "Collection not found.", false)
    throw new LibraryError("conflict", "The collection changed.", true)
  }

  private async throwTagConflictOrMissing(id: number): Promise<never> {
    const { data, error } = await this.client
      .from("tags")
      .select("id")
      .eq("id", id)
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) throw new LibraryError("not_found", "Tag not found.", false)
    throw new LibraryError("conflict", "The tag changed.", true)
  }

  private async throwBookmarkConflictOrMissing(id: number): Promise<never> {
    const { data, error } = await this.client
      .from("bookmarks")
      .select("id")
      .eq("id", id)
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) throw new LibraryError("not_found", "Bookmark not found.", false)
    throw new LibraryError("conflict", "The bookmark changed.", true)
  }
}
