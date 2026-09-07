import { PostgrestError } from "@supabase/supabase-js"
import { describe, expect, it, type Mock, vi } from "vitest"

import { toBookmarkId, toTagId } from "@/lib/library/library-types"
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

const createClient = (rpc: Mock<RpcMock>): SupabaseLibraryClient =>
  ({
    auth: { getClaims: vi.fn<() => Promise<never>>() },
    from: vi.fn<() => never>(),
    rpc,
  }) as unknown as SupabaseLibraryClient

const createPostgrestError = (code: string): PostgrestError =>
  new PostgrestError({ code, details: "private", hint: "", message: "raw" })

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
