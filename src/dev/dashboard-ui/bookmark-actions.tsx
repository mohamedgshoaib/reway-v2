"use client"

import {
  ArrowClockwiseIcon,
  ArrowUpRightIcon,
  CheckSquareOffsetIcon,
  CopyIcon,
  FolderIcon,
  PencilSimpleIcon,
  TagChevronIcon,
  TrashIcon,
} from "@phosphor-icons/react"
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
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerMenuTrigger,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
import { OverflowMenuIcon } from "@/components/ui/overflow-menu-icon"
import {
  BookmarkTrashActions,
  BookmarkTrashContextMenu,
  type BookmarkTrashActionHandlers,
} from "@/dev/dashboard-ui/bookmark-trash-actions"
import { getBookmarkUrl } from "@/dev/dashboard-ui/bookmark-url"
import {
  createCollectionIndex,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import type { BookmarkManagementHandlers } from "@/dev/dashboard-ui/dashboard-management-state"
import type { MockBookmark, MockTag } from "@/dev/dashboard-ui/mock-bookmarks"
import { TagIcon } from "@/dev/dashboard-ui/tag-icon"
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { useIsMobile } from "@/hooks/use-media-query"

export interface BookmarkActionHandlers
  extends BookmarkTrashActionHandlers, BookmarkManagementHandlers {
  onSelectChange: (bookmarkId: string, selected: boolean) => void
}

export type BookmarkActionsProps = BookmarkActionHandlers & {
  availableTags: readonly Tag[]
  bookmark: MockBookmark
  collections: readonly Collection[]
  isSelected: boolean
}

function TagEditor({
  availableTags,
  tags,
  onChange,
}: {
  availableTags: readonly Tag[]
  tags: string[]
  onChange: (tags: string[]) => void
}): React.ReactElement {
  const selectedTagValues = new Set(tags)
  const selectedTags = availableTags.filter((tag) =>
    selectedTagValues.has(tag.id)
  )

  return (
    <Combobox
      items={availableTags}
      multiple
      onValueChange={(value: MockTag[]) => onChange(value.map((tag) => tag.id))}
      value={selectedTags}
    >
      <ComboboxChips>
        <ComboboxValue>
          {(value: MockTag[]) => (
            <>
              {value.map((tag) => (
                <ComboboxChip aria-label={tag.name} key={tag.id}>
                  <TagIcon color={tag.color} />
                  {tag.name}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label="Search tags"
                placeholder={value.length > 0 ? undefined : "Search tags…"}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxPopup>
        <ComboboxEmpty>No tags found.</ComboboxEmpty>
        <ComboboxList>
          {(tag: MockTag) => (
            <ComboboxItem key={tag.id} value={tag}>
              <TagIcon color={tag.color} />
              {tag.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  )
}

function CollectionDrawer({
  collections,
  label,
  onSelect,
}: {
  collections: readonly Collection[]
  label: string
  onSelect: (collection: string) => void
}): React.ReactElement {
  const roots = createCollectionIndex(collections, [], "custom").roots
  const actionLabel = label.startsWith("Add") ? "Add to" : "Move to"

  return (
    <Drawer>
      <DrawerMenuTrigger>
        <FolderIcon aria-hidden="true" />
        {label}
      </DrawerMenuTrigger>
      <DrawerPopup showBar>
        <DrawerPanel>
          <DrawerMenu>
            <DrawerMenuGroup>
              <DrawerMenuGroupLabel>{label}</DrawerMenuGroupLabel>
              {roots.map((root) =>
                root.children.length > 0 ? (
                  <Drawer key={root.collection.id}>
                    <DrawerMenuTrigger>
                      <CollectionIcon
                        color={root.collection.color}
                        icon={root.collection.icon}
                      />
                      {root.collection.name}
                    </DrawerMenuTrigger>
                    <DrawerPopup showBar>
                      <DrawerHeader>
                        <DrawerTitle>{root.collection.name}</DrawerTitle>
                      </DrawerHeader>
                      <DrawerPanel>
                        <DrawerMenu>
                          <DrawerMenuGroup>
                            <DrawerClose
                              render={
                                <DrawerMenuItem
                                  onClick={() => onSelect(root.collection.id)}
                                />
                              }
                            >
                              <CollectionIcon
                                color={root.collection.color}
                                icon={root.collection.icon}
                              />
                              {actionLabel} {root.collection.name}
                            </DrawerClose>
                            <DrawerMenuSeparator />
                            {root.children.map((child) => (
                              <DrawerClose
                                key={child.collection.id}
                                render={
                                  <DrawerMenuItem
                                    onClick={() =>
                                      onSelect(child.collection.id)
                                    }
                                  />
                                }
                              >
                                <CollectionIcon
                                  color={child.collection.color}
                                  icon={child.collection.icon}
                                />
                                {child.collection.name}
                              </DrawerClose>
                            ))}
                          </DrawerMenuGroup>
                        </DrawerMenu>
                      </DrawerPanel>
                    </DrawerPopup>
                  </Drawer>
                ) : (
                  <DrawerClose
                    key={root.collection.id}
                    render={
                      <DrawerMenuItem
                        onClick={() => onSelect(root.collection.id)}
                      />
                    }
                  >
                    <CollectionIcon
                      color={root.collection.color}
                      icon={root.collection.icon}
                    />
                    {root.collection.name}
                  </DrawerClose>
                )
              )}
            </DrawerMenuGroup>
          </DrawerMenu>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function CollectionMenuItems({
  collections,
  label,
  onSelect,
}: {
  collections: readonly Collection[]
  label: string
  onSelect: (collectionId: string) => void
}): React.ReactElement {
  const roots = createCollectionIndex(collections, [], "custom").roots
  const actionLabel = label.startsWith("Add") ? "Add to" : "Move to"

  return (
    <>
      {roots.map((root) =>
        root.children.length > 0 ? (
          <MenuSub key={root.collection.id}>
            <MenuSubTrigger openOnHover>
              <CollectionIcon
                color={root.collection.color}
                icon={root.collection.icon}
              />
              {root.collection.name}
            </MenuSubTrigger>
            <MenuSubPopup>
              <MenuItem onClick={() => onSelect(root.collection.id)}>
                <CollectionIcon
                  color={root.collection.color}
                  icon={root.collection.icon}
                />
                {actionLabel} {root.collection.name}
              </MenuItem>
              <MenuSeparator />
              {root.children.map((child) => (
                <MenuItem
                  key={child.collection.id}
                  onClick={() => onSelect(child.collection.id)}
                >
                  <CollectionIcon
                    color={child.collection.color}
                    icon={child.collection.icon}
                  />
                  {child.collection.name}
                </MenuItem>
              ))}
            </MenuSubPopup>
          </MenuSub>
        ) : (
          <MenuItem
            key={root.collection.id}
            onClick={() => onSelect(root.collection.id)}
          >
            <CollectionIcon
              color={root.collection.color}
              icon={root.collection.icon}
            />
            {root.collection.name}
          </MenuItem>
        )
      )}
    </>
  )
}

function ContextCollectionMenuItems({
  collections,
  label,
  onSelect,
}: {
  collections: readonly Collection[]
  label: string
  onSelect: (collectionId: string) => void
}): React.ReactElement {
  const roots = createCollectionIndex(collections, [], "custom").roots
  const actionLabel = label.startsWith("Add") ? "Add to" : "Move to"

  return (
    <>
      {roots.map((root) =>
        root.children.length > 0 ? (
          <ContextMenuSub key={root.collection.id}>
            <ContextMenuSubTrigger openOnHover>
              <CollectionIcon
                color={root.collection.color}
                icon={root.collection.icon}
              />
              {root.collection.name}
            </ContextMenuSubTrigger>
            <ContextMenuSubPopup>
              <ContextMenuItem onClick={() => onSelect(root.collection.id)}>
                <CollectionIcon
                  color={root.collection.color}
                  icon={root.collection.icon}
                />
                {actionLabel} {root.collection.name}
              </ContextMenuItem>
              <ContextMenuSeparator />
              {root.children.map((child) => (
                <ContextMenuItem
                  key={child.collection.id}
                  onClick={() => onSelect(child.collection.id)}
                >
                  <CollectionIcon
                    color={child.collection.color}
                    icon={child.collection.icon}
                  />
                  {child.collection.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubPopup>
          </ContextMenuSub>
        ) : (
          <ContextMenuItem
            key={root.collection.id}
            onClick={() => onSelect(root.collection.id)}
          >
            <CollectionIcon
              color={root.collection.color}
              icon={root.collection.icon}
            />
            {root.collection.name}
          </ContextMenuItem>
        )
      )}
    </>
  )
}

function BookmarkActionDialogs({
  availableTags,
  bookmark,
  deleteOpen,
  editOpen,
  editSaveError,
  editTitle,
  onDelete,
  onDialogClosed,
  onTagsChange,
  onTitleChange,
  setEditSaveError,
  setDeleteOpen,
  setEditOpen,
  setEditTitle,
  setTagsOpen,
  setTagsSaveError,
  setTagDraft,
  showTagsDialog,
  tagDraft,
  tagsSaveError,
  tagsOpen,
}: {
  availableTags: readonly Tag[]
  bookmark: MockBookmark
  deleteOpen: boolean
  editOpen: boolean
  editSaveError: string | null
  editTitle: string
  onDelete: (bookmarkId: string) => void
  onDialogClosed: () => void
  onTagsChange: BookmarkManagementHandlers["onTagsChange"]
  onTitleChange: BookmarkManagementHandlers["onTitleChange"]
  setEditSaveError: React.Dispatch<React.SetStateAction<string | null>>
  setDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEditTitle: React.Dispatch<React.SetStateAction<string>>
  setTagsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTagsSaveError: React.Dispatch<React.SetStateAction<string | null>>
  setTagDraft: React.Dispatch<React.SetStateAction<string[]>>
  showTagsDialog: boolean
  tagDraft: string[]
  tagsSaveError: string | null
  tagsOpen: boolean
}): React.ReactElement {
  const editTitleErrorId = `bookmark-title-error-${bookmark.id}`
  const editTitleRef = React.useRef<HTMLInputElement>(null)
  const [editTitleError, setEditTitleError] = React.useState<string | null>(
    null
  )

  const saveEdit = () => {
    const title = editTitle.trim()
    if (!title) {
      setEditTitleError("Enter a title.")
      editTitleRef.current?.focus()
      return
    }

    onTitleChange(bookmark.id, title, (saveError) => {
      setEditTitle(title)
      setEditSaveError(saveError)
      setEditOpen(true)
    })
    setEditTitleError(null)
    setEditSaveError(null)
    setEditOpen(false)
  }

  return (
    <>
      <AlertDialog
        onOpenChange={setDeleteOpen}
        onOpenChangeComplete={(open) => {
          if (!open) onDialogClosed()
        }}
        open={deleteOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              "{bookmark.title}" will move to Trash. You can restore it for 30
              days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() => onDelete(bookmark.id)}
            >
              Delete bookmark
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      <Dialog
        disablePointerDismissal={editTitle.trim() !== bookmark.title}
        onOpenChange={(open, eventDetails) => {
          if (
            !open &&
            editTitle.trim() !== bookmark.title &&
            eventDetails.reason === "outside-press"
          ) {
            eventDetails.cancel()
            return
          }
          setEditOpen(open)
          if (!open) {
            setEditTitleError(null)
            setEditSaveError(null)
          }
        }}
        onOpenChangeComplete={(open) => {
          if (!open) onDialogClosed()
        }}
        open={editOpen}
      >
        <DialogPopup className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit bookmark</DialogTitle>
          </DialogHeader>
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              saveEdit()
            }}
          >
            <DialogPanel>
              {editSaveError ? (
                <p
                  className="mb-4 text-sm text-destructive-foreground"
                  role="alert"
                >
                  {editSaveError}
                </p>
              ) : null}
              <label
                className="grid gap-2 text-sm font-medium text-foreground"
                htmlFor={`bookmark-title-${bookmark.id}`}
              >
                Title
                <Input
                  aria-describedby={
                    editTitleError ? editTitleErrorId : undefined
                  }
                  aria-invalid={editTitleError ? true : undefined}
                  id={`bookmark-title-${bookmark.id}`}
                  name="title"
                  onChange={(event) => {
                    setEditTitle(event.target.value)
                    setEditSaveError(null)
                    if (editTitleError && event.target.value.trim()) {
                      setEditTitleError(null)
                    }
                  }}
                  ref={editTitleRef}
                  value={editTitle}
                />
                {editTitleError ? (
                  <span
                    className="text-sm font-normal text-destructive-foreground"
                    id={editTitleErrorId}
                  >
                    {editTitleError}
                  </span>
                ) : null}
              </label>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
      {showTagsDialog ? (
        <Dialog
          onOpenChange={(open) => {
            setTagsOpen(open)
            if (!open) setTagsSaveError(null)
          }}
          onOpenChangeComplete={(open) => {
            if (!open) onDialogClosed()
          }}
          open={tagsOpen}
        >
          <DialogPopup className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Tags</DialogTitle>
            </DialogHeader>
            <DialogPanel>
              {tagsSaveError ? (
                <p
                  className="mb-4 text-sm text-destructive-foreground"
                  role="alert"
                >
                  {tagsSaveError}
                </p>
              ) : null}
              <TagEditor
                availableTags={availableTags}
                onChange={(nextTags) => {
                  setTagDraft(nextTags)
                  setTagsSaveError(null)
                  onTagsChange(
                    bookmark.id,
                    nextTags,
                    (retryTags, saveError) => {
                      setTagDraft([...retryTags])
                      setTagsSaveError(saveError)
                      setTagsOpen(true)
                    }
                  )
                }}
                tags={tagDraft}
              />
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      ) : null}
    </>
  )
}

interface BookmarkActionVariantProps {
  actions: BookmarkActionsProps
  dialogs: React.ReactNode
  onOpenDelete: () => void
  onOpenEdit: () => void
  onOpenTags: () => void
  trigger: React.ReactElement
}

interface MobileBookmarkActionsProps extends BookmarkActionVariantProps {
  onTagsOpenChange: (open: boolean) => void
  tagEditor: React.ReactNode
  tagsOpen: boolean
}

function MobileBookmarkActions({
  actions,
  dialogs,
  onOpenDelete,
  onOpenEdit,
  onTagsOpenChange,
  tagEditor,
  tagsOpen,
  trigger,
}: MobileBookmarkActionsProps): React.ReactElement {
  const {
    bookmark,
    collections,
    isSelected,
    onAddToCollection,
    onMoveToCollection,
    onReenrich,
    onSelectChange,
  } = actions

  const openBookmark = (): void => {
    window.open(getBookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
  }
  const copyLink = (): void => {
    void navigator.clipboard?.writeText(getBookmarkUrl(bookmark))
  }

  return (
    <>
      <Drawer>
        <DrawerTrigger render={trigger} />
        <DrawerPopup showBar>
          <DrawerPanel>
            <DrawerMenu>
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Bookmark</DrawerMenuGroupLabel>
                <DrawerClose render={<DrawerMenuItem onClick={openBookmark} />}>
                  <ArrowUpRightIcon aria-hidden="true" weight="regular" />
                  Open in new tab
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem onClick={copyLink} />}>
                  <CopyIcon aria-hidden="true" weight="duotone" />
                  Copy link
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem onClick={onOpenEdit} />}>
                  <PencilSimpleIcon aria-hidden="true" weight="duotone" />
                  Edit
                </DrawerClose>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Organize</DrawerMenuGroupLabel>
                <Drawer onOpenChange={onTagsOpenChange} open={tagsOpen}>
                  <DrawerMenuTrigger>
                    <TagChevronIcon aria-hidden="true" weight="duotone" />
                    Tags
                  </DrawerMenuTrigger>
                  <DrawerPopup showBar>
                    <DrawerHeader>
                      <DrawerTitle>Tags</DrawerTitle>
                    </DrawerHeader>
                    <DrawerPanel>{tagEditor}</DrawerPanel>
                    <DrawerFooter>
                      <DrawerClose render={<Button />}>Done</DrawerClose>
                    </DrawerFooter>
                  </DrawerPopup>
                </Drawer>
                <CollectionDrawer
                  collections={collections}
                  label="Add to collection"
                  onSelect={(collectionId) =>
                    onAddToCollection(bookmark.id, collectionId)
                  }
                />
                <CollectionDrawer
                  collections={collections}
                  label="Move to collection"
                  onSelect={(collectionId) =>
                    onMoveToCollection(bookmark.id, collectionId)
                  }
                />
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerClose
                  render={
                    <DrawerMenuItem
                      onClick={() => onSelectChange(bookmark.id, !isSelected)}
                    />
                  }
                >
                  <CheckSquareOffsetIcon aria-hidden="true" weight="regular" />
                  {isSelected ? "Remove from selection" : "Select"}
                </DrawerClose>
                <DrawerClose
                  render={
                    <DrawerMenuItem onClick={() => onReenrich(bookmark.id)} />
                  }
                >
                  <ArrowClockwiseIcon aria-hidden="true" weight="duotone" />
                  Re-enrich
                </DrawerClose>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Danger</DrawerMenuGroupLabel>
                <DrawerClose
                  render={
                    <DrawerMenuItem
                      onClick={onOpenDelete}
                      variant="destructive"
                    />
                  }
                >
                  <TrashIcon aria-hidden="true" weight="duotone" />
                  Delete
                </DrawerClose>
              </DrawerMenuGroup>
            </DrawerMenu>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
      {dialogs}
    </>
  )
}

function DesktopBookmarkActions({
  actions,
  dialogs,
  onOpenDelete,
  onOpenEdit,
  onOpenTags,
  trigger,
}: BookmarkActionVariantProps): React.ReactElement {
  const {
    bookmark,
    collections,
    isSelected,
    onAddToCollection,
    onMoveToCollection,
    onReenrich,
    onSelectChange,
  } = actions

  const openBookmark = (): void => {
    window.open(getBookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
  }
  const copyLink = (): void => {
    void navigator.clipboard?.writeText(getBookmarkUrl(bookmark))
  }

  return (
    <>
      <Menu>
        <MenuTrigger render={trigger} />
        <MenuPopup align="end">
          <MenuGroup>
            <MenuGroupLabel>Bookmark</MenuGroupLabel>
            <MenuItem onClick={openBookmark}>
              <ArrowUpRightIcon aria-hidden="true" weight="regular" />
              Open in new tab
            </MenuItem>
            <MenuItem onClick={copyLink}>
              <CopyIcon aria-hidden="true" weight="duotone" />
              Copy link
            </MenuItem>
            <MenuItem onClick={onOpenEdit}>
              <PencilSimpleIcon aria-hidden="true" weight="duotone" />
              Edit
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Organize</MenuGroupLabel>
            <MenuItem onClick={onOpenTags}>
              <TagChevronIcon aria-hidden="true" weight="duotone" />
              Tags
            </MenuItem>
            <MenuSub>
              <MenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Add to collection
              </MenuSubTrigger>
              <MenuSubPopup>
                <CollectionMenuItems
                  collections={collections}
                  label="Add to collection"
                  onSelect={(collectionId) =>
                    onAddToCollection(bookmark.id, collectionId)
                  }
                />
              </MenuSubPopup>
            </MenuSub>
            <MenuSub>
              <MenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Move to collection
              </MenuSubTrigger>
              <MenuSubPopup>
                <CollectionMenuItems
                  collections={collections}
                  label="Move to collection"
                  onSelect={(collectionId) =>
                    onMoveToCollection(bookmark.id, collectionId)
                  }
                />
              </MenuSubPopup>
            </MenuSub>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuItem onClick={() => onSelectChange(bookmark.id, !isSelected)}>
              <CheckSquareOffsetIcon aria-hidden="true" weight="regular" />
              {isSelected ? "Remove from selection" : "Select"}
            </MenuItem>
            <MenuItem onClick={() => onReenrich(bookmark.id)}>
              <ArrowClockwiseIcon aria-hidden="true" weight="duotone" />
              Re-enrich
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Danger</MenuGroupLabel>
            <MenuItem onClick={onOpenDelete} variant="destructive">
              <TrashIcon aria-hidden="true" weight="duotone" />
              Delete
            </MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>
      {dialogs}
    </>
  )
}

export function BookmarkActions({
  availableTags,
  bookmark,
  collections,
  isSelected,
  onAddToCollection,
  onDelete,
  onDeleteForever,
  onMoveToCollection,
  onReenrich,
  onRestore,
  onSelectChange,
  onTagsChange,
  onTitleChange,
}: BookmarkActionsProps): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaveError, setEditSaveError] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState(bookmark.title)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const [tagDraft, setTagDraft] = React.useState(bookmark.tags ?? [])
  const [tagsSaveError, setTagsSaveError] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const tags = bookmark.tags ?? []

  const restoreActionFocus = (): void => {
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const openEdit = () => {
    setEditTitle(bookmark.title)
    setEditSaveError(null)
    setEditOpen(true)
  }

  const openTags = () => {
    setTagDraft(tags)
    setTagsSaveError(null)
    setTagsOpen(true)
  }

  const dialogs = (
    <BookmarkActionDialogs
      availableTags={availableTags}
      bookmark={bookmark}
      deleteOpen={deleteOpen}
      editOpen={editOpen}
      editSaveError={editSaveError}
      editTitle={editTitle}
      onDelete={onDelete}
      onDialogClosed={restoreActionFocus}
      onTagsChange={onTagsChange}
      onTitleChange={onTitleChange}
      setEditSaveError={setEditSaveError}
      setDeleteOpen={setDeleteOpen}
      setEditOpen={setEditOpen}
      setEditTitle={setEditTitle}
      setTagsOpen={setTagsOpen}
      setTagsSaveError={setTagsSaveError}
      setTagDraft={setTagDraft}
      showTagsDialog={!isMobile}
      tagDraft={tagDraft}
      tagsSaveError={tagsSaveError}
      tagsOpen={tagsOpen}
    />
  )

  const trigger = (
    <Button
      aria-label={`Actions for ${bookmark.title}${isSelected ? ", selected" : ""}`}
      className="transition-opacity duration-100 data-popup-open:opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/bookmark:opacity-100 min-[800px]:pointer-fine:group-has-focus-visible/bookmark:opacity-100"
      data-bookmark-actions={bookmark.id}
      ref={triggerRef}
      size="icon-xs"
      variant="ghost"
    >
      <OverflowMenuIcon />
    </Button>
  )

  if (bookmark.trashedAt !== undefined) {
    return (
      <BookmarkTrashActions
        bookmark={bookmark}
        isSelected={isSelected}
        onDeleteForever={onDeleteForever}
        onRestore={onRestore}
        onSelectChange={onSelectChange}
      />
    )
  }

  const actions: BookmarkActionsProps = {
    availableTags,
    bookmark,
    collections,
    isSelected,
    onAddToCollection,
    onDelete,
    onDeleteForever,
    onMoveToCollection,
    onReenrich,
    onRestore,
    onSelectChange,
    onTagsChange,
    onTitleChange,
  }
  const onTagsOpenChange = (open: boolean): void => {
    if (open) {
      setTagDraft(tags)
      setTagsSaveError(null)
    } else {
      restoreActionFocus()
    }
    setTagsOpen(open)
  }
  const tagEditor = (
    <>
      {tagsSaveError ? (
        <p
          className="px-4 pb-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {tagsSaveError}
        </p>
      ) : null}
      <TagEditor
        availableTags={availableTags}
        onChange={(nextTags) => {
          setTagDraft(nextTags)
          setTagsSaveError(null)
          onTagsChange(bookmark.id, nextTags, (retryTags, saveError) => {
            setTagDraft([...retryTags])
            setTagsSaveError(saveError)
            setTagsOpen(true)
          })
        }}
        tags={tagDraft}
      />
    </>
  )

  if (isMobile) {
    return (
      <MobileBookmarkActions
        actions={actions}
        dialogs={dialogs}
        onOpenDelete={() => setDeleteOpen(true)}
        onOpenEdit={openEdit}
        onOpenTags={openTags}
        onTagsOpenChange={onTagsOpenChange}
        tagEditor={tagEditor}
        tagsOpen={tagsOpen}
        trigger={trigger}
      />
    )
  }

  return (
    <DesktopBookmarkActions
      actions={actions}
      dialogs={dialogs}
      onOpenDelete={() => setDeleteOpen(true)}
      onOpenEdit={openEdit}
      onOpenTags={openTags}
      trigger={trigger}
    />
  )
}

export function BookmarkContextMenu({
  availableTags,
  bookmark,
  children,
  collections,
  isSelected,
  onAddToCollection,
  onDelete,
  onDeleteForever,
  onMoveToCollection,
  onReenrich,
  onRestore,
  onSelectChange,
  onTagsChange,
  onTitleChange,
}: BookmarkActionsProps & {
  children: React.ReactNode
}): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaveError, setEditSaveError] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState(bookmark.title)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const [tagDraft, setTagDraft] = React.useState(bookmark.tags ?? [])
  const [tagsSaveError, setTagsSaveError] = React.useState<string | null>(null)
  const tags = bookmark.tags ?? []

  const restoreActionFocus = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-bookmark-actions="${CSS.escape(bookmark.id)}"]`
        )
        ?.focus()
    })
  }

  if (bookmark.trashedAt !== undefined) {
    return (
      <BookmarkTrashContextMenu
        bookmark={bookmark}
        isSelected={isSelected}
        onDeleteForever={onDeleteForever}
        onRestore={onRestore}
        onSelectChange={onSelectChange}
      >
        {children}
      </BookmarkTrashContextMenu>
    )
  }

  if (isMobile) return <>{children}</>

  const openBookmark = () => {
    window.open(getBookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
  }

  const copyLink = () => {
    void navigator.clipboard?.writeText(getBookmarkUrl(bookmark))
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Bookmark</ContextMenuGroupLabel>
            <ContextMenuItem onClick={openBookmark}>
              <ArrowUpRightIcon aria-hidden="true" weight="regular" />
              Open in new tab
            </ContextMenuItem>
            <ContextMenuItem onClick={copyLink}>
              <CopyIcon aria-hidden="true" weight="duotone" />
              Copy link
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setEditTitle(bookmark.title)
                setEditSaveError(null)
                setEditOpen(true)
              }}
            >
              <PencilSimpleIcon aria-hidden="true" weight="duotone" />
              Edit
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Organize</ContextMenuGroupLabel>
            <ContextMenuItem
              onClick={() => {
                setTagDraft(tags)
                setTagsSaveError(null)
                setTagsOpen(true)
              }}
            >
              <TagChevronIcon aria-hidden="true" weight="duotone" />
              Tags
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Add to collection
              </ContextMenuSubTrigger>
              <ContextMenuSubPopup>
                <ContextCollectionMenuItems
                  collections={collections}
                  label="Add to collection"
                  onSelect={(collectionId) =>
                    onAddToCollection(bookmark.id, collectionId)
                  }
                />
              </ContextMenuSubPopup>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Move to collection
              </ContextMenuSubTrigger>
              <ContextMenuSubPopup>
                <ContextCollectionMenuItems
                  collections={collections}
                  label="Move to collection"
                  onSelect={(collectionId) =>
                    onMoveToCollection(bookmark.id, collectionId)
                  }
                />
              </ContextMenuSubPopup>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem
              onClick={() => onSelectChange(bookmark.id, !isSelected)}
            >
              <CheckSquareOffsetIcon aria-hidden="true" weight="regular" />
              {isSelected ? "Remove from selection" : "Select"}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onReenrich(bookmark.id)}>
              <ArrowClockwiseIcon aria-hidden="true" weight="duotone" />
              Re-enrich
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Danger</ContextMenuGroupLabel>
            <ContextMenuItem
              onClick={() => setDeleteOpen(true)}
              variant="destructive"
            >
              <TrashIcon aria-hidden="true" weight="duotone" />
              Delete
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuPopup>
      </ContextMenu>
      <BookmarkActionDialogs
        availableTags={availableTags}
        bookmark={bookmark}
        deleteOpen={deleteOpen}
        editOpen={editOpen}
        editSaveError={editSaveError}
        editTitle={editTitle}
        onDelete={onDelete}
        onDialogClosed={restoreActionFocus}
        onTagsChange={onTagsChange}
        onTitleChange={onTitleChange}
        setEditSaveError={setEditSaveError}
        setDeleteOpen={setDeleteOpen}
        setEditOpen={setEditOpen}
        setEditTitle={setEditTitle}
        setTagsOpen={setTagsOpen}
        setTagsSaveError={setTagsSaveError}
        setTagDraft={setTagDraft}
        showTagsDialog
        tagDraft={tagDraft}
        tagsSaveError={tagsSaveError}
        tagsOpen={tagsOpen}
      />
    </>
  )
}
