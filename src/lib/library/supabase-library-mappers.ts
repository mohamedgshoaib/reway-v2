import { LibraryError } from "@/lib/library/library-error"
import type {
  AppearanceColor,
  Bookmark,
  BookmarkMetadataStatus,
  Collection,
  CollectionIcon,
  DashboardPreferences,
  LibrarySearchResults,
  Tag,
} from "@/lib/library/library-types"
import {
  toBookmarkId,
  toCollectionId,
  toEpochMilliseconds,
  toTagId,
} from "@/lib/library/library-types"
import type { Database } from "@/types/database.generated"

type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]
type CollectionRow = Database["public"]["Tables"]["collections"]["Row"]
type DashboardPreferencesRow =
  Database["public"]["Tables"]["dashboard_preferences"]["Row"]
type TagRow = Database["public"]["Tables"]["tags"]["Row"]
type GeneratedSearchRow =
  Database["public"]["Functions"]["search_library"]["Returns"][number]
export type SupabaseSearchRow = Omit<
  GeneratedSearchRow,
  | "color"
  | "domain"
  | "favicon_url"
  | "icon"
  | "name"
  | "parent_id"
  | "path"
  | "title"
  | "url"
> & {
  color: string | null
  domain: string | null
  favicon_url: string | null
  icon: string | null
  name: string | null
  parent_id: number | null
  path: string | null
  title: string | null
  url: string | null
}

const appearanceColors = new Set<string>([
  "neutral",
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "rose",
])

const collectionIcons = new Set<string>([
  "airplane",
  "archive",
  "barbell",
  "book",
  "bookmark",
  "briefcase",
  "buildings",
  "calendar",
  "camera",
  "clipboard",
  "code",
  "cooking",
  "folder",
  "heart",
  "home",
  "location",
  "notebook",
  "paintbrush",
  "research",
  "shopping",
  "stack",
  "star",
  "user",
  "x",
])

const metadataStatuses = new Set<string>(["pending", "enriched", "failed"])

const unexpectedDatabaseValue = (): never => {
  throw new LibraryError(
    "unexpected",
    "The library returned invalid data.",
    true
  )
}

const mapTimestamp = (
  value: string
): ReturnType<typeof toEpochMilliseconds> => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? toEpochMilliseconds(timestamp)
    : unexpectedDatabaseValue()
}

const mapNullableTimestamp = (
  value: string | null
): ReturnType<typeof toEpochMilliseconds> | null =>
  value === null ? null : mapTimestamp(value)

const mapAppearanceColor = (value: string): AppearanceColor =>
  appearanceColors.has(value)
    ? (value as AppearanceColor)
    : unexpectedDatabaseValue()

const mapCollectionIcon = (value: string): CollectionIcon =>
  collectionIcons.has(value)
    ? (value as CollectionIcon)
    : unexpectedDatabaseValue()

const mapMetadataStatus = (value: string): BookmarkMetadataStatus =>
  metadataStatuses.has(value)
    ? (value as BookmarkMetadataStatus)
    : unexpectedDatabaseValue()

const assertSafeDatabaseId = (value: number): string => {
  if (!Number.isSafeInteger(value) || value < 1) unexpectedDatabaseValue()
  return String(value)
}

const assertNonNegativeInteger = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) unexpectedDatabaseValue()
  return value
}

const requireSearchString = (value: string | null): string =>
  value === null ? unexpectedDatabaseValue() : value

export const mapSupabaseBookmark = (
  row: BookmarkRow,
  visitCount = 0
): Bookmark => ({
  collectionCount: assertNonNegativeInteger(row.collection_count),
  createdAt: mapTimestamp(row.created_at),
  domain: row.domain,
  faviconUrl: row.favicon_url,
  id: toBookmarkId(assertSafeDatabaseId(row.id)),
  metadataStatus: mapMetadataStatus(row.metadata_status),
  ogImageUrl: row.og_image_url,
  purgeAfter: mapNullableTimestamp(row.purge_after),
  rowVersion: assertNonNegativeInteger(row.row_version),
  title: row.title,
  trashedAt: mapNullableTimestamp(row.trashed_at),
  updatedAt: mapTimestamp(row.updated_at),
  url: row.url,
  visitCount: assertNonNegativeInteger(visitCount),
})

