import { PostgrestError } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import {
  toBookmarkId,
  toEpochMilliseconds,
  toTagId,
} from "@/lib/library/library-types"
import {
  createSupabaseLibraryAdapter,
  type SupabaseLibraryClient,
} from "@/lib/library/supabase-library-adapter"
import { mapPostgrestError } from "@/lib/library/supabase-library-error"
import { mapSupabaseSearchResults } from "@/lib/library/supabase-library-mappers"

type RpcMock = (
  name: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: PostgrestError | null }>

const createClient = (
  rpc: unknown,
  from: unknown = vi.fn<() => never>()
): SupabaseLibraryClient =>
  ({
    auth: { getClaims: vi.fn<() => Promise<never>>() },
    from,
    rpc,
  }) as unknown as SupabaseLibraryClient

const createPostgrestError = (code: string): PostgrestError =>
  new PostgrestError({ code, details: "private", hint: "", message: "raw" })

const clientRequestId = "11111111-1111-4111-8111-111111111111"
const reenrichmentKey = "22222222-2222-4222-8222-222222222222"
const requestId = "33333333-3333-4333-8333-333333333333"
const bookmarkRow = {
  bookmark_stats: [{ visit_count: 4 }],
  client_request_id: clientRequestId,
  collection_count: 0,
  created_at: "2026-09-08T00:00:00.000Z",
  domain: "example.org",
  favicon_url: null,
  id: 9,
  metadata_generation: 2,
  metadata_status: "pending",
  normalized_title: "example.org",
  og_image_url: null,
  purge_after: null,
  row_version: 2,
  title: "example.org",
  trashed_at: null,
  updated_at: "2026-09-08T00:00:01.000Z",
  url: "https://example.org/",
  url_fingerprint: null,
  user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
}

describe("Supabase library mapping", () => {
  it("maps grouped search rows without exposing nullable generated fields", () => {
    expect(
      mapSupabaseSearchResults([
        {
          color: null,
          domain: "linear.app",
          favicon_url: null,
          icon: null,
          id: 7,
          name: null,
          parent_id: null,
          path: null,
          result_kind: "bookmark",
          result_order: 1,
          title: "Linear research",
          url: "https://linear.app/research",
        },
        {
          color: "teal",
          domain: null,
          favicon_url: null,
          icon: "research",
          id: 8,
          name: "Reading",
          parent_id: 4,
          path: "Research / Reading",
          result_kind: "collection",
          result_order: 1,
          title: null,
          url: null,
        },
      ])
    ).toEqual({
      bookmarks: [
        {
          domain: "linear.app",
          faviconUrl: null,
          id: "7",
          title: "Linear research",
          url: "https://linear.app/research",
        },
      ],
      collections: [
        {
          color: "teal",
          icon: "research",
          id: "8",
          name: "Reading",
          parentId: "4",
          path: "Research / Reading",
        },
      ],
    })
  })

  it("rejects invalid database states at the adapter edge", () => {
    expect(() =>
      mapSupabaseSearchResults([
        {
          color: null,
          domain: null,
          favicon_url: null,
          icon: null,
          id: 1,
          name: null,
          parent_id: null,
          path: null,
          result_kind: "bookmark",
          result_order: 1,
          title: null,
          url: null,
        },
      ])
    ).toThrowError(
      expect.objectContaining({ code: "unexpected", retrySafe: true })
    )
  })
})

