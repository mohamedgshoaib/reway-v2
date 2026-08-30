import {
  type AppearanceColor,
  resolveAppearanceColor,
} from "@/dev/dashboard-ui/appearance-color"

export type CollectionId = string

export type CollectionIconName =
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

export type CollectionOrderMode = "newest" | "alpha" | "custom"

export interface Collection {
  color?: AppearanceColor
  id: CollectionId
  name: string
  icon: CollectionIconName
  parentId: CollectionId | null
  createdAt: number
  order: number
}

export type CollectionColor = AppearanceColor

export interface CollectionMembershipSource {
  collections?: readonly CollectionId[]
}

export interface CollectionNode {
  collection: Collection
  children: CollectionNode[]
  directCount: number
  path: string
}

export interface CollectionRow {
  collection: Collection
  depth: 0 | 1
  directCount: number
  hasChildren: boolean
  path: string
}

export interface CollectionIndex {
  byId: ReadonlyMap<CollectionId, Collection>
  childIdsByParent: ReadonlyMap<CollectionId, readonly CollectionId[]>
  directCounts: ReadonlyMap<CollectionId, number>
  roots: CollectionNode[]
  rows: CollectionRow[]
}

export type MoveCollectionResult =
  | { collections: Collection[]; ok: true }
  | { message: string; ok: false }

export interface CollectionDeletion {
  deletedIds: Set<CollectionId>
  exclusiveBookmarkCount: number
  remainingCollections: Collection[]
}

export interface FlattenedCollectionImportPath {
  flattenedSegments: string[]
  retainedPath: string[]
  sourcePath: string[]
}

const MAX_COLLECTION_NAME_LENGTH = 24
const INVALID_COLLECTION_NAME = /[\p{Cc}\p{Cf}]/u

export function getCollectionColor(collection: {
  color?: CollectionColor
}): CollectionColor {
  return resolveAppearanceColor(collection.color)
}

function sortSiblings(
  collections: readonly Collection[],
  orderMode: CollectionOrderMode
): Collection[] {
  return [...collections].sort((first, second) => {
    if (orderMode === "alpha") {
      return first.name.localeCompare(second.name, undefined, {
        sensitivity: "base",
      })
    }

    if (orderMode === "newest") return second.createdAt - first.createdAt

    return first.order - second.order || second.createdAt - first.createdAt
  })
}

export function normalizeCollectionName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export function flattenImportedCollectionPath(
  path: readonly string[]
): FlattenedCollectionImportPath {
  const sourcePath = path
    .map(normalizeCollectionName)
    .filter((segment) => segment.length > 0)

  return {
    flattenedSegments: sourcePath.slice(2),
    retainedPath: sourcePath.slice(0, 2),
    sourcePath,
  }
}

export function getCollectionNameError(
  collections: readonly Collection[],
  name: string,
  editingId?: CollectionId
): string | null {
  const normalizedName = normalizeCollectionName(name)

  if (!normalizedName) return "Enter a collection name."
  if (Array.from(normalizedName).length > MAX_COLLECTION_NAME_LENGTH) {
    return "Use 24 characters or fewer."
  }
  if (INVALID_COLLECTION_NAME.test(normalizedName)) {
    return "Remove line breaks or control characters."
  }

  const normalizedComparison = normalizedName.toLocaleLowerCase()
  const duplicate = collections.some(
    (collection) =>
      collection.id !== editingId &&
      normalizeCollectionName(collection.name).toLocaleLowerCase() ===
        normalizedComparison
  )

  return duplicate ? "A collection with this name already exists." : null
}