export const mapSupabaseCollection = (
  row: CollectionRow,
  directBookmarkCount = 0
): Collection => ({
  bookmarkOrderVersion: assertNonNegativeInteger(row.bookmark_order_version),
  childOrderVersion: assertNonNegativeInteger(row.child_order_version),
  color: mapAppearanceColor(row.color),
  createdAt: mapTimestamp(row.created_at),
  directBookmarkCount: assertNonNegativeInteger(directBookmarkCount),
  icon: mapCollectionIcon(row.icon),
  id: toCollectionId(assertSafeDatabaseId(row.id)),
  name: row.name,
  parentId:
    row.parent_id === null
      ? null
      : toCollectionId(assertSafeDatabaseId(row.parent_id)),
  rowVersion: assertNonNegativeInteger(row.row_version),
  sortOrder: row.sort_order,
  updatedAt: mapTimestamp(row.updated_at),
})

export const mapSupabaseTag = (row: TagRow): Tag => ({
  color: mapAppearanceColor(row.color),
  createdAt: mapTimestamp(row.created_at),
  id: toTagId(assertSafeDatabaseId(row.id)),
  name: row.name,
  rowVersion: assertNonNegativeInteger(row.row_version),
  sortOrder: row.sort_order,
  updatedAt: mapTimestamp(row.updated_at),
})

export const mapSupabasePreferences = (
  row: DashboardPreferencesRow
): DashboardPreferences => {
  if (
    !["date", "visits", "alpha"].includes(row.bookmark_sort) ||
    !["newest", "alpha", "custom"].includes(row.collection_order_mode) ||
    !["newest", "alpha", "custom"].includes(row.tag_order_mode) ||
    !["system", "light", "dark"].includes(row.theme) ||
    !["list", "grid", "grid-image"].includes(row.view_mode)
  ) {
    unexpectedDatabaseValue()
  }

  return {
    bookmarkSort: row.bookmark_sort as DashboardPreferences["bookmarkSort"],
    collectionOrder:
      row.collection_order_mode as DashboardPreferences["collectionOrder"],
    desktopCollectionsOpen: row.desktop_collections_open,
    desktopTagsOpen: row.desktop_tags_open,
    mobileCollectionsOpen: row.mobile_collections_open,
    mobileTagsOpen: row.mobile_tags_open,
    rootCollectionOrderVersion: assertNonNegativeInteger(
      row.root_collection_order_version
    ),
    rowVersion: assertNonNegativeInteger(row.row_version),
    tagOrder: row.tag_order_mode as DashboardPreferences["tagOrder"],
    tagOrderVersion: assertNonNegativeInteger(row.tag_order_version),
    theme: row.theme as DashboardPreferences["theme"],
    updatedAt: mapTimestamp(row.updated_at),
    viewMode: row.view_mode as DashboardPreferences["viewMode"],
  }
}

export const mapSupabaseSearchResults = (
  rows: readonly SupabaseSearchRow[]
): LibrarySearchResults => {
  const results: LibrarySearchResults = { bookmarks: [], collections: [] }

  for (const row of rows) {
    const id = assertSafeDatabaseId(row.id)
    if (row.result_kind === "bookmark") {
      const title = requireSearchString(row.title)
      const url = requireSearchString(row.url)
      results.bookmarks.push({
        domain: row.domain,
        faviconUrl: row.favicon_url,
        id: toBookmarkId(id),
        title,
        url,
      })
    } else if (row.result_kind === "collection") {
      const color = requireSearchString(row.color)
      const icon = requireSearchString(row.icon)
      const name = requireSearchString(row.name)
      const path = requireSearchString(row.path)
      results.collections.push({
        color: mapAppearanceColor(color),
        icon: mapCollectionIcon(icon),
        id: toCollectionId(id),
        name,
        parentId:
          row.parent_id === null
            ? null
            : toCollectionId(assertSafeDatabaseId(row.parent_id)),
        path,
      })
    } else {
      unexpectedDatabaseValue()
    }
  }

  return results
}
