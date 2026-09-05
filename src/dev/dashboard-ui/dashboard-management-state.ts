import * as React from "react"

import { TOAST_DEFAULT_TIMEOUT_MS, toastManager } from "@/components/ui/toast"
import {
  getCollectionDeletion,
  moveCollection,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import type { CollectionDraft } from "@/dev/dashboard-ui/collection-management"
import type { DashboardDestination } from "@/dev/dashboard-ui/dashboard-destination"
import {
  MOCK_DASHBOARD_NOW,
  mockBookmarks,
  mockCollections,
  mockTags,
  type MockBookmark,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { moveTag, type Tag, type TagDraft } from "@/dev/dashboard-ui/tag-model"

const MOCK_MANAGEMENT_MUTATION_DELAY = 450

export type DashboardManagementMutation =
  | { bookmarkId: string; collectionId: string; kind: "bookmark-add" }
  | { bookmarkId: string; collectionId: string; kind: "bookmark-move" }
  | { bookmarkId: string; kind: "bookmark-tags"; tags: readonly string[] }
  | { bookmarkId: string; kind: "bookmark-title"; title: string }
  | { collection: Collection; kind: "collection-create" }
  | { collectionId: string; draft: CollectionDraft; kind: "collection-edit" }
  | { collectionId: string; kind: "collection-delete" }
  | { draft: TagDraft; kind: "tag-create"; tagId: string }
  | { draft: TagDraft; kind: "tag-edit"; tagId: string }
  | { kind: "tag-delete"; tagId: string }

export type DashboardManagementMutationFixture = (
  mutation: DashboardManagementMutation
) => Promise<void>

export type ReopenCollectionCreateDraft = (
  saveError: string,
  collectionId: string
) => void
export type ReopenCollectionEditDraft = (saveError: string) => void
export type ReopenTagCreateDraft = (saveError: string, tagId: string) => void
export type ReopenTagEditDraft = (saveError: string) => void
export type ReopenBookmarkTitleDraft = (saveError: string) => void
export type ReopenBookmarkTagsDraft = (
  tags: readonly string[],
  saveError: string
) => void

export interface BookmarkManagementHandlers {
  onAddToCollection: (bookmarkId: string, collectionId: string) => void
  onDelete: (bookmarkId: string) => void
  onMoveToCollection: (bookmarkId: string, collectionId: string) => void
  onReenrich: (bookmarkId: string) => void
  onTagsChange: (
    bookmarkId: string,
    tags: string[],
    reopenDraft?: ReopenBookmarkTagsDraft
  ) => void
  onTitleChange: (
    bookmarkId: string,
    title: string,
    reopenDraft?: ReopenBookmarkTitleDraft
  ) => void
}

export interface TagManagementHandlers {
  onCreateTag: (
    draft: TagDraft,
    reopenDraft?: ReopenTagCreateDraft,
    retryTagId?: string
  ) => void
  onDeleteTag: (tagId: string, reopenDelete?: () => void) => Promise<boolean>
  onMoveTag: (sourceId: string, index: number) => void
  onUpdateTag: (
    tagId: string,
    draft: TagDraft,
    reopenDraft?: ReopenTagEditDraft
  ) => void
}

export interface CollectionManagementHandlers {
  onCreateCollection: (
    draft: CollectionDraft,
    reopenDraft?: ReopenCollectionCreateDraft,
    retryCollectionId?: string
  ) => void
  onDeleteCollection: (
    collectionId: string,
    reopenDelete?: () => void
  ) => Promise<boolean>
  onMoveCollection: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onUpdateCollection: (
    collectionId: string,
    draft: CollectionDraft,
    reopenDraft?: ReopenCollectionEditDraft
  ) => void
}

interface DashboardManagementState {
  bookmarkHandlers: BookmarkManagementHandlers
  bookmarks: MockBookmark[]
  collectionHandlers: CollectionManagementHandlers
  collections: Collection[]
  setBookmarks: React.Dispatch<React.SetStateAction<MockBookmark[]>>
  tagHandlers: TagManagementHandlers
  tags: Tag[]
}

interface OptimisticMutationOptions {
  errorDescription: string
  errorTitle: string
  key: string
  mutation: DashboardManagementMutation
  retry: () => void
  rollback: () => void
}

const runDefaultManagementMutationFixture: DashboardManagementMutationFixture =
  () =>
    new Promise((resolve) => {
      setTimeout(resolve, MOCK_MANAGEMENT_MUTATION_DELAY)
    })

function bookmarkCountLabel(count: number): string {
  return `${count} ${count === 1 ? "bookmark" : "bookmarks"}`
}

function sameValues(
  first: readonly string[],
  second: readonly string[]
): boolean {
  if (first.length !== second.length) return false
  const secondValues = new Set(second)
  return first.every((value) => secondValues.has(value))
}

function replaceBookmark(
  bookmarks: readonly MockBookmark[],
  snapshot: MockBookmark
): MockBookmark[] {
  return bookmarks.map((bookmark) =>
    bookmark.id === snapshot.id ? snapshot : bookmark
  )
}

export function useDashboardManagementState({
  destination,
  mutationFixture = runDefaultManagementMutationFixture,
  onActiveCollectionDeleted,
}: {
  destination: DashboardDestination
  mutationFixture?: DashboardManagementMutationFixture
  onActiveCollectionDeleted: () => void
}): DashboardManagementState {
  const [bookmarks, setBookmarks] =
    React.useState<MockBookmark[]>(mockBookmarks)
  const [collections, setCollections] =
    React.useState<Collection[]>(mockCollections)
  const [tags, setTags] = React.useState<Tag[]>(mockTags)
  const mutationTokensRef = React.useRef(new Map<string, number>())

  const beginMutation = (key: string): number => {
    const token = (mutationTokensRef.current.get(key) ?? 0) + 1
    mutationTokensRef.current.set(key, token)
    return token
  }

  const invalidateMutation = (key: string): void => {
    beginMutation(key)
  }

  const persistOptimisticMutation = ({
    errorDescription,
    errorTitle,
    key,
    mutation,
    retry,
    rollback,
  }: OptimisticMutationOptions): void => {
    const token = beginMutation(key)

    void mutationFixture(mutation).catch(() => {
      if (mutationTokensRef.current.get(key) !== token) return

      rollback()
      toastManager.update(key, {
        actionProps: {
          children: "Retry",
          onClick: retry,
        },
        description: errorDescription,
        priority: "high",
        timeout: 0,
        title: errorTitle,
        type: "error",
      })
    })
  }

  const onCreateTag: TagManagementHandlers["onCreateTag"] = (
    draft,
    reopenDraft,
    retryTagId
  ) => {
    const tagId = retryTagId ?? `tag-${crypto.randomUUID()}`
    const tag: Tag = {
      ...draft,
      createdAt: Date.now(),
      id: tagId,
      order: 0,
    }
    const toastId = `dashboard-tag-${tagId}`

    setTags((currentTags) => [
      tag,
      ...currentTags.map((currentTag) => ({
        ...currentTag,
        order: currentTag.order + 1,
      })),
    ])
    toastManager.add({
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Created ${tag.name}`,
      type: "success",
    })

    persistOptimisticMutation({
      errorDescription: "The tag was not created.",
      errorTitle: `Could not create ${tag.name}`,
      key: toastId,
      mutation: { draft, kind: "tag-create", tagId },
      retry: () => {
        toastManager.close(toastId)
        reopenDraft?.("Could not save this tag. Try again.", tagId)
      },
      rollback: () =>
        setTags((currentTags) =>
          currentTags.filter((currentTag) => currentTag.id !== tagId)
        ),
    })
  }

  const onUpdateTag: TagManagementHandlers["onUpdateTag"] = (
    tagId,
    draft,
    reopenDraft
  ) => {
    const snapshot = tags.find((tag) => tag.id === tagId)
    if (!snapshot) return
    const toastId = `dashboard-tag-${tagId}`

    setTags((currentTags) =>
      currentTags.map((tag) => (tag.id === tagId ? { ...tag, ...draft } : tag))
    )
    toastManager.add({
      actionProps: {
        children: "Undo",
        onClick: () => {
          invalidateMutation(toastId)
          setTags((currentTags) =>
            currentTags.map((tag) => (tag.id === tagId ? snapshot : tag))
          )
          toastManager.add({
            actionProps: undefined,
            id: toastId,
            priority: "low",
            timeout: TOAST_DEFAULT_TIMEOUT_MS,
            title: `Restored ${snapshot.name}`,
            type: "success",
          })
        },
      },
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Updated ${draft.name}`,
      type: "success",
    })

    persistOptimisticMutation({
      errorDescription: "The earlier tag values are back.",
      errorTitle: `Could not update ${draft.name}`,
      key: toastId,
      mutation: { draft, kind: "tag-edit", tagId },
      retry: () => {
        toastManager.close(toastId)
        reopenDraft?.("Could not save this tag. Try again.")
      },
      rollback: () =>
        setTags((currentTags) =>
          currentTags.map((tag) => (tag.id === tagId ? snapshot : tag))
        ),
    })
  }

  const onDeleteTag: TagManagementHandlers["onDeleteTag"] = async (
    tagId,
    reopenDelete
  ) => {
    const tagSnapshot = tags.find((tag) => tag.id === tagId)
    if (!tagSnapshot) return false
    const tagsSnapshot = tags
    const bookmarksSnapshot = bookmarks
    const affectedCount = bookmarks.filter((bookmark) =>
      bookmark.tags?.includes(tagId)
    ).length
    const toastId = `dashboard-tag-${tagId}`
    const token = beginMutation(toastId)

    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId))
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map((bookmark) => ({
        ...bookmark,
        tags: bookmark.tags?.filter((bookmarkTagId) => bookmarkTagId !== tagId),
      }))
    )

    try {
      await mutationFixture({ kind: "tag-delete", tagId })
      if (mutationTokensRef.current.get(toastId) !== token) return false

      toastManager.add({
        description: `Removed from ${bookmarkCountLabel(affectedCount)}.`,
        id: toastId,
        priority: "low",
        timeout: TOAST_DEFAULT_TIMEOUT_MS,
        title: `Deleted ${tagSnapshot.name}`,
        type: "success",
      })
      return true
    } catch {
      if (mutationTokensRef.current.get(toastId) !== token) return false

      setTags(tagsSnapshot)
      setBookmarks(bookmarksSnapshot)
      toastManager.add({
        actionProps: {
          children: "Retry",
          onClick: () => {
            toastManager.close(toastId)
            reopenDelete?.()
          },
        },
        description: "The tag and bookmark links are back.",
        id: toastId,
        priority: "high",
        timeout: 0,
        title: `Could not delete ${tagSnapshot.name}`,
        type: "error",
      })
      return false
    }
  }

  const onCreateCollection: CollectionManagementHandlers["onCreateCollection"] =
    (draft, reopenDraft, retryCollectionId) => {
      const collectionId =
        retryCollectionId ?? `collection-${crypto.randomUUID()}`
      const collection: Collection = {
        ...draft,
        createdAt: Date.now(),
        id: collectionId,
        order: 0,
      }
      const toastId = `dashboard-collection-${collectionId}`

      setCollections((currentCollections) => [
        collection,
        ...currentCollections.map((currentCollection) =>
          currentCollection.parentId === draft.parentId
            ? { ...currentCollection, order: currentCollection.order + 1 }
            : currentCollection
        ),
      ])
      toastManager.add({
        id: toastId,
        priority: "low",
        timeout: TOAST_DEFAULT_TIMEOUT_MS,
        title: `Created ${collection.name}`,
        type: "success",
      })

      persistOptimisticMutation({
        errorDescription: "The collection was not created.",
        errorTitle: `Could not create ${collection.name}`,
        key: toastId,
        mutation: { collection, kind: "collection-create" },
        retry: () => {
          toastManager.close(toastId)
          reopenDraft?.(
            "Could not save this collection. Try again.",
            collectionId
          )
        },
        rollback: () =>
          setCollections((currentCollections) =>
            currentCollections
              .filter(
                (currentCollection) => currentCollection.id !== collectionId
              )
              .map((currentCollection) =>
                currentCollection.parentId === draft.parentId
                  ? {
                      ...currentCollection,
                      order: Math.max(0, currentCollection.order - 1),
                    }
                  : currentCollection
              )
          ),
      })
    }

  const onUpdateCollection: CollectionManagementHandlers["onUpdateCollection"] =
    (collectionId, draft, reopenDraft) => {
      const snapshot = collections.find(
        (collection) => collection.id === collectionId
      )
      if (!snapshot) return
      const toastId = `dashboard-collection-${collectionId}`

      setCollections((currentCollections) => {
        const parentChanged = snapshot.parentId !== draft.parentId
        const movedCollections = parentChanged
          ? moveCollection(currentCollections, collectionId, draft.parentId, 0)
          : { collections: [...currentCollections], ok: true as const }

        if (!movedCollections.ok) return currentCollections
        return movedCollections.collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, ...draft }
            : collection
        )
      })
      toastManager.add({
        actionProps: {
          children: "Undo",
          onClick: () => {
            invalidateMutation(toastId)
            setCollections((currentCollections) => {
              const movedCollections = moveCollection(
                currentCollections,
                collectionId,
                snapshot.parentId,
                snapshot.order
              )
              if (!movedCollections.ok) return currentCollections
              return movedCollections.collections.map((collection) =>
                collection.id === collectionId ? snapshot : collection
              )
            })
            toastManager.add({
              actionProps: undefined,
              id: toastId,
              priority: "low",
              timeout: TOAST_DEFAULT_TIMEOUT_MS,
              title: `Restored ${snapshot.name}`,
              type: "success",
            })
          },
        },
        id: toastId,
        priority: "low",
        timeout: TOAST_DEFAULT_TIMEOUT_MS,
        title: `Updated ${draft.name}`,
        type: "success",
      })

      persistOptimisticMutation({
        errorDescription: "The earlier collection values are back.",
        errorTitle: `Could not update ${draft.name}`,
        key: toastId,
        mutation: { collectionId, draft, kind: "collection-edit" },
        retry: () => {
          toastManager.close(toastId)
          reopenDraft?.("Could not save this collection. Try again.")
        },
        rollback: () =>
          setCollections((currentCollections) => {
            const movedCollections = moveCollection(
              currentCollections,
              collectionId,
              snapshot.parentId,
              snapshot.order
            )
            if (!movedCollections.ok) return currentCollections
            return movedCollections.collections.map((collection) =>
              collection.id === collectionId ? snapshot : collection
            )
          }),
      })
    }

  const onDeleteCollection: CollectionManagementHandlers["onDeleteCollection"] =
    async (collectionId, reopenDelete) => {
      const collection = collections.find((item) => item.id === collectionId)
      if (!collection) return false
      const collectionsSnapshot = collections
      const bookmarksSnapshot = bookmarks
      const deletion = getCollectionDeletion(
        collections,
        bookmarks,
        collectionId
      )
      const toastId = `dashboard-collection-${collectionId}`
      const token = beginMutation(toastId)

      setCollections(deletion.remainingCollections)
      setBookmarks((currentBookmarks) =>
        currentBookmarks.map((bookmark) => {
          const currentMemberships = bookmark.collections ?? []
          const remainingMemberships = currentMemberships.filter(
            (membership) => !deletion.deletedIds.has(membership)
          )
          const movedToTrash =
            currentMemberships.length > 0 &&
            remainingMemberships.length === 0 &&
            currentMemberships.every((membership) =>
              deletion.deletedIds.has(membership)
            )

          return {
            ...bookmark,
            collections: remainingMemberships,
            trashedAt:
              movedToTrash && bookmark.trashedAt === undefined
                ? MOCK_DASHBOARD_NOW
                : bookmark.trashedAt,
          }
        })
      )

      try {
        await mutationFixture({ collectionId, kind: "collection-delete" })
        if (mutationTokensRef.current.get(toastId) !== token) return false

        if (
          destination.kind === "collection" &&
          deletion.deletedIds.has(destination.collectionId)
        ) {
          onActiveCollectionDeleted()
        }

        const nestedCollectionCount = deletion.deletedIds.size - 1
        toastManager.add({
          description:
            deletion.exclusiveBookmarkCount === 0
              ? "No bookmarks moved to Trash."
              : `${bookmarkCountLabel(deletion.exclusiveBookmarkCount)} moved to Trash.`,
          id: toastId,
          priority: "low",
          timeout: TOAST_DEFAULT_TIMEOUT_MS,
          title:
            nestedCollectionCount === 0
              ? `Deleted ${collection.name}`
              : `Deleted ${collection.name} and ${nestedCollectionCount} nested ${nestedCollectionCount === 1 ? "collection" : "collections"}`,
          type: "success",
        })
        return true
      } catch {
        if (mutationTokensRef.current.get(toastId) !== token) return false

        setCollections(collectionsSnapshot)
        setBookmarks(bookmarksSnapshot)
        toastManager.add({
          actionProps: {
            children: "Retry",
            onClick: () => {
              toastManager.close(toastId)
              reopenDelete?.()
            },
          },
          description: "The collection and its bookmarks are back.",
          id: toastId,
          priority: "high",
          timeout: 0,
          title: `Could not delete ${collection.name}`,
          type: "error",
        })
        return false
      }
    }

  const onAddToCollection: BookmarkManagementHandlers["onAddToCollection"] = (
    bookmarkId,
    collectionId
  ) => {
    const snapshot = bookmarks.find((bookmark) => bookmark.id === bookmarkId)
    const collection = collections.find((item) => item.id === collectionId)
    if (!snapshot || !collection) return
    if (snapshot.collections?.includes(collectionId)) return
    const toastId = `dashboard-bookmark-${bookmarkId}`
    const updatedBookmark = {
      ...snapshot,
      collections: Array.from(
        new Set([...(snapshot.collections ?? []), collectionId])
      ),
    }

    setBookmarks((currentBookmarks) =>
      replaceBookmark(currentBookmarks, updatedBookmark)
    )
    toastManager.add({
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Added ${snapshot.title} to ${collection.name}`,
      type: "success",
    })
    persistOptimisticMutation({
      errorDescription: "The bookmark is back in its earlier collections.",
      errorTitle: `Could not add ${snapshot.title} to ${collection.name}`,
      key: toastId,
      mutation: { bookmarkId, collectionId, kind: "bookmark-add" },
      retry: () => onAddToCollection(bookmarkId, collectionId),
      rollback: () =>
        setBookmarks((currentBookmarks) =>
          replaceBookmark(currentBookmarks, snapshot)
        ),
    })
  }

  const onMoveToCollection: BookmarkManagementHandlers["onMoveToCollection"] = (
    bookmarkId,
    collectionId
  ) => {
    const snapshot = bookmarks.find((bookmark) => bookmark.id === bookmarkId)
    const collection = collections.find((item) => item.id === collectionId)
    if (!snapshot || !collection) return
    if (
      snapshot.collections?.length === 1 &&
      snapshot.collections[0] === collectionId
    ) {
      return
    }
    const toastId = `dashboard-bookmark-${bookmarkId}`
    const updatedBookmark = { ...snapshot, collections: [collectionId] }

    setBookmarks((currentBookmarks) =>
      replaceBookmark(currentBookmarks, updatedBookmark)
    )
    toastManager.add({
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Moved ${snapshot.title} to ${collection.name}`,
      type: "success",
    })
    persistOptimisticMutation({
      errorDescription: "The bookmark is back in its earlier collections.",
      errorTitle: `Could not move ${snapshot.title} to ${collection.name}`,
      key: toastId,
      mutation: { bookmarkId, collectionId, kind: "bookmark-move" },
      retry: () => onMoveToCollection(bookmarkId, collectionId),
      rollback: () =>
        setBookmarks((currentBookmarks) =>
          replaceBookmark(currentBookmarks, snapshot)
        ),
    })
  }

  const onTagsChange: BookmarkManagementHandlers["onTagsChange"] = (
    bookmarkId,
    nextTags,
    reopenDraft
  ) => {
    const snapshot = bookmarks.find((bookmark) => bookmark.id === bookmarkId)
    if (!snapshot || sameValues(snapshot.tags ?? [], nextTags)) return
    const toastId = `dashboard-bookmark-${bookmarkId}`
    const updatedBookmark = { ...snapshot, tags: nextTags }

    setBookmarks((currentBookmarks) =>
      replaceBookmark(currentBookmarks, updatedBookmark)
    )
    toastManager.add({
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Updated tags for ${snapshot.title}`,
      type: "success",
    })
    persistOptimisticMutation({
      errorDescription: "The earlier tags are back.",
      errorTitle: `Could not update tags for ${snapshot.title}`,
      key: toastId,
      mutation: { bookmarkId, kind: "bookmark-tags", tags: nextTags },
      retry: () => {
        toastManager.close(toastId)
        reopenDraft?.(nextTags, "Could not save these tags. Try again.")
      },
      rollback: () =>
        setBookmarks((currentBookmarks) =>
          replaceBookmark(currentBookmarks, snapshot)
        ),
    })
  }

  const onTitleChange: BookmarkManagementHandlers["onTitleChange"] = (
    bookmarkId,
    title,
    reopenDraft
  ) => {
    const snapshot = bookmarks.find((bookmark) => bookmark.id === bookmarkId)
    if (!snapshot || snapshot.title === title) return
    const toastId = `dashboard-bookmark-${bookmarkId}`
    const updatedBookmark = { ...snapshot, title }

    setBookmarks((currentBookmarks) =>
      replaceBookmark(currentBookmarks, updatedBookmark)
    )
    toastManager.add({
      actionProps: {
        children: "Undo",
        onClick: () => {
          invalidateMutation(toastId)
          setBookmarks((currentBookmarks) =>
            replaceBookmark(currentBookmarks, snapshot)
          )
          toastManager.add({
            actionProps: undefined,
            id: toastId,
            priority: "low",
            timeout: TOAST_DEFAULT_TIMEOUT_MS,
            title: `Restored ${snapshot.title}`,
            type: "success",
          })
        },
      },
      id: toastId,
      priority: "low",
      timeout: TOAST_DEFAULT_TIMEOUT_MS,
      title: `Updated ${title}`,
      type: "success",
    })
    persistOptimisticMutation({
      errorDescription: "The earlier title is back.",
      errorTitle: `Could not update ${title}`,
      key: toastId,
      mutation: { bookmarkId, kind: "bookmark-title", title },
      retry: () => {
        toastManager.close(toastId)
        reopenDraft?.("Could not save this bookmark. Try again.")
      },
      rollback: () =>
        setBookmarks((currentBookmarks) =>
          replaceBookmark(currentBookmarks, snapshot)
        ),
    })
  }

  const bookmarkHandlers: BookmarkManagementHandlers = {
    onAddToCollection,
    onDelete: (bookmarkId) => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.map((bookmark) =>
          bookmark.id === bookmarkId
            ? { ...bookmark, trashedAt: MOCK_DASHBOARD_NOW }
            : bookmark
        )
      )
    },
    onMoveToCollection,
    onReenrich: (bookmarkId) => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.map((bookmark) =>
          bookmark.id === bookmarkId
            ? { ...bookmark, metadataStatus: "pending" }
            : bookmark
        )
      )
    },
    onTagsChange,
    onTitleChange,
  }

  return {
    bookmarkHandlers,
    bookmarks,
    collectionHandlers: {
      onCreateCollection,
      onDeleteCollection,
      onMoveCollection: (sourceId, parentId, index) => {
        setCollections((currentCollections) => {
          const result = moveCollection(
            currentCollections,
            sourceId,
            parentId,
            index
          )
          return result.ok ? result.collections : currentCollections
        })
      },
      onUpdateCollection,
    },
    collections,
    setBookmarks,
    tagHandlers: {
      onCreateTag,
      onDeleteTag,
      onMoveTag: (sourceId, index) => {
        setTags((currentTags) => moveTag(currentTags, sourceId, index))
      },
      onUpdateTag,
    },
    tags,
  }
}