export function createCollectionIndex(
  collections: readonly Collection[],
  bookmarks: readonly CollectionMembershipSource[],
  orderMode: CollectionOrderMode
): CollectionIndex {
  const byId = new Map(
    collections.map((collection) => [collection.id, collection])
  )
  const directCounts = new Map<CollectionId, number>()
  const childrenByParent = new Map<CollectionId, Collection[]>()

  for (const bookmark of bookmarks) {
    for (const collectionId of new Set(bookmark.collections ?? [])) {
      if (!byId.has(collectionId)) continue
      directCounts.set(collectionId, (directCounts.get(collectionId) ?? 0) + 1)
    }
  }

  for (const collection of collections) {
    if (collection.parentId === null) continue
    const siblings = childrenByParent.get(collection.parentId) ?? []
    siblings.push(collection)
    childrenByParent.set(collection.parentId, siblings)
  }

  const childIdsByParent = new Map<CollectionId, readonly CollectionId[]>()
  const roots = sortSiblings(
    collections.filter((collection) => collection.parentId === null),
    orderMode
  ).map((collection): CollectionNode => {
    const children = sortSiblings(
      childrenByParent.get(collection.id) ?? [],
      orderMode
    ).map((child): CollectionNode => ({
      children: [],
      collection: child,
      directCount: directCounts.get(child.id) ?? 0,
      path: `${collection.name} / ${child.name}`,
    }))

    childIdsByParent.set(
      collection.id,
      children.map((child) => child.collection.id)
    )

    return {
      children,
      collection,
      directCount: directCounts.get(collection.id) ?? 0,
      path: collection.name,
    }
  })

  const rows = roots.flatMap((root): CollectionRow[] => [
    {
      collection: root.collection,
      depth: 0,
      directCount: root.directCount,
      hasChildren: root.children.length > 0,
      path: root.path,
    },
    ...root.children.map((child): CollectionRow => ({
      collection: child.collection,
      depth: 1,
      directCount: child.directCount,
      hasChildren: false,
      path: child.path,
    })),
  ])

  return { byId, childIdsByParent, directCounts, roots, rows }
}

export function moveCollection(
  collections: readonly Collection[],
  sourceId: CollectionId,
  parentId: CollectionId | null,
  targetIndex: number
): MoveCollectionResult {
  const source = collections.find((collection) => collection.id === sourceId)
  if (!source) return { message: "Collection not found.", ok: false }

  const sourceHasChildren = collections.some(
    (collection) => collection.parentId === sourceId
  )
  if (parentId !== null && sourceHasChildren) {
    return {
      message: "Move its nested collections first.",
      ok: false,
    }
  }

  if (parentId !== null) {
    const parent = collections.find((collection) => collection.id === parentId)
    if (!parent || parent.parentId !== null || parent.id === sourceId) {
      return { message: "Choose a top-level collection.", ok: false }
    }
  }

  const withoutSource = collections.filter(
    (collection) => collection.id !== sourceId
  )
  const sourceSiblings = withoutSource
    .filter((collection) => collection.parentId === source.parentId)
    .sort((first, second) => first.order - second.order)
  const destinationSiblings = (
    parentId === source.parentId
      ? sourceSiblings
      : withoutSource.filter((collection) => collection.parentId === parentId)
  ).sort((first, second) => first.order - second.order)
  const boundedIndex = Math.max(
    0,
    Math.min(targetIndex, destinationSiblings.length)
  )
  const movedSource = { ...source, parentId }
  destinationSiblings.splice(boundedIndex, 0, movedSource)
  const nextOrderById = new Map<CollectionId, number>()

  if (source.parentId !== parentId) {
    for (const [index, collection] of sourceSiblings.entries()) {
      nextOrderById.set(collection.id, index)
    }
  }
  for (const [index, collection] of destinationSiblings.entries()) {
    nextOrderById.set(collection.id, index)
  }

  return {
    collections: collections.map((collection) => {
      if (collection.id === sourceId) {
        return { ...movedSource, order: nextOrderById.get(sourceId) ?? 0 }
      }

      const nextOrder = nextOrderById.get(collection.id)
      return nextOrder === undefined
        ? collection
        : { ...collection, order: nextOrder }
    }),
    ok: true,
  }
}

export function getCollectionDeletion(
  collections: readonly Collection[],
  bookmarks: readonly CollectionMembershipSource[],
  collectionId: CollectionId
): CollectionDeletion {
  const deletedIds = new Set<CollectionId>([collectionId])

  for (const collection of collections) {
    if (collection.parentId === collectionId) deletedIds.add(collection.id)
  }

  let exclusiveBookmarkCount = 0
  for (const bookmark of bookmarks) {
    const memberships = bookmark.collections ?? []
    if (
      memberships.length > 0 &&
      memberships.every((membership) => deletedIds.has(membership))
    ) {
      exclusiveBookmarkCount += 1
    }
  }

  return {
    deletedIds,
    exclusiveBookmarkCount,
    remainingCollections: collections.filter(
      (collection) => !deletedIds.has(collection.id)
    ),
  }
}
