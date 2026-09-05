"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeferredOverlayClose } from "@/components/ui/use-deferred-overlay-close"
import { AppearanceColorPicker } from "@/dev/dashboard-ui/appearance-color-picker"
import {
  getCollectionDeletion,
  getCollectionColor,
  getCollectionNameError,
  normalizeCollectionName,
  type Collection,
  type CollectionColor,
  type CollectionIconName,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

const LazyCollectionIconPicker = React.lazy(
  () => import("@/dev/dashboard-ui/collection-icon-picker")
)

export interface CollectionDraft {
  color: CollectionColor
  icon: CollectionIconName
  name: string
  parentId: string | null
}

export type CollectionEditorRequest =
  | {
      draft?: CollectionDraft
      mode: "create"
      parentId: string | null
      retryCollectionId?: string
      saveError?: string
    }
  | {
      collectionId: string
      draft?: CollectionDraft
      mode: "edit"
      saveError?: string
    }

const TOP_LEVEL_VALUE = "__top_level__"

function CollectionIconPickerFallback(): React.ReactElement {
  return (
    <output
      aria-label="Loading collection icons"
      className="h-9 animate-pulse rounded-lg border bg-muted/50 sm:h-8"
    />
  )
}

function CollectionForm({
  collection,
  collections,
  initialDraft,
  initialParentId,
  onCancel,
  onDirtyChange,
  onSubmit,
  saveError,
}: {
  collection?: Collection
  collections: readonly Collection[]
  initialDraft?: CollectionDraft
  initialParentId: string | null
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (draft: CollectionDraft) => void
  saveError?: string
}): React.ReactElement {
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const startingDraft: CollectionDraft = initialDraft ?? {
    color: getCollectionColor(collection ?? {}),
    icon: collection?.icon ?? "folder",
    name: collection?.name ?? "",
    parentId: collection?.parentId ?? initialParentId,
  }
  const [name, setName] = React.useState(startingDraft.name)
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [icon, setIcon] = React.useState<CollectionIconName>(startingDraft.icon)
  const [color, setColor] = React.useState<CollectionColor>(startingDraft.color)
  const [parentId, setParentId] = React.useState(startingDraft.parentId)
  const [saveErrorMessage, setSaveErrorMessage] = React.useState(saveError)
  const collectionHasChildren = collection
    ? collections.some((candidate) => candidate.parentId === collection.id)
    : false
  const validParents = collections.filter(
    (candidate) =>
      candidate.parentId === null &&
      candidate.id !== collection?.id &&
      !collectionHasChildren
  )
  const parentLabels = Object.fromEntries([
    [TOP_LEVEL_VALUE, "Top level"],
    ...validParents.map((parent) => [parent.id, parent.name]),
  ])
  const nameError = getCollectionNameError(collections, name, collection?.id)
  const showNameError = Boolean(nameError && submitAttempted)
  const updateDirty = (nextDraft: CollectionDraft): void => {
    onDirtyChange(
      nextDraft.name !== startingDraft.name ||
        nextDraft.icon !== startingDraft.icon ||
        nextDraft.color.kind !== startingDraft.color.kind ||
        nextDraft.color.value !== startingDraft.color.value ||
        nextDraft.parentId !== startingDraft.parentId
    )
    setSaveErrorMessage(undefined)
  }

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitAttempted(true)
        if (nameError) {
          nameInputRef.current?.focus()
          return
        }

        onSubmit({
          color,
          icon,
          name: normalizeCollectionName(name),
          parentId,
        })
      }}
    >
      <DialogPanel className="grid gap-4">
        {saveErrorMessage ? (
          <p className="text-sm text-destructive-foreground" role="alert">
            {saveErrorMessage}
          </p>
        ) : null}
        <Field invalid={showNameError}>
          <FieldLabel htmlFor="collection-name">Name</FieldLabel>
          <Input
            aria-describedby={
              showNameError ? "collection-name-error" : undefined
            }
            aria-invalid={showNameError || undefined}
            id="collection-name"
            maxLength={24}
            onChange={(event) => {
              const nextName = event.target.value
              setName(nextName)
              updateDirty({ color, icon, name: nextName, parentId })
            }}
            placeholder="Collection name"
            ref={nameInputRef}
            value={name}
          />
          {showNameError ? (
            <FieldError id="collection-name-error" match>
              {nameError}
            </FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="collection-icon">Icon</FieldLabel>
          <React.Suspense fallback={<CollectionIconPickerFallback />}>
            <LazyCollectionIconPicker
              color={color}
              onSelect={(nextIcon) => {
                setIcon(nextIcon)
                updateDirty({ color, icon: nextIcon, name, parentId })
              }}
              selectedIcon={icon}
            />
          </React.Suspense>
        </Field>
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="text-base/4.5 font-medium sm:text-sm/4">
            Color
          </FieldsetLegend>
          <AppearanceColorPicker
            onValueChange={(value) => {
              const nextColor = { kind: "palette", value } as const
              setColor(nextColor)
              updateDirty({ color: nextColor, icon, name, parentId })
            }}
            renderIcon={(value) => (
              <CollectionIcon
                className="size-6"
                color={{ kind: "palette", value }}
                icon={icon}
              />
            )}
            value={color.value}
          />
        </Fieldset>
        <Field>
          <FieldLabel>Parent collection</FieldLabel>
          <Select
            disabled={collectionHasChildren}
            items={parentLabels}
            onValueChange={(value) => {
              const nextParentId = value === TOP_LEVEL_VALUE ? null : value
              setParentId(nextParentId)
              updateDirty({
                color,
                icon,
                name,
                parentId: nextParentId,
              })
            }}
            value={parentId ?? TOP_LEVEL_VALUE}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={TOP_LEVEL_VALUE}>
                <CollectionIcon icon="folder" />
                Top level
              </SelectItem>
              {validParents.map((parent) => (
                <SelectItem key={parent.id} value={parent.id}>
                  <CollectionIcon color={parent.color} icon={parent.icon} />
                  {parent.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {collectionHasChildren ? (
            <span className="text-xs font-normal text-muted-foreground">
              Move its nested collections before assigning a parent.
            </span>
          ) : null}
        </Field>
      </DialogPanel>
      <DialogFooter>
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button type="submit">{collection ? "Save" : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}

export function CollectionEditorDialog({
  collections,
  onCreate,
  onOpenChange,
  onRetryRequest,
  onUpdate,
  request,
}: {
  collections: readonly Collection[]
  onCreate: (
    draft: CollectionDraft,
    reopenDraft?: (saveError: string, collectionId: string) => void,
    retryCollectionId?: string
  ) => void
  onOpenChange: (open: boolean) => void
  onRetryRequest: (request: CollectionEditorRequest) => void
  onUpdate: (
    collectionId: string,
    draft: CollectionDraft,
    reopenDraft?: (saveError: string) => void
  ) => void
  request: CollectionEditorRequest | null
}): React.ReactElement {
  const [dirty, setDirty] = React.useState(false)
  const collection =
    request?.mode === "edit"
      ? collections.find((candidate) => candidate.id === request.collectionId)
      : undefined
  const initialParentId =
    request?.mode === "create"
      ? request.parentId
      : (collection?.parentId ?? null)
  const overlay = useDeferredOverlayClose({
    onClosed: () => {
      setDirty(false)
      onOpenChange(false)
    },
    open: request !== null,
  })

  return (
    <Dialog
      disablePointerDismissal={dirty}
      onOpenChange={(open, eventDetails) => {
        if (!open && dirty && eventDetails.reason === "outside-press") {
          eventDetails.cancel()
          return
        }
        overlay.onOpenChange(open)
      }}
      onOpenChangeComplete={overlay.onOpenChangeComplete}
      open={overlay.open}
    >
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {collection ? "Edit collection" : "New collection"}
          </DialogTitle>
        </DialogHeader>
        {request ? (
          <CollectionForm
            collection={collection}
            collections={collections}
            initialDraft={request.draft}
            initialParentId={initialParentId}
            key={
              request.mode === "edit"
                ? `edit-${request.collectionId}`
                : `create-${request.parentId ?? "root"}`
            }
            onCancel={overlay.requestClose}
            onDirtyChange={setDirty}
            onSubmit={(draft) => {
              if (request.mode === "edit") {
                onUpdate(request.collectionId, draft, (saveError) =>
                  onRetryRequest({
                    collectionId: request.collectionId,
                    draft,
                    mode: "edit",
                    saveError,
                  })
                )
              } else {
                onCreate(
                  draft,
                  (saveError, collectionId) =>
                    onRetryRequest({
                      draft,
                      mode: "create",
                      parentId: draft.parentId,
                      retryCollectionId: collectionId,
                      saveError,
                    }),
                  request.retryCollectionId
                )
              }
              overlay.requestClose()
            }}
            saveError={request.saveError}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  )
}

export function CollectionDeleteDialog({
  bookmarks,
  collectionId,
  collections,
  onDelete,
  onOpenChange,
  onRetryRequest,
}: {
  bookmarks: readonly MockBookmark[]
  collectionId: string | null
  collections: readonly Collection[]
  onDelete: (
    collectionId: string,
    reopenDelete?: () => void
  ) => Promise<boolean>
  onOpenChange: (open: boolean) => void
  onRetryRequest: (collectionId: string) => void
}): React.ReactElement {
  const [{ collection, deletion }] = React.useState(() => {
    const initialCollection = collections.find(
      (candidate) => candidate.id === collectionId
    )
    return {
      collection: initialCollection,
      deletion: initialCollection
        ? getCollectionDeletion(collections, bookmarks, initialCollection.id)
        : null,
    }
  })
  const childCount = deletion ? deletion.deletedIds.size - 1 : 0
  const [pending, setPending] = React.useState(false)
  const deleteRequestRef = React.useRef(0)
  const overlay = useDeferredOverlayClose({
    onClosed: () => onOpenChange(false),
    open: collectionId !== null && collection !== undefined,
  })
  const handleDelete = async (): Promise<void> => {
    if (!collection || pending) return
    const requestId = deleteRequestRef.current + 1
    deleteRequestRef.current = requestId
    setPending(true)
    try {
      await onDelete(collection.id, () => onRetryRequest(collection.id))
    } finally {
      setPending((currentPending) =>
        deleteRequestRef.current === requestId ? false : currentPending
      )
      if (deleteRequestRef.current === requestId) overlay.requestClose()
    }
  }

  return (
    <AlertDialog
      onOpenChange={(open, eventDetails) => {
        if (!open && pending) {
          eventDetails.cancel()
          return
        }
        overlay.onOpenChange(open)
      }}
      onOpenChangeComplete={overlay.onOpenChangeComplete}
      open={overlay.open}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {collection?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {childCount > 0
              ? `${collection?.name} and its ${childCount} nested ${childCount === 1 ? "collection" : "collections"} will be permanently deleted. ${deletion?.exclusiveBookmarkCount ?? 0} bookmarks that exist only in these collections will move to Trash.`
              : `The collection cannot be restored. ${deletion?.exclusiveBookmarkCount ?? 0} bookmarks that exist only in this collection will move to Trash.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            render={<Button disabled={pending} variant="ghost" />}
          >
            Cancel
          </AlertDialogClose>
          <Button
            disabled={pending}
            onClick={() => void handleDelete()}
            type="button"
            variant="destructive"
          >
            {pending ? "Deleting…" : "Delete collection"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
