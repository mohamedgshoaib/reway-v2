import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getLibraryPageSize,
  getSearchLimits,
  type LibraryAdapter,
  type LibraryCommand,
  type LibraryMutationResult,
  type LibraryPage,
  type LibraryReadRequest,
  type LibraryReadResult,
} from "@/lib/library/library-adapter"
import {
  decodeLibraryCursor,
  encodeLibraryCursor,
  type LibraryCursorPayload,
} from "@/lib/library/library-cursor"
import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"
import type {
  Bookmark,
  BookmarkDetail,
  Collection,
  Tag,
} from "@/lib/library/library-types"
import {
  toBookmarkId,
  toCollectionId,
  toTagId,
} from "@/lib/library/library-types"
import { toNumericId } from "@/lib/library/library-validation"
import { throwPostgrestError } from "@/lib/library/supabase-library-error"
import {
  mapSupabaseBookmark,
  mapSupabaseCollection,
  mapSupabasePreferences,
  mapSupabaseSearchResults,
  mapSupabaseTag,
  type SupabaseSearchRow,
} from "@/lib/library/supabase-library-mappers"
import { SupabaseLibraryMutations } from "@/lib/library/supabase-library-mutations"
import type { Database } from "@/types/database.generated"

export type SupabaseLibraryClient = SupabaseClient<Database>

type CollectionRow = Database["public"]["Tables"]["collections"]["Row"]
type TagRow = Database["public"]["Tables"]["tags"]["Row"]
type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]
type BookmarkQueryRow = BookmarkRow & {
  bookmark_collections?: { sort_order: string }[] | null
  bookmark_stats?: { visit_count: number }[] | null
}

const COLLECTION_SELECT =
  "id,user_id,parent_id,name,normalized_name,icon,color,sort_order,child_order_version,bookmark_order_version,created_at,updated_at,row_version"
const TAG_SELECT =
  "id,user_id,name,normalized_name,color,sort_order,created_at,updated_at,row_version"
const BOOKMARK_SELECT =
  "id,user_id,client_request_id,url,url_fingerprint,title,normalized_title,domain,favicon_url,og_image_url,metadata_status,metadata_generation,collection_count,trashed_at,purge_after,created_at,updated_at,row_version"
const MAX_PARALLEL_COUNT_QUERIES = 8