describe("Supabase library adapter RPC paths", () => {
  it("quick-saves through the atomic RPC and returns its authoritative row", async () => {
    const single = vi
      .fn<() => Promise<{ data: typeof bookmarkRow; error: null }>>()
      .mockResolvedValue({ data: bookmarkRow, error: null })
    const select = vi.fn<(columns: string) => { single: typeof single }>(
      () => ({
        single,
      })
    )
    const rpc = vi.fn<() => { select: typeof select }>(() => ({ select }))
    const adapter = createSupabaseLibraryAdapter(createClient(rpc))

    await expect(
      adapter.mutate({
        clientRequestId,
        createdAt: toEpochMilliseconds(Date.parse("2026-09-08T00:00:00.000Z")),
        kind: "quick-save-bookmark",
        url: "example.org",
      })
    ).resolves.toMatchObject({
      bookmark: {
        id: "9",
        metadataStatus: "pending",
        rowVersion: 2,
        visitCount: 4,
      },
      kind: "bookmark",
    })
    expect(rpc).toHaveBeenCalledWith("create_bookmark", {
      client_request_id: clientRequestId,
      created_at: "2026-09-08T00:00:00.000Z",
      queue_name: "interactive",
      title: "example.org",
      url: "https://example.org/",
    })
    expect(select).toHaveBeenCalledOnce()
  })

  it("rejects a quick-save result for another client request", async () => {
    const mismatchedRow = {
      ...bookmarkRow,
      client_request_id: reenrichmentKey,
    }
    const single = vi
      .fn<() => Promise<{ data: typeof mismatchedRow; error: null }>>()
      .mockResolvedValue({ data: mismatchedRow, error: null })
    const select = vi.fn<(columns: string) => { single: typeof single }>(
      () => ({ single })
    )
    const rpc = vi.fn<() => { select: typeof select }>(() => ({ select }))
    const adapter = createSupabaseLibraryAdapter(createClient(rpc))

    await expect(
      adapter.mutate({
        clientRequestId,
        createdAt: toEpochMilliseconds(5_000),
        kind: "quick-save-bookmark",
        url: "example.org",
      })
    ).rejects.toMatchObject({ code: "unexpected", retrySafe: true })
  })

  it("reconciles a client request without treating absence as an error", async () => {
    const maybeSingle = vi
      .fn<() => Promise<{ data: typeof bookmarkRow | null; error: null }>>()
      .mockResolvedValueOnce({ data: bookmarkRow, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    const eq = vi.fn<
      (column: string, value: unknown) => { maybeSingle: typeof maybeSingle }
    >(() => ({ maybeSingle }))
    const select = vi.fn<(columns: string) => { eq: typeof eq }>(() => ({ eq }))
    const from = vi.fn<(table: string) => { select: typeof select }>(() => ({
      select,
    }))
    const adapter = createSupabaseLibraryAdapter(
      createClient(vi.fn<RpcMock>(), from)
    )

    await expect(
      adapter.read({
        clientRequestId,
        kind: "bookmark-by-client-request-id",
      })
    ).resolves.toMatchObject({
      bookmark: { id: "9", visitCount: 4 },
      kind: "bookmark-by-client-request-id",
    })
    await expect(
      adapter.read({
        clientRequestId: reenrichmentKey,
        kind: "bookmark-by-client-request-id",
      })
    ).resolves.toEqual({
      bookmark: null,
      kind: "bookmark-by-client-request-id",
    })
    expect(eq).toHaveBeenNthCalledWith(1, "client_request_id", clientRequestId)
    expect(eq).toHaveBeenNthCalledWith(2, "client_request_id", reenrichmentKey)
  })

  it("requests Re-enrich idempotently and refetches the authoritative bookmark", async () => {
    const rpc = vi
      .fn<RpcMock>()
      .mockResolvedValue({ data: requestId, error: null })
    const maybeSingle = vi
      .fn<() => Promise<{ data: typeof bookmarkRow; error: null }>>()
      .mockResolvedValue({ data: bookmarkRow, error: null })
    const eq = vi.fn<
      (column: string, value: unknown) => { maybeSingle: typeof maybeSingle }
    >(() => ({ maybeSingle }))
    const select = vi.fn<(columns: string) => { eq: typeof eq }>(() => ({ eq }))
    const from = vi.fn<(table: string) => { select: typeof select }>(() => ({
      select,
    }))
    const adapter = createSupabaseLibraryAdapter(createClient(rpc, from))

    await expect(
      adapter.mutate({
        bookmarkId: toBookmarkId("9"),
        idempotencyKey: reenrichmentKey,
        kind: "request-bookmark-reenrichment",
      })
    ).resolves.toMatchObject({
      bookmark: { id: "9", metadataStatus: "pending", visitCount: 4 },
      kind: "bookmark",
    })
    expect(rpc).toHaveBeenCalledWith("request_bookmark_reenrichment", {
      bookmark_id: 9,
      idempotency_key: reenrichmentKey,
    })
    expect(eq).toHaveBeenCalledWith("id", 9)
  })

  it("rejects an invalid Re-enrich receipt before refetching", async () => {
    const from = vi.fn<() => never>()
    const rpc = vi
      .fn<RpcMock>()
      .mockResolvedValue({ data: "invalid", error: null })
    const adapter = createSupabaseLibraryAdapter(createClient(rpc, from))

    await expect(
      adapter.mutate({
        bookmarkId: toBookmarkId("9"),
        idempotencyKey: reenrichmentKey,
        kind: "request-bookmark-reenrichment",
      })
    ).rejects.toMatchObject({ code: "unexpected", retrySafe: true })
    expect(from).not.toHaveBeenCalled()
  })

  it("maps search into the same grouped domain result", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: [
        {
          color: null,
          domain: "linear.app",
          favicon_url: null,
          icon: null,
          id: 1,
          name: null,
          parent_id: null,
          path: null,
          result_kind: "bookmark",
          result_order: 1,
          title: "Linear research",
          url: "https://linear.app/research",
        },
      ],
      error: null,
    })
    const adapter = createSupabaseLibraryAdapter(createClient(rpc))

    await expect(
      adapter.read({ kind: "search", query: " research " })
    ).resolves.toEqual({
      kind: "search",
      results: {
        bookmarks: [
          {
            domain: "linear.app",
            faviconUrl: null,
            id: "1",
            title: "Linear research",
            url: "https://linear.app/research",
          },
        ],
        collections: [],
      },
    })
    expect(rpc).toHaveBeenCalledWith("search_library", {
      bookmark_limit: 32,
      collection_limit: 16,
      query_text: "research",
    })
  })

  it("uses the atomic tag replacement function and returns bounded cleanup data", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({ data: 2, error: null })
    const adapter = createSupabaseLibraryAdapter(createClient(rpc))
    const bookmarkId = toBookmarkId("3")
    const tagIds = [toTagId("4"), toTagId("5")]

    await expect(
      adapter.mutate({ bookmarkId, kind: "replace-bookmark-tags", tagIds })
    ).resolves.toEqual({
      affectedCount: 2,
      bookmarkId,
      kind: "bookmark-tags-replaced",
      requiresRefetch: true,
      tagIds,
    })
    expect(rpc).toHaveBeenCalledWith("replace_bookmark_tags", {
      bookmark_id: 3,
      tag_ids: [4, 5],
    })
  })

  it("maps stale database writes without exposing raw errors", async () => {
    const rpc = vi.fn<RpcMock>().mockResolvedValue({
      data: null,
      error: createPostgrestError("40001"),
    })
    const adapter = createSupabaseLibraryAdapter(createClient(rpc))

    await expect(
      adapter.mutate({
        expectedVersion: 1,
        kind: "reorder-tag",
        sortOrder: "a0",
        tagId: toTagId("1"),
      })
    ).rejects.toMatchObject({
      code: "conflict",
      message: "The library changed. Refetch and retry.",
      retrySafe: true,
    })
  })
})

describe("Supabase error mapping", () => {
  it("maps authorization and validation failures to stable codes", () => {
    expect(mapPostgrestError(createPostgrestError("42501"))).toMatchObject({
      code: "forbidden",
      retrySafe: false,
    })
    expect(mapPostgrestError(createPostgrestError("22023"))).toMatchObject({
      code: "invalid_input",
      retrySafe: false,
    })
  })
})
