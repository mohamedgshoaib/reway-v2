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
  | { mode: "create" }
  | { mode: "edit"; tagId: string }

function TagForm({
  onCancel,
  onSubmit,
  tag,
  tags,
}: {
  onCancel: () => void
  onSubmit: (draft: TagDraft) => void
  tag?: Tag
  tags: readonly Tag[]
}): React.ReactElement {
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const defaultColor: TagColor = tag?.color ?? {
    kind: "palette",
    value: getLeastUsedTagColor(tags),
  }
  const [name, setName] = React.useState(tag?.name ?? "")
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [color, setColor] = React.useState<TagColor>(defaultColor)
  const nameError = getTagNameError(tags, name, tag?.id)
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

        onSubmit({ color, name: normalizeTagName(name) })
      }}
    >
      <DialogPanel className="grid gap-4">
        <Field invalid={showNameError}>
          <FieldLabel htmlFor="tag-name">Name</FieldLabel>
          <Input
            aria-describedby={showNameError ? "tag-name-error" : undefined}
            aria-invalid={showNameError || undefined}
            id="tag-name"
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
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
            onValueChange={(value: TagPaletteColor) =>
              setColor({ kind: "palette", value })
            }
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
  onUpdate,
  request,
  tags,
}: {
  onCreate: (draft: TagDraft) => void
  onOpenChange: (open: boolean) => void
  onUpdate: (tagId: string, draft: TagDraft) => void
  request: TagEditorRequest | null
  tags: readonly Tag[]
}): React.ReactElement {
  const tag =
    request?.mode === "edit"
      ? tags.find((candidate) => candidate.id === request.tagId)
      : undefined
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
          <DialogTitle>{tag ? "Edit tag" : "New tag"}</DialogTitle>
        </DialogHeader>
        {request ? (
          <TagForm
            key={request.mode === "edit" ? request.tagId : "create"}
            onCancel={overlay.requestClose}
            onSubmit={(draft) => {
              if (request.mode === "edit") onUpdate(request.tagId, draft)
              else onCreate(draft)
              overlay.requestClose()
            }}
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
  tagId,
  tags,
}: {
  bookmarks: readonly MockBookmark[]
  onDelete: (tagId: string) => void
  onOpenChange: (open: boolean) => void
  tagId: string | null
  tags: readonly Tag[]
}): React.ReactElement {
  const tag = tags.find((candidate) => candidate.id === tagId)
  const bookmarkCount = tag
    ? bookmarks.filter((bookmark) => bookmark.tags?.includes(tag.id)).length
    : 0
  const [confirmedDeleteId, setConfirmedDeleteId] = React.useState<
    string | null
  >(null)
  const overlay = useDeferredOverlayClose({
    onClosed: () => {
      if (confirmedDeleteId) onDelete(confirmedDeleteId)
      setConfirmedDeleteId(null)
      onOpenChange(false)
    },
    open: tag !== undefined,
  })

  return (
    <AlertDialog
      onOpenChange={overlay.onOpenChange}
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
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            onClick={() => {
              if (tag) setConfirmedDeleteId(tag.id)
            }}
            render={<Button variant="destructive" />}
          >
            Delete
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
