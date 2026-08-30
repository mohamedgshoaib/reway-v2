import {
  createCollectionIndex,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"

export interface FlatCollectionItem {
  collection: Collection
  depth: 0 | 1
  hasChildren: boolean
  id: string
  index: number
  parentId: string | null
}

export interface CollectionProjection {
  depth: 0 | 1
  parentId: string | null
}

export function createFlatCollectionItems(
  collections: readonly Collection[]
): FlatCollectionItem[] {
  return createCollectionIndex(collections, [], "custom").rows.map(
    (row, index) => ({
      collection: row.collection,
      depth: row.depth,
      hasChildren: row.hasChildren,
      id: row.collection.id,
      index,
      parentId: row.collection.parentId,
    })
  )
}

export function getCollectionDragDepth(
  horizontalOffset: number,
  indentationWidth: number
): number {
  if (indentationWidth <= 0) return 0

  const direction = Math.sign(horizontalOffset)
  const depthChange = Math.round(Math.abs(horizontalOffset) / indentationWidth)

  return depthChange === 0 ? 0 : direction * depthChange
}

export function hasInvalidCollectionNestingIntent({
  hasNestingCandidate,
  horizontalOffset,
  indentationWidth,
  sourceHasChildren,
}: {
  hasNestingCandidate: boolean
  horizontalOffset: number
  indentationWidth: number
  sourceHasChildren: boolean
}): boolean {
  return (
    sourceHasChildren &&
    hasNestingCandidate &&
    indentationWidth > 0 &&
    horizontalOffset >= indentationWidth
  )
}

export function getCollectionProjection(
  items: readonly FlatCollectionItem[],
  targetId: string,
  projectedDepth: number,
  sourceHasChildren: boolean
): CollectionProjection {
  if (sourceHasChildren) return { depth: 0, parentId: null }
  if (projectedDepth <= 0) return { depth: 0, parentId: null }

  const targetIndex = items.findIndex((item) => item.id === targetId)
  if (targetIndex === -1) return { depth: 0, parentId: null }

  const previousItem = items[targetIndex - 1]
  if (!previousItem) return { depth: 0, parentId: null }

  return {
    depth: 1,
    parentId:
      previousItem.depth === 0 ? previousItem.id : previousItem.parentId,
  }
}

export function normalizeFlatCollectionItems(
  items: readonly FlatCollectionItem[]
): FlatCollectionItem[] {
  const roots: FlatCollectionItem[] = []
  const childrenByParent = new Map<string, FlatCollectionItem[]>()
  const normalized: FlatCollectionItem[] = []
  const normalizedIds = new Set<string>()

  for (const item of items) {
    if (item.depth === 0 || item.parentId === null) {
      roots.push(item)
      continue
    }

    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }

  for (const root of roots) {
    normalized.push({
      ...root,
      collection: { ...root.collection, parentId: null },
      depth: 0,
      parentId: null,
    })
    normalizedIds.add(root.id)

    for (const child of childrenByParent.get(root.id) ?? []) {
      normalized.push({
        ...child,
        collection: { ...child.collection, parentId: root.id },
        depth: 1,
        parentId: root.id,
      })
      normalizedIds.add(child.id)
    }
  }

  for (const item of items) {
    if (normalizedIds.has(item.id)) continue
    normalized.push({
      ...item,
      collection: { ...item.collection, parentId: null },
      depth: 0,
      parentId: null,
    })
  }

  return normalized.map((item, index) => ({ ...item, index }))
}

export function getCollectionSiblingIndex(
  items: readonly FlatCollectionItem[],
  sourceId: string,
  parentId: string | null
): number {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  if (sourceIndex === -1) return 0

  return items
    .slice(0, sourceIndex)
    .filter((item) => item.parentId === parentId).length
}