const quotePostgrestValue = (value: string): string =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`

const requireCursorNumber = (
  payload: LibraryCursorPayload,
  index: number
): number => {
  const value = payload.values[index]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidLibraryInput("The pagination cursor is invalid.")
  }
  return value
}

const requireCursorString = (
  payload: LibraryCursorPayload,
  index: number
): string => {
  const value = payload.values[index]
  if (typeof value !== "string") {
    throw invalidLibraryInput("The pagination cursor is invalid.")
  }
  return value
}

const mapWithConcurrency = async <T, R>(
  values: readonly T[],
  concurrency: number,
  mapValue: (value: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = []
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const value = values[currentIndex]
      if (value !== undefined) results[currentIndex] = await mapValue(value)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  )
  return results
}

class SupabaseLibraryAdapter implements LibraryAdapter {
  private readonly client: SupabaseLibraryClient
  private readonly mutations: SupabaseLibraryMutations

  constructor(client: SupabaseLibraryClient) {
    this.client = client
    this.mutations = new SupabaseLibraryMutations(client)
  }

  async read(request: LibraryReadRequest): Promise<LibraryReadResult> {
    switch (request.kind) {
      case "preferences":
        return this.readPreferences()
      case "collections":
        return { kind: request.kind, page: await this.readCollections(request) }
      case "tags":
        return { kind: request.kind, page: await this.readTags(request) }
      case "bookmark-detail":
        return {
          detail: await this.readBookmarkDetail(request.bookmarkId),
          kind: request.kind,
        }
      case "bookmarks":
        return { kind: request.kind, page: await this.readBookmarks(request) }
      case "search":
        return this.search(request)
    }
  }

  mutate(command: LibraryCommand): Promise<LibraryMutationResult> {
    return this.mutations.mutate(command)
  }

  private async readPreferences(): Promise<
    Extract<LibraryReadResult, { kind: "preferences" }>
  > {
    const { data, error } = await this.client
      .from("dashboard_preferences")
      .select("*")
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) {
      throw new LibraryError(
        "not_found",
        "Library preferences were not found.",
        true
      )
    }
    return { kind: "preferences", preferences: mapSupabasePreferences(data) }
  }

  private async search(
    request: Extract<LibraryReadRequest, { kind: "search" }>
  ): Promise<Extract<LibraryReadResult, { kind: "search" }>> {
    const query = request.query.trim()
    if (query.length === 0 || query.length > 200) {
      throw invalidLibraryInput("Search text must contain 1 to 200 characters.")
    }
    const limits = getSearchLimits(
      request.bookmarkLimit,
      request.collectionLimit
    )
    const { data, error } = await this.client.rpc("search_library", {
      bookmark_limit: limits.bookmarkLimit,
      collection_limit: limits.collectionLimit,
      query_text: query,
    })
    if (error) throwPostgrestError(error)

    return {
      kind: "search",
      results: mapSupabaseSearchResults(
        (data ?? []) as unknown as SupabaseSearchRow[]
      ),
    }
  }

  private getBookmarkBinding(
    request: Extract<LibraryReadRequest, { kind: "bookmarks" }>
  ): string {
    const destination = request.destination
    const destinationBinding =
      destination.kind === "collection"
        ? `collection:${destination.collectionId}`
        : destination.kind === "tags"
          ? `tags:${[...destination.tagIds].sort().join(",")}`
          : destination.kind
    return `bookmarks:${destinationBinding}:${request.sort}`
  }

  private async readBookmarks(
    request: Extract<LibraryReadRequest, { kind: "bookmarks" }>
  ): Promise<LibraryPage<Bookmark>> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const binding = this.getBookmarkBinding(request)
    const destination = request.destination
    if (request.sort === "custom" && destination.kind !== "collection") {
      throw invalidLibraryInput(
        "Custom order requires a collection destination."
      )
    }
    if (destination.kind === "tags" && destination.tagIds.length === 0) {
      throw invalidLibraryInput("Choose at least one tag.")
    }

    const statsRelation =
      request.sort === "visits"
        ? "bookmark_stats!inner(visit_count)"
        : "bookmark_stats(visit_count)"
    const membershipRelation =
      destination.kind === "collection"
        ? ",bookmark_collections!inner(collection_id,sort_order)"
        : destination.kind === "tags"
          ? ",bookmark_tags!inner(tag_id)"
          : ""
    let query = this.client
      .from("bookmarks")
      .select(`${BOOKMARK_SELECT},${statsRelation}${membershipRelation}`)

    if (destination.kind === "trash") {
      query = query
        .not("trashed_at", "is", null)
        .gt("purge_after", new Date().toISOString())
    } else {
      query = query.is("trashed_at", null)
      if (destination.kind === "uncollected") {
        query = query.eq("collection_count", 0)
      } else if (destination.kind === "collection") {
        query = query.eq(
          "bookmark_collections.collection_id",
          toNumericId(destination.collectionId)
        )
      } else if (destination.kind === "tags") {
        query = query.in(
          "bookmark_tags.tag_id",
          destination.tagIds.map(toNumericId)
        )
      }
    }

    if (request.cursor) {
      const payload = decodeLibraryCursor(request.cursor, "bookmarks", binding)
      const cursorId = toNumericId(toBookmarkId(payload.id))
      if (request.sort === "date") {
        const timestamp = quotePostgrestValue(
          new Date(requireCursorNumber(payload, 0)).toISOString()
        )
        query = query.or(
          `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${cursorId})`
        )
      } else if (request.sort === "alpha") {
        const title = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `normalized_title.gt.${title},and(normalized_title.eq.${title},id.gt.${cursorId})`
        )
      } else if (request.sort === "visits") {
        const visitCount = requireCursorNumber(payload, 0)
        query = query.or(
          `visit_count.lt.${visitCount},and(visit_count.eq.${visitCount},bookmark_id.lt.${cursorId})`,
          { referencedTable: "bookmark_stats" }
        )
      } else {
        const sortOrder = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `sort_order.gt.${sortOrder},and(sort_order.eq.${sortOrder},bookmark_id.gt.${cursorId})`,
          { referencedTable: "bookmark_collections" }
        )
      }
    }

    if (request.sort === "date") {
      query = query.order("created_at", { ascending: false }).order("id", {
        ascending: false,
      })
    } else if (request.sort === "alpha") {
      query = query.order("normalized_title").order("id")
    } else if (request.sort === "visits") {
      query = query
        .order("visit_count", {
          ascending: false,
          referencedTable: "bookmark_stats",
        })
        .order("id", { ascending: false })
    } else {
      query = query
        .order("sort_order", { referencedTable: "bookmark_collections" })
        .order("id")
    }

    const { data, error } = await query.limit(pageSize + 1)
    if (error) throwPostgrestError(error)
    const rows = data as unknown as BookmarkQueryRow[]
    const pageRows = rows.slice(0, pageSize)
    const items = pageRows.map((row) =>
      mapSupabaseBookmark(row, this.getVisitCount(row))
    )
    const lastRow = pageRows.at(-1)

    return {
      items,
      nextCursor:
        rows.length > pageSize && lastRow
          ? encodeLibraryCursor({
              binding,
              id: String(lastRow.id),
              kind: "bookmarks",
              values: [this.getBookmarkCursorValue(lastRow, request.sort)],
              version: 1,
            })
          : null,
    }
  }

  private getVisitCount(row: BookmarkQueryRow): number {
    return row.bookmark_stats?.[0]?.visit_count ?? 0
  }

  private getBookmarkCursorValue(
    row: BookmarkQueryRow,
    sort: Extract<LibraryReadRequest, { kind: "bookmarks" }>["sort"]
  ): number | string {
    if (sort === "date") return Date.parse(row.created_at)
    if (sort === "alpha") {
      return row.normalized_title ?? row.title.toLocaleLowerCase()
    }
    if (sort === "visits") return this.getVisitCount(row)
    const sortOrder = row.bookmark_collections?.[0]?.sort_order
    if (!sortOrder) {
      throw new LibraryError(
        "unexpected",
        "The library returned invalid data.",
        true
      )
    }
    return sortOrder
  }

  private async readCollections(
    request: Extract<LibraryReadRequest, { kind: "collections" }>
  ): Promise<LibraryPage<Collection>> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const parentBinding = request.parentId ?? "root"
    const binding = `collections:${parentBinding}:${request.order}`
    let query = this.client.from("collections").select(COLLECTION_SELECT)
    query =
      request.parentId === null
        ? query.is("parent_id", null)
        : query.eq("parent_id", toNumericId(request.parentId))

    if (request.cursor) {
      const payload = decodeLibraryCursor(
        request.cursor,
        "collections",
        binding
      )
      const cursorId = toNumericId(toCollectionId(payload.id))
      if (request.order === "newest") {
        const timestamp = new Date(
          requireCursorNumber(payload, 0)
        ).toISOString()
        const quotedTimestamp = quotePostgrestValue(timestamp)
        query = query.or(
          `created_at.lt.${quotedTimestamp},and(created_at.eq.${quotedTimestamp},id.lt.${cursorId})`
        )
      } else if (request.order === "alpha") {
        const name = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `normalized_name.gt.${name},and(normalized_name.eq.${name},id.gt.${cursorId})`
        )
      } else {
        const sortOrder = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `sort_order.gt.${sortOrder},and(sort_order.eq.${sortOrder},id.gt.${cursorId})`
        )
      }
    }

    query =
      request.order === "newest"
        ? query.order("created_at", { ascending: false }).order("id", {
            ascending: false,
          })
        : request.order === "alpha"
          ? query.order("normalized_name").order("id")
          : query.order("sort_order").order("id")

    const { data, error } = await query.limit(pageSize + 1)
    if (error) throwPostgrestError(error)
    const rows = data as CollectionRow[]
    const pageRows = rows.slice(0, pageSize)
    const counts = await mapWithConcurrency(
      pageRows,
      MAX_PARALLEL_COUNT_QUERIES,
      (row) => this.readDirectBookmarkCount(row.id)
    )
    const items = pageRows.map((row, index) =>
      mapSupabaseCollection(row, counts[index] ?? 0)
    )
    const lastRow = pageRows.at(-1)

    return {
      items,
      nextCursor:
        rows.length > pageSize && lastRow
          ? encodeLibraryCursor({
              binding,
              id: String(lastRow.id),
              kind: "collections",
              values: [
                request.order === "newest"
                  ? Date.parse(lastRow.created_at)
                  : request.order === "alpha"
                    ? (lastRow.normalized_name ??
                      lastRow.name.toLocaleLowerCase())
                    : lastRow.sort_order,
              ],
              version: 1,
            })
          : null,
    }
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

  private async readTags(
    request: Extract<LibraryReadRequest, { kind: "tags" }>
  ): Promise<LibraryPage<Tag>> {
    const pageSize = getLibraryPageSize(request.pageSize)
    const binding = `tags:${request.order}`
    let query = this.client.from("tags").select(TAG_SELECT)

    if (request.cursor) {
      const payload = decodeLibraryCursor(request.cursor, "tags", binding)
      const cursorId = toNumericId(toTagId(payload.id))
      if (request.order === "newest") {
        const timestamp = new Date(
          requireCursorNumber(payload, 0)
        ).toISOString()
        const quotedTimestamp = quotePostgrestValue(timestamp)
        query = query.or(
          `created_at.lt.${quotedTimestamp},and(created_at.eq.${quotedTimestamp},id.lt.${cursorId})`
        )
      } else if (request.order === "alpha") {
        const name = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `normalized_name.gt.${name},and(normalized_name.eq.${name},id.gt.${cursorId})`
        )
      } else {
        const sortOrder = quotePostgrestValue(requireCursorString(payload, 0))
        query = query.or(
          `sort_order.gt.${sortOrder},and(sort_order.eq.${sortOrder},id.gt.${cursorId})`
        )
      }
    }

    query =
      request.order === "newest"
        ? query.order("created_at", { ascending: false }).order("id", {
            ascending: false,
          })
        : request.order === "alpha"
          ? query.order("normalized_name").order("id")
          : query.order("sort_order").order("id")

    const { data, error } = await query.limit(pageSize + 1)
    if (error) throwPostgrestError(error)
    const rows = data as TagRow[]
    const pageRows = rows.slice(0, pageSize)
    const lastRow = pageRows.at(-1)

    return {
      items: pageRows.map(mapSupabaseTag),
      nextCursor:
        rows.length > pageSize && lastRow
          ? encodeLibraryCursor({
              binding,
              id: String(lastRow.id),
              kind: "tags",
              values: [
                request.order === "newest"
                  ? Date.parse(lastRow.created_at)
                  : request.order === "alpha"
                    ? (lastRow.normalized_name ??
                      lastRow.name.toLocaleLowerCase())
                    : lastRow.sort_order,
              ],
              version: 1,
            })
          : null,
    }
  }

  private async readBookmarkDetail(
    bookmarkId: ReturnType<typeof toBookmarkId>
  ): Promise<BookmarkDetail> {
    const numericBookmarkId = toNumericId(bookmarkId)
    const [bookmarkResult, collectionResult, tagResult] = await Promise.all([
      this.client
        .from("bookmarks")
        .select("id")
        .eq("id", numericBookmarkId)
        .maybeSingle(),
      this.client
        .from("bookmark_collections")
        .select("collection_id,sort_order")
        .eq("bookmark_id", numericBookmarkId)
        .order("collection_id"),
      this.client
        .from("bookmark_tags")
        .select("tag_id")
        .eq("bookmark_id", numericBookmarkId)
        .order("tag_id"),
    ])
    if (bookmarkResult.error) throwPostgrestError(bookmarkResult.error)
    if (!bookmarkResult.data) {
      throw new LibraryError("not_found", "Bookmark not found.", false)
    }
    if (collectionResult.error) throwPostgrestError(collectionResult.error)
    if (tagResult.error) throwPostgrestError(tagResult.error)

    return {
      bookmarkId,
      collections: (collectionResult.data ?? []).map((membership) => ({
        collectionId: toCollectionId(String(membership.collection_id)),
        sortOrder: membership.sort_order,
      })),
      tagIds: (tagResult.data ?? []).map((membership) =>
        toTagId(String(membership.tag_id))
      ),
    }
  }
}

export const createSupabaseLibraryAdapter = (
  client: SupabaseLibraryClient
): LibraryAdapter => new SupabaseLibraryAdapter(client)
