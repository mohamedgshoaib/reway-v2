import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
export const TRASH_RETENTION_DAYS = 30

export type BookmarkTrashAction =
  | { kind: "restore" }
  | { kind: "delete-forever" }

export interface BookmarkTrashMutationResult {
  affectedCount: number
  bookmarks: MockBookmark[]
}

export interface BookmarkTrashRecovery {
  daysRemaining: number
  label: string
}

export interface BookmarkTrashOrigin {
  collectionNames: string[]
  label: string
}

export interface BookmarkRestoreSummary {
  description?: string
  title: string
}

function bookmarkCountLabel(count: number): string {
  return `${count} ${count === 1 ? "bookmark" : "bookmarks"}`
}

function getPriorCollectionNames(
  bookmark: MockBookmark,
  collections: readonly Collection[]
): string[] {
  const collectionNamesById = new Map(
    collections.map((collection) => [collection.id, collection.name])
  )
  const names: string[] = []

  for (const collectionId of new Set(bookmark.collections ?? [])) {
    const name = collectionNamesById.get(collectionId)
    if (name) names.push(name)
  }

  return names
}

function formatCollectionNames(names: readonly string[]): string | undefined {
  if (names.length === 0) return undefined
  if (names.length === 1) return `${names[0]}.`
  if (names.length === 2) return `${names[0]} and ${names[1]}.`
  return `${names[0]}, ${names[1]}, and ${names.length - 2} more.`
}

export function getBookmarkTrashOrigin(
  bookmark: MockBookmark,
  collections: readonly Collection[]
): BookmarkTrashOrigin {
  const collectionNames = getPriorCollectionNames(bookmark, collections)

  if (collectionNames.length === 0) {
    return { collectionNames, label: "From Uncollected" }
  }

  return {
    collectionNames,
    label:
      collectionNames.length === 1
        ? `From ${collectionNames[0]}`
        : `From ${collectionNames[0]} + ${collectionNames.length - 1}`,
  }
}

export function getBookmarkRestoreSummary(
  bookmarks: readonly MockBookmark[],
  collections: readonly Collection[]
): BookmarkRestoreSummary {
  if (bookmarks.length === 0) return { title: "Restored 0 bookmarks" }

  const destinations = bookmarks.map((bookmark) =>
    getPriorCollectionNames(bookmark, collections)
  )

  if (bookmarks.length === 1) {
    const names = destinations[0] ?? []
    if (names.length === 0) return { title: "Restored to Uncollected" }
    if (names.length === 1) return { title: `Restored to ${names[0]}` }
    return {
      description: formatCollectionNames(names),
      title: `Restored to ${names.length} collections`,
    }
  }

  const firstDestination = destinations[0] ?? []
  const sharedDestination = destinations.every(
    (names) =>
      names.length === firstDestination.length &&
      names.every((name, index) => name === firstDestination[index])
  )
  const count = bookmarkCountLabel(bookmarks.length)

  if (sharedDestination) {
    if (firstDestination.length === 0) {
      return { title: `Restored ${count} to Uncollected` }
    }
    if (firstDestination.length === 1) {
      return { title: `Restored ${count} to ${firstDestination[0]}` }
    }
    return {
      description: formatCollectionNames(firstDestination),
      title: `Restored ${count} to ${firstDestination.length} collections`,
    }
  }

  const includesUncollected = destinations.some((names) => names.length === 0)
  return {
    description: includesUncollected
      ? "Returned to their previous collections or Uncollected."
      : "Returned to their previous collections.",
    title: `Restored ${count}`,
  }
}

export function getBookmarkTrashRecovery(
  bookmark: MockBookmark,
  now: number
): BookmarkTrashRecovery | null {
  if (bookmark.trashedAt === undefined) return null

  const expiresAt =
    bookmark.trashedAt + TRASH_RETENTION_DAYS * DAY_IN_MILLISECONDS
  const daysRemaining = Math.max(
    0,
    Math.min(
      TRASH_RETENTION_DAYS,
      Math.ceil((expiresAt - now) / DAY_IN_MILLISECONDS)
    )
  )

  return {
    daysRemaining,
    label:
      daysRemaining === 0
        ? "Deletes today"
        : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`,
  }
}

export function applyBookmarkTrashAction(
  bookmarks: readonly MockBookmark[],
  selectedIds: ReadonlySet<string>,
  action: BookmarkTrashAction
): BookmarkTrashMutationResult {
  let affectedCount = 0

  if (action.kind === "delete-forever") {
    const nextBookmarks: MockBookmark[] = []

    for (const bookmark of bookmarks) {
      const shouldDelete =
        selectedIds.has(bookmark.id) && bookmark.trashedAt !== undefined
      if (shouldDelete) {
        affectedCount += 1
      } else {
        nextBookmarks.push(bookmark)
      }
    }

    return { affectedCount, bookmarks: nextBookmarks }
  }

  const nextBookmarks = bookmarks.map((bookmark) => {
    const shouldRestore =
      selectedIds.has(bookmark.id) && bookmark.trashedAt !== undefined
    if (!shouldRestore) return bookmark

    affectedCount += 1
    const { trashedAt: _trashedAt, ...restoredBookmark } = bookmark
    return restoredBookmark
  })

  return { affectedCount, bookmarks: nextBookmarks }
}
