import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom"
import { move } from "@dnd-kit/helpers"
import { DragDropProvider } from "@dnd-kit/react"
import * as React from "react"

import {
  moveCollection,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import {
  getCollectionNestingHintSeen,
  getDefaultCollectionNestingHintSeen,
  markCollectionNestingHintSeen,
  subscribeToCollectionNestingHint,
} from "@/dev/dashboard-ui/collection-reorder-hint-store"
import {
  createFlatCollectionItems,
  getCollectionDragDepth,
  getCollectionProjection,
  getCollectionSiblingIndex,
  hasInvalidCollectionNestingIntent,
  normalizeFlatCollectionItems,
  type FlatCollectionItem,
} from "@/dev/dashboard-ui/collection-reorder-model"

const COLLECTION_INDENTATION_PX = 32

type CollectionReorderProviderProps = Pick<
  React.ComponentProps<typeof DragDropProvider>,
  "onDragEnd" | "onDragMove" | "onDragOver" | "onDragStart" | "sensors"
>

const collectionReorderSensors: NonNullable<
  CollectionReorderProviderProps["sensors"]
> = (defaults) => [
  ...defaults.filter((sensor) => sensor !== PointerSensor),
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [
            new PointerActivationConstraints.Delay({
              tolerance: 5,
              value: 250,
            }),
          ]
        : [new PointerActivationConstraints.Distance({ value: 5 })],
  }),
]

