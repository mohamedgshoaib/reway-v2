import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import type {
  LibraryCommand,
  LibraryMutationResult,
  LibraryReadResult,
} from "@/lib/library/library-adapter"
import { LibraryError } from "@/lib/library/library-error"
import type { Bookmark, BookmarkId } from "@/lib/library/library-types"
import {
  normalizeQuickSaveUrl,
  toNumericId,
  validateClientRequestId,
  validateQuickSaveCreatedAt,
} from "@/lib/library/library-validation"
import { throwPostgrestError } from "@/lib/library/supabase-library-error"
import { mapSupabaseBookmark } from "@/lib/library/supabase-library-mappers"
import type { Database } from "@/types/database.generated"

type SupabaseLibraryClient = SupabaseClient<Database>
type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]
type BookmarkWithStats = BookmarkRow & {
  bookmark_stats?: { visit_count: number }[] | null
}

const BOOKMARK_WITH_STATS_SELECT =
  "id,user_id,client_request_id,url,url_fingerprint,title,normalized_title,domain,favicon_url,og_image_url,metadata_status,metadata_generation,collection_count,trashed_at,purge_after,created_at,updated_at,row_version,bookmark_stats(visit_count)"
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const unexpectedDatabaseResult = (): never => {
  throw new LibraryError(
    "unexpected",
    "The library returned invalid data.",
    true
  )
}

const mapBookmarkWithStats = (row: BookmarkWithStats): Bookmark =>
  mapSupabaseBookmark(row, row.bookmark_stats?.[0]?.visit_count ?? 0)

const requireBookmarkRow = (
  value: BookmarkWithStats | null
): BookmarkWithStats => {
  if (value === null) {
    throw new LibraryError(
      "unexpected",
      "The library returned invalid data.",
      true
    )
  }
  return value
}

export class SupabaseLibraryCapture {
  private readonly client: SupabaseLibraryClient

  constructor(client: SupabaseLibraryClient) {
    this.client = client
  }

  async readByClientRequestId(
    clientRequestId: string
  ): Promise<
    Extract<LibraryReadResult, { kind: "bookmark-by-client-request-id" }>
  > {
    const requestId = validateClientRequestId(clientRequestId)
    const { data, error } = await this.client
      .from("bookmarks")
      .select(BOOKMARK_WITH_STATS_SELECT)
      .eq("client_request_id", requestId)
      .maybeSingle()
    if (error) throwPostgrestError(error)
    return {
      bookmark:
        data === null
          ? null
          : mapBookmarkWithStats(data as unknown as BookmarkWithStats),
      kind: "bookmark-by-client-request-id",
    }
  }

  async quickSave(
    command: Extract<LibraryCommand, { kind: "quick-save-bookmark" }>
  ): Promise<LibraryMutationResult> {
    const clientRequestId = validateClientRequestId(command.clientRequestId)
    const normalizedUrl = normalizeQuickSaveUrl(command.url).value
    const createdAt = validateQuickSaveCreatedAt(command.createdAt)
    const { data, error } = await this.client
      .rpc("create_bookmark", {
        client_request_id: clientRequestId,
        created_at: new Date(createdAt).toISOString(),
        queue_name: "interactive",
        title: normalizedUrl.hostname,
        url: normalizedUrl.href,
      })
      .select(BOOKMARK_WITH_STATS_SELECT)
      .single()
    if (error) throwPostgrestError(error as PostgrestError)
    const row = requireBookmarkRow(data as unknown as BookmarkWithStats | null)
    if (row.client_request_id !== clientRequestId) unexpectedDatabaseResult()
    return {
      bookmark: mapBookmarkWithStats(row),
      kind: "bookmark",
    }
  }

  async requestReenrichment(
    command: Extract<LibraryCommand, { kind: "request-bookmark-reenrichment" }>
  ): Promise<LibraryMutationResult> {
    const idempotencyKey = validateClientRequestId(command.idempotencyKey)
    const { data, error } = await this.client.rpc(
      "request_bookmark_reenrichment",
      {
        bookmark_id: toNumericId(command.bookmarkId),
        idempotency_key: idempotencyKey,
      }
    )
    if (error) throwPostgrestError(error)
    if (typeof data !== "string" || !UUID_PATTERN.test(data)) {
      unexpectedDatabaseResult()
    }
    return {
      bookmark: await this.readById(command.bookmarkId),
      kind: "bookmark",
    }
  }

  private async readById(bookmarkId: BookmarkId): Promise<Bookmark> {
    const { data, error } = await this.client
      .from("bookmarks")
      .select(BOOKMARK_WITH_STATS_SELECT)
      .eq("id", toNumericId(bookmarkId))
      .maybeSingle()
    if (error) throwPostgrestError(error)
    if (!data) {
      throw new LibraryError("not_found", "Bookmark not found.", false)
    }
    return mapBookmarkWithStats(data as unknown as BookmarkWithStats)
  }
}
