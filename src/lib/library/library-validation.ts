import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"
import type {
  BookmarkId,
  Collection,
  CollectionId,
  Tag,
  TagId,
} from "@/lib/library/library-types"

const MAX_LIBRARY_NAME_LENGTH = 24
const MAX_ORDER_KEY_LENGTH = 200
const INVALID_TEXT = /[\p{Cc}\p{Cf}]/u

export const normalizeLibraryName = (name: string): string =>
  name.trim().replace(/\s+/gu, " ")

export const normalizeBookmarkTitle = (title: string): string =>
  title.trim().replace(/\s+/gu, " ")

export const normalizeBookmarkUrl = (value: string): string => {
  const normalizedUrl = value.trim()

  try {
    const parsedUrl = new URL(normalizedUrl)
    if (
      (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") ||
      parsedUrl.username.length > 0 ||
      parsedUrl.password.length > 0 ||
      INVALID_TEXT.test(normalizedUrl)
    ) {
      throw invalidLibraryInput("Enter a valid HTTP or HTTPS URL.")
    }
  } catch (error) {
    if (error instanceof LibraryError) throw error
    throw invalidLibraryInput("Enter a valid HTTP or HTTPS URL.")
  }

  return normalizedUrl
}

export const validateBookmarkTitle = (title: string): string => {
  const normalizedTitle = normalizeBookmarkTitle(title)
  if (normalizedTitle.length === 0 || INVALID_TEXT.test(normalizedTitle)) {
    throw invalidLibraryInput("Enter a valid bookmark title.")
  }
  return normalizedTitle
}

export const validateLibraryName = (name: string): string => {
  const normalizedName = normalizeLibraryName(name)
  if (normalizedName.length === 0) {
    throw invalidLibraryInput("Enter a name.")
  }
  if (Array.from(normalizedName).length > MAX_LIBRARY_NAME_LENGTH) {
    throw invalidLibraryInput("Use 24 characters or fewer.")
  }
  if (INVALID_TEXT.test(normalizedName)) {
    throw invalidLibraryInput("Remove line breaks or control characters.")
  }
  return normalizedName
}

export const validateOrderKey = (sortOrder: string): string => {
  if (
    sortOrder.length === 0 ||
    sortOrder.length > MAX_ORDER_KEY_LENGTH ||
    INVALID_TEXT.test(sortOrder)
  ) {
    throw invalidLibraryInput("The order key is invalid.")
  }
  return sortOrder
}

export const validateAlignedOrderInput = <T>(
  ids: readonly T[],
  sortOrders: readonly string[]
): void => {
  if (ids.length === 0 || ids.length !== sortOrders.length) {
    throw invalidLibraryInput(
      "IDs and order keys must be non-empty and aligned."
    )
  }

  for (const sortOrder of sortOrders) validateOrderKey(sortOrder)
}

export const requireUniqueIds = <T>(ids: readonly T[]): void => {
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw invalidLibraryInput("IDs must be non-empty and unique.")
  }
}

export const assertUniqueCollectionName = (
  collections: readonly Collection[],
  name: string,
  editingId?: CollectionId
): void => {
  const comparison = normalizeLibraryName(name).toLocaleLowerCase()
  const duplicate = collections.some(
    (collection) =>
      collection.id !== editingId &&
      normalizeLibraryName(collection.name).toLocaleLowerCase() === comparison
  )
  if (duplicate) {
    throw new LibraryError(
      "conflict",
      "A collection with this name already exists.",
      false
    )
  }
}

export const assertUniqueTagName = (
  tags: readonly Tag[],
  name: string,
  editingId?: TagId
): void => {
  const comparison = normalizeLibraryName(name).toLocaleLowerCase()
  const duplicate = tags.some(
    (tag) =>
      tag.id !== editingId &&
      normalizeLibraryName(tag.name).toLocaleLowerCase() === comparison
  )
  if (duplicate) {
    throw new LibraryError(
      "conflict",
      "A tag with this name already exists.",
      false
    )
  }
}

export const assertValidCollectionParent = (
  collections: readonly Collection[],
  collectionId: CollectionId | undefined,
  parentId: CollectionId | null
): void => {
  if (parentId === null) return
  if (parentId === collectionId) {
    throw invalidLibraryInput("A collection cannot contain itself.")
  }

  const parent = collections.find((collection) => collection.id === parentId)
  if (!parent || parent.parentId !== null) {
    throw invalidLibraryInput("Choose a top-level collection.")
  }

  if (
    collectionId !== undefined &&
    collections.some((collection) => collection.parentId === collectionId)
  ) {
    throw new LibraryError(
      "conflict",
      "Move the nested collections before changing this parent.",
      false
    )
  }
}

export const toNumericId = (id: BookmarkId | CollectionId | TagId): number => {
  const value = Number(id)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw invalidLibraryInput("The database ID is outside the supported range.")
  }
  return value
}
