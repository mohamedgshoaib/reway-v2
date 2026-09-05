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
import { useDeferredOverlayClose } from "@/components/ui/use-deferred-overlay-close"
import { AppearanceColorPicker } from "@/dev/dashboard-ui/appearance-color-picker"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { TagIcon } from "@/dev/dashboard-ui/tag-icon"
import {
  getLeastUsedTagColor,
  getTagNameError,
  normalizeTagName,
  type Tag,
  type TagColor,
  type TagDraft,
  type TagPaletteColor,
} from "@/dev/dashboard-ui/tag-model"

export type TagEditorRequest =
  | {
      draft?: TagDraft
      mode: "create"
      retryTagId?: string
      saveError?: string
    }
  | { draft?: TagDraft; mode: "edit"; saveError?: string; tagId: string }

function TagForm({
  initialDraft,
  onCancel,
  onDirtyChange,
  onSubmit,
  saveError,
  tag,
  tags,
}: {
  initialDraft?: TagDraft
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (draft: TagDraft) => void
  saveError?: string
  tag?: Tag
  tags: readonly Tag[]
}): React.ReactElement {
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const startingDraft: TagDraft = initialDraft ?? {
    color: tag?.color ?? {
      kind: "palette",
      value: getLeastUsedTagColor(tags),
    },
    name: tag?.name ?? "",
  }
  const [name, setName] = React.useState(startingDraft.name)
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [color, setColor] = React.useState<TagColor>(startingDraft.color)
  const [saveErrorMessage, setSaveErrorMessage] = React.useState(saveError)
  const nameError = getTagNameError(tags, name, tag?.id)
  const showNameError = Boolean(nameError && submitAttempted)
  const updateDirty = (nextDraft: TagDraft): void => {
    onDirtyChange(
      nextDraft.name !== startingDraft.name ||
        nextDraft.color.kind !== startingDraft.color.kind ||
        nextDraft.color.value !== startingDraft.color.value
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

        onSubmit({ color, name: normalizeTagName(name) })
      }}
    >
      <DialogPanel className="grid gap-4">
        {saveErrorMessage ? (
          <p className="text-sm text-destructive-foreground" role="alert">
            {saveErrorMessage}
          </p>
        ) : null}
        <Field invalid={showNameError}>
          <FieldLabel htmlFor="tag-name">Name</FieldLabel>
          <Input
            aria-describedby={showNameError ? "tag-name-error" : undefined}
            aria-invalid={showNameError || undefined}
            id="tag-name"
            maxLength={24}
            onChange={(event) => {
              const nextName = event.target.value
              setName(nextName)
              updateDirty({ color, name: nextName })
            }}
            placeholder="Tag name"
            ref={nameInputRef}
            value={name}
          />
          {showNameError ? (
            <FieldError id="tag-name-error" match>
              {nameError}
            </FieldError>
          ) : null}
        </Field>
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="text-base/4.5 font-medium sm:text-sm/4">
            Color
          </FieldsetLegend>
          <AppearanceColorPicker
            onValueChange={(value: TagPaletteColor) => {
              const nextColor = { kind: "palette", value } as const
              setColor(nextColor)
              updateDirty({ color: nextColor, name })
            }}
            renderIcon={(value) => (
              <TagIcon className="size-5" color={{ kind: "palette", value }} />
            )}
            value={color.value}
          />
        </Fieldset>
      </DialogPanel>
      <DialogFooter>
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button type="submit">{tag ? "Save" : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}

export function TagEditorDialog({
  onCreate,
  onOpenChange,
  onRetryRequest,
  onUpdate,
  request,
  tags,
}: {
  onCreate: (
    draft: TagDraft,
    reopenDraft?: (saveError: string, tagId: string) => void,
    retryTagId?: string
  ) => void
  onOpenChange: (open: boolean) => void
  onRetryRequest: (request: TagEditorRequest) => void
  onUpdate: (
    tagId: string,
    draft: TagDraft,
    reopenDraft?: (saveError: string) => void
  ) => void
  request: TagEditorRequest | null
  tags: readonly Tag[]
}): React.ReactElement {
  const [dirty, setDirty] = React.useState(false)
  const tag =
    request?.mode === "edit"
      ? tags.find((candidate) => candidate.id === request.tagId)
      : undefined
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
          <DialogTitle>{tag ? "Edit tag" : "New tag"}</DialogTitle>
        </DialogHeader>
        {request ? (
          <TagForm
            initialDraft={request.draft}
            key={request.mode === "edit" ? request.tagId : "create"}
            onCancel={overlay.requestClose}
            onDirtyChange={setDirty}
            onSubmit={(draft) => {
              if (request.mode === "edit") {
                onUpdate(request.tagId, draft, (saveError) =>
                  onRetryRequest({
                    draft,
                    mode: "edit",
                    saveError,
                    tagId: request.tagId,
                  })
                )
              } else {
                onCreate(
                  draft,
                  (saveError, tagId) =>
                    onRetryRequest({
                      draft,
                      mode: "create",
                      retryTagId: tagId,
                      saveError,
                    }),
                  request.retryTagId
                )
              }
              overlay.requestClose()
            }}
            saveError={request.saveError}
            tag={tag}
            tags={tags}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  )
}

export function TagDeleteDialog({
  bookmarks,
  onDelete,
  onOpenChange,
  onRetryRequest,
  tagId,
  tags,
}: {
  bookmarks: readonly MockBookmark[]
  onDelete: (tagId: string, reopenDelete?: () => void) => Promise<boolean>
  onOpenChange: (open: boolean) => void
  onRetryRequest: (tagId: string) => void
  tagId: string | null
  tags: readonly Tag[]
}): React.ReactElement {
  const [{ bookmarkCount, tag }] = React.useState(() => {
    const initialTag = tags.find((candidate) => candidate.id === tagId)
    return {
      bookmarkCount: initialTag
        ? bookmarks.filter((bookmark) => bookmark.tags?.includes(initialTag.id))
            .length
        : 0,
      tag: initialTag,
    }
  })
  const [pending, setPending] = React.useState(false)
  const deleteRequestRef = React.useRef(0)
  const overlay = useDeferredOverlayClose({
    onClosed: () => onOpenChange(false),
    open: tagId !== null && tag !== undefined,
  })
  const handleDelete = async (): Promise<void> => {
    if (!tag || pending) return
    const requestId = deleteRequestRef.current + 1
    deleteRequestRef.current = requestId
    setPending(true)
    try {
      await onDelete(tag.id, () => onRetryRequest(tag.id))
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
          <AlertDialogTitle>Delete {tag?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This tag will be removed from {bookmarkCount}{" "}
            {bookmarkCount === 1 ? "bookmark" : "bookmarks"}. This cannot be
            undone.
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
            {pending ? "Deleting…" : "Delete tag"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
