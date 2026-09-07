declare const bookmarkIdBrand: unique symbol
declare const collectionIdBrand: unique symbol
declare const tagIdBrand: unique symbol
declare const epochMillisecondsBrand: unique symbol

export type BookmarkId = string & { readonly [bookmarkIdBrand]: "BookmarkId" }
export type CollectionId = string & {
  readonly [collectionIdBrand]: "CollectionId"
}
export type TagId = string & { readonly [tagIdBrand]: "TagId" }
export type EpochMilliseconds = number & {
  readonly [epochMillisecondsBrand]: "EpochMilliseconds"
}

export type AppearanceColor =
  | "neutral"
  | "red"
  | "orange"
  | "amber"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "rose"

export type CollectionIcon =
  | "airplane"
  | "archive"
  | "barbell"
  | "book"
  | "bookmark"
  | "briefcase"
  | "buildings"
  | "calendar"
  | "camera"
  | "clipboard"
  | "code"
  | "cooking"
  | "folder"
  | "heart"
  | "home"
  | "location"
  | "notebook"
  | "paintbrush"
  | "research"
  | "shopping"
  | "stack"
  | "star"
  | "user"
  | "x"

export type BookmarkMetadataStatus = "pending" | "enriched" | "failed"
export type BookmarkSort = "date" | "visits" | "alpha" | "custom"
export type CollectionOrder = "newest" | "alpha" | "custom"
export type TagOrder = "newest" | "alpha" | "custom"
export type ThemePreference = "system" | "light" | "dark"
export type ViewMode = "list" | "grid" | "grid-image"

export interface Bookmark {
  collectionCount: number
  createdAt: EpochMilliseconds
  domain: string | null
  faviconUrl: string | null
  id: BookmarkId
  metadataStatus: BookmarkMetadataStatus
  ogImageUrl: string | null
  purgeAfter: EpochMilliseconds | null
  rowVersion: number
  title: string
  trashedAt: EpochMilliseconds | null
  updatedAt: EpochMilliseconds
  url: string
  visitCount: number
}

export interface Collection {
  bookmarkOrderVersion: number
  childOrderVersion: number
  color: AppearanceColor
  createdAt: EpochMilliseconds
  directBookmarkCount: number
  icon: CollectionIcon
  id: CollectionId
  name: string
  parentId: CollectionId | null
  rowVersion: number
  sortOrder: string
  updatedAt: EpochMilliseconds
}

export interface Tag {
  color: AppearanceColor
  createdAt: EpochMilliseconds
  id: TagId
  name: string
  rowVersion: number
  sortOrder: string
  updatedAt: EpochMilliseconds
}

export interface DashboardPreferences {
  bookmarkSort: Exclude<BookmarkSort, "custom">
  collectionOrder: CollectionOrder
  desktopCollectionsOpen: boolean
  desktopTagsOpen: boolean
  mobileCollectionsOpen: boolean
  mobileTagsOpen: boolean
  rootCollectionOrderVersion: number
  rowVersion: number
  tagOrder: TagOrder
  tagOrderVersion: number
  theme: ThemePreference
  updatedAt: EpochMilliseconds
  viewMode: ViewMode
}

export interface BookmarkCollectionMembership {
  collectionId: CollectionId
  sortOrder: string
}

export interface BookmarkDetail {
  bookmarkId: BookmarkId
  collections: BookmarkCollectionMembership[]
  tagIds: TagId[]
}

export interface BookmarkSearchMatch {
  domain: string | null
  faviconUrl: string | null
  id: BookmarkId
  title: string
  url: string
}

export interface CollectionSearchMatch {
  color: AppearanceColor
  icon: CollectionIcon
  id: CollectionId
  name: string
  parentId: CollectionId | null
  path: string
}

export interface LibrarySearchResults {
  bookmarks: BookmarkSearchMatch[]
  collections: CollectionSearchMatch[]
}

const DATABASE_ID_PATTERN = /^[1-9]\d*$/

const toDatabaseId = <T extends string>(value: string, name: string): T => {
  if (!DATABASE_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a positive decimal string.`)
  }

  return value as T
}

export const toBookmarkId = (value: string): BookmarkId =>
  toDatabaseId<BookmarkId>(value, "Bookmark ID")

export const toCollectionId = (value: string): CollectionId =>
  toDatabaseId<CollectionId>(value, "Collection ID")

export const toTagId = (value: string): TagId =>
  toDatabaseId<TagId>(value, "Tag ID")

export const toEpochMilliseconds = (value: number): EpochMilliseconds => {
  if (!Number.isFinite(value)) {
    throw new TypeError("Timestamp must be a finite number.")
  }

  return value as EpochMilliseconds
}