export function useCollectionReorderState({
  collections,
  onMove,
}: {
  collections: readonly Collection[]
  onMove: (sourceId: string, parentId: string | null, index: number) => void
}): {
  draggedChildCount: number
  draggedCollectionId: string | null
  draggedItem: FlatCollectionItem | null
  flattenedItems: FlatCollectionItem[]
  invalidNestingIntent: boolean
  moveWithKeyboard: (collection: Collection, direction: -1 | 1) => void
  projectedParentId: string | null
  providerProps: CollectionReorderProviderProps
  showNestingHint: boolean
} {
  const [flattenedItems, setFlattenedItems] = React.useState<
    FlatCollectionItem[]
  >(() => createFlatCollectionItems(collections))
  const [draggedCollectionId, setDraggedCollectionId] = React.useState<
    string | null
  >(null)
  const [draggedChildCount, setDraggedChildCount] = React.useState(0)
  const [invalidNestingIntent, setInvalidNestingIntent] = React.useState(false)
  const [projectedParentId, setProjectedParentId] = React.useState<
    string | null
  >(null)
  const [showNestingHint, setShowNestingHint] = React.useState(false)
  const hasSeenNestingHint = React.useSyncExternalStore(
    subscribeToCollectionNestingHint,
    getCollectionNestingHintSeen,
    getDefaultCollectionNestingHintSeen
  )
  const initialItemsRef = React.useRef(flattenedItems)
  const initialDepthRef = React.useRef<0 | 1>(0)
  const sourceChildrenRef = React.useRef<FlatCollectionItem[]>([])
  const sourceHasChildrenRef = React.useRef(false)

  const draggedItem = draggedCollectionId
    ? (flattenedItems.find((item) => item.id === draggedCollectionId) ?? null)
    : null

  const moveWithKeyboard = (
    collection: Collection,
    direction: -1 | 1
  ): void => {
    const siblingIds: string[] = []
    for (const item of flattenedItems) {
      if (item.parentId === collection.parentId) siblingIds.push(item.id)
    }

    const currentIndex = siblingIds.indexOf(collection.id)
    const nextIndex = Math.max(
      0,
      Math.min(currentIndex + direction, siblingIds.length - 1)
    )

    if (currentIndex === -1 || currentIndex === nextIndex) return

    const result = moveCollection(
      collections,
      collection.id,
      collection.parentId,
      nextIndex
    )
    if (result.ok) {
      setFlattenedItems(createFlatCollectionItems(result.collections))
    }
    onMove(collection.id, collection.parentId, nextIndex)
  }

  const resetDragState = (): void => {
    sourceChildrenRef.current = []
    sourceHasChildrenRef.current = false
    setDraggedChildCount(0)
    setInvalidNestingIntent(false)
    setProjectedParentId(null)
    setShowNestingHint(false)
    setDraggedCollectionId(null)
  }

  const updateDragFeedback = ({
    hasNestingCandidate,
    horizontalOffset,
    projection,
    sourceId,
  }: {
    hasNestingCandidate: boolean
    horizontalOffset: number
    projection: { depth: 0 | 1; parentId: string | null }
    sourceId: string
  }): void => {
    const initialSource = initialItemsRef.current.find(
      (item) => item.id === sourceId
    )
    const requestedInvalidDepth = hasInvalidCollectionNestingIntent({
      hasNestingCandidate,
      horizontalOffset,
      indentationWidth: COLLECTION_INDENTATION_PX,
      sourceHasChildren: sourceHasChildrenRef.current,
    })
    const nextParentId =
      projection.depth === 1 && projection.parentId !== initialSource?.parentId
        ? projection.parentId
        : null

    setInvalidNestingIntent(requestedInvalidDepth)
    setProjectedParentId(nextParentId)
    if (nextParentId) setShowNestingHint(false)
  }

  const providerProps: CollectionReorderProviderProps = {
    onDragEnd: (event) => {
      const sourceId = event.operation.source
        ? String(event.operation.source.id)
        : draggedCollectionId

      if (event.canceled || !sourceId) {
        setFlattenedItems(initialItemsRef.current)
        resetDragState()
        return
      }

      const normalizedItems = normalizeFlatCollectionItems([
        ...flattenedItems,
        ...sourceChildrenRef.current,
      ])
      const sourceItem = normalizedItems.find((item) => item.id === sourceId)

      setFlattenedItems(normalizedItems)
      resetDragState()
      if (!sourceItem) return

      const nextIndex = getCollectionSiblingIndex(
        normalizedItems,
        sourceId,
        sourceItem.parentId
      )
      const initialSource = initialItemsRef.current.find(
        (item) => item.id === sourceId
      )
      const initialIndex = getCollectionSiblingIndex(
        initialItemsRef.current,
        sourceId,
        initialSource?.parentId ?? null
      )

      if (
        initialSource?.parentId === sourceItem.parentId &&
        initialIndex === nextIndex
      ) {
        return
      }

      if (initialSource?.parentId === null && sourceItem.parentId !== null) {
        markCollectionNestingHintSeen()
      }
      onMove(sourceId, sourceItem.parentId, nextIndex)
    },
    onDragMove: (event, manager) => {
      if (event.defaultPrevented) return

      const { source, target } = event.operation
      if (!source || !target) return

      const horizontalOffset = manager.dragOperation.transform.x
      const depthChange = getCollectionDragDepth(
        horizontalOffset,
        COLLECTION_INDENTATION_PX
      )
      const projectedDepth = initialDepthRef.current + depthChange
      const projection = getCollectionProjection(
        flattenedItems,
        String(source.id),
        projectedDepth,
        sourceHasChildrenRef.current
      )
      const nestingCandidate = sourceHasChildrenRef.current
        ? getCollectionProjection(flattenedItems, String(source.id), 1, false)
            .parentId
        : null
      updateDragFeedback({
        hasNestingCandidate: nestingCandidate !== null,
        horizontalOffset,
        projection,
        sourceId: String(source.id),
      })
      const sourceItem = flattenedItems.find(
        (item) => item.id === String(source.id)
      )

      if (
        !sourceItem ||
        (sourceItem.depth === projection.depth &&
          sourceItem.parentId === projection.parentId)
      ) {
        return
      }

      setFlattenedItems((items) =>
        items.map((item) =>
          item.id === String(source.id) ? { ...item, ...projection } : item
        )
      )
    },
    onDragOver: (event, manager) => {
      const { source, target } = event.operation
      event.preventDefault()

      if (!source || !target || source.id === target.id) return

      const horizontalOffset = manager.dragOperation.transform.x
      const depthChange = getCollectionDragDepth(
        horizontalOffset,
        COLLECTION_INDENTATION_PX
      )
      const projectedDepth = initialDepthRef.current + depthChange
      const movedItems = move(flattenedItems, event)
      const projection = getCollectionProjection(
        movedItems,
        String(source.id),
        projectedDepth,
        sourceHasChildrenRef.current
      )
      const nestingCandidate = sourceHasChildrenRef.current
        ? getCollectionProjection(movedItems, String(source.id), 1, false)
            .parentId
        : null
      updateDragFeedback({
        hasNestingCandidate: nestingCandidate !== null,
        horizontalOffset,
        projection,
        sourceId: String(source.id),
      })
      setFlattenedItems(
        movedItems.map((item, index) =>
          item.id === String(source.id)
            ? { ...item, ...projection, index }
            : { ...item, index }
        )
      )
    },
    onDragStart: (event) => {
      const source = event.operation.source
      if (!source) return

      const sourceId = String(source.id)
      const sourceItem = flattenedItems.find((item) => item.id === sourceId)
      if (!sourceItem) return

      const childItems: FlatCollectionItem[] = []
      const remainingItems: FlatCollectionItem[] = []
      for (const item of flattenedItems) {
        if (item.parentId === sourceId) childItems.push(item)
        else remainingItems.push({ ...item, index: remainingItems.length })
      }

      initialItemsRef.current = flattenedItems
      initialDepthRef.current = sourceItem.depth
      sourceChildrenRef.current = childItems
      sourceHasChildrenRef.current = childItems.length > 0
      setDraggedChildCount(childItems.length)
      setShowNestingHint(
        sourceItem.depth === 0 &&
          !sourceHasChildrenRef.current &&
          !hasSeenNestingHint
      )
      setDraggedCollectionId(sourceId)
      setFlattenedItems(remainingItems)
    },
    sensors: collectionReorderSensors,
  }

  return {
    draggedChildCount,
    draggedCollectionId,
    draggedItem,
    flattenedItems,
    invalidNestingIntent,
    moveWithKeyboard,
    projectedParentId,
    providerProps,
    showNestingHint,
  }
}
