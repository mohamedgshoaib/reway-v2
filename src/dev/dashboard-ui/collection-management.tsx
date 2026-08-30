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
  | { mode: "create"; parentId: string | null }
  | { collectionId: string; mode: "edit" }

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
  initialParentId,
  onCancel,
  onSubmit,
}: {
  collection?: Collection
  collections: readonly Collection[]
  initialParentId: string | null
  onCancel: () => void
  onSubmit: (draft: CollectionDraft) => void
}): React.ReactElement {
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState(collection?.name ?? "")
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [icon, setIcon] = React.useState<CollectionIconName>(
    collection?.icon ?? "folder"
  )
  const [color, setColor] = React.useState<CollectionColor>(() =>
    getCollectionColor(collection ?? {})
  )
  const [parentId, setParentId] = React.useState(
    collection?.parentId ?? initialParentId
  )
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
        <Field invalid={showNameError}>
          <FieldLabel htmlFor="collection-name">Name</FieldLabel>
          <Input
            aria-describedby={
              showNameError ? "collection-name-error" : undefined
            }
            aria-invalid={showNameError || undefined}
            id="collection-name"
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
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
              onSelect={setIcon}
              selectedIcon={icon}
            />
          </React.Suspense>
        </Field>
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="text-base/4.5 font-medium sm:text-sm/4">
            Color
          </FieldsetLegend>
          <AppearanceColorPicker
            onValueChange={(value) => setColor({ kind: "palette", value })}
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
            onValueChange={(value) =>
              setParentId(value === TOP_LEVEL_VALUE ? null : value)
            }
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
  onUpdate,
  request,
}: {
  collections: readonly Collection[]
  onCreate: (draft: CollectionDraft) => void
  onOpenChange: (open: boolean) => void
  onUpdate: (collectionId: string, draft: CollectionDraft) => void
  request: CollectionEditorRequest | null
}): React.ReactElement {
  const collection =
    request?.mode === "edit"
      ? collections.find((candidate) => candidate.id === request.collectionId)
      : undefined
  const initialParentId =
    request?.mode === "create"
      ? request.parentId
      : (collection?.parentId ?? null)
  const overlay = useDeferredOverlayClose({
    onClosed: () => onOpenChange(false),
    open: request !== null,
  })

  return (
    <Dialog
      onOpenChange={overlay.onOpenChange}
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
            initialParentId={initialParentId}
            key={
              request.mode === "edit"
                ? `edit-${request.collectionId}`
                : `create-${request.parentId ?? "root"}`
            }
            onCancel={overlay.requestClose}
            onSubmit={(draft) => {
              if (request.mode === "edit") {
                onUpdate(request.collectionId, draft)
              } else {
                onCreate(draft)
              }
              overlay.requestClose()
            }}
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
}: {
  bookmarks: readonly MockBookmark[]
  collectionId: string | null
  collections: readonly Collection[]
  onDelete: (collectionId: string) => void
  onOpenChange: (open: boolean) => void
}): React.ReactElement {
  const collection = collections.find(
    (candidate) => candidate.id === collectionId
  )
  const deletion = collection
    ? getCollectionDeletion(collections, bookmarks, collection.id)
    : null
  const childCount = deletion ? deletion.deletedIds.size - 1 : 0
  const [confirmedDeleteId, setConfirmedDeleteId] = React.useState<
    string | null
  >(null)
  const overlay = useDeferredOverlayClose({
    onClosed: () => {
      if (confirmedDeleteId) onDelete(confirmedDeleteId)
      setConfirmedDeleteId(null)
      onOpenChange(false)
    },
    open: collection !== undefined,
  })

  return (
    <AlertDialog
      onOpenChange={overlay.onOpenChange}
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
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            onClick={() => {
              if (collection) setConfirmedDeleteId(collection.id)
            }}
            render={<Button variant="destructive" />}
          >
            Delete collection
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
