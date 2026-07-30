"use client"

import {
  ArrowClockwiseIcon,
  ArrowUpRightIcon,
  CheckSquareOffsetIcon,
  CopyIcon,
  DotsThreeIcon,
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
import {
  mockCollections,
  mockTags,
  type MockBookmark,
  type MockTag,
} from "@/dev/dashboard-ui/mock-bookmarks"
import { useIsMobile } from "@/hooks/use-media-query"

export interface BookmarkActionHandlers {
  onAddToCollection: (bookmarkId: string, collection: string) => void
  onDelete: (bookmarkId: string) => void
  onMoveToCollection: (bookmarkId: string, collection: string) => void
  onReenrich: (bookmarkId: string) => void
  onSelectChange: (bookmarkId: string, selected: boolean) => void
  onTagsChange: (bookmarkId: string, tags: string[]) => void
  onTitleChange: (bookmarkId: string, title: string) => void
}

export type BookmarkActionsProps = BookmarkActionHandlers & {
  bookmark: MockBookmark
  isSelected: boolean
}

function bookmarkUrl(bookmark: MockBookmark): string {
  if (bookmark.title.startsWith("http")) return bookmark.title
  return `https://${bookmark.domain ?? "reway.page"}`
}

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}): React.ReactElement {
  const selectedTagValues = new Set(tags)
  const selectedTags = mockTags.filter((tag) =>
    selectedTagValues.has(tag.value)
  )

  return (
    <Combobox
      items={mockTags}
      multiple
      onValueChange={(value: MockTag[]) =>
        onChange(value.map((tag) => tag.value))
      }
      value={selectedTags}
    >
      <ComboboxChips>
        <ComboboxValue>
          {(value: MockTag[]) => (
            <>
              {value.map((tag) => (
                <ComboboxChip aria-label={tag.label} key={tag.value}>
                  {tag.label}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label="Search tags"
                placeholder={value.length > 0 ? undefined : "Search tags..."}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxPopup>
        <ComboboxEmpty>No tags found.</ComboboxEmpty>
        <ComboboxList>
          {(tag: MockTag) => (
            <ComboboxItem key={tag.value} value={tag}>
              {tag.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  )
}

function CollectionDrawer({
  label,
  onSelect,
}: {
  label: string
  onSelect: (collection: string) => void
}): React.ReactElement {
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
              {mockCollections.map((collection) => (
                <DrawerClose
                  key={collection.label}
                  render={
                    <DrawerMenuItem
                      onClick={() => onSelect(collection.label)}
                    />
                  }
                >
                  {collection.label}
                </DrawerClose>
              ))}
            </DrawerMenuGroup>
          </DrawerMenu>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function BookmarkActionDialogs({
  bookmark,
  deleteOpen,
  editOpen,
  editTitle,
  onDelete,
  onTagsChange,
  onTitleChange,
  setDeleteOpen,
  setEditOpen,
  setEditTitle,
  setTagsOpen,
  tags,
  tagsOpen,
}: {
  bookmark: MockBookmark
  deleteOpen: boolean
  editOpen: boolean
  editTitle: string
  onDelete: (bookmarkId: string) => void
  onTagsChange: (bookmarkId: string, tags: string[]) => void
  onTitleChange: (bookmarkId: string, title: string) => void
  setDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEditTitle: React.Dispatch<React.SetStateAction<string>>
  setTagsOpen: React.Dispatch<React.SetStateAction<boolean>>
  tags: string[]
  tagsOpen: boolean
}): React.ReactElement {
  const saveEdit = () => {
    const title = editTitle.trim()
    if (title) onTitleChange(bookmark.id, title)
    setEditOpen(false)
  }

  return (
    <>
      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              “{bookmark.title}” will move to Trash. You can restore it for 30
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
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      <Dialog onOpenChange={setEditOpen} open={editOpen}>
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
              <label
                className="grid gap-2 text-sm font-medium text-foreground"
                htmlFor={`bookmark-title-${bookmark.id}`}
              >
                Title
                <Input
                  id={`bookmark-title-${bookmark.id}`}
                  onChange={(event) => setEditTitle(event.target.value)}
                  value={editTitle}
                />
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
      <Dialog onOpenChange={setTagsOpen} open={tagsOpen}>
        <DialogPopup className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>
          </DialogHeader>
          <DialogPanel>
            <TagEditor
              onChange={(nextTags) => onTagsChange(bookmark.id, nextTags)}
              tags={tags}
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button />}>Done</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  )
}

export function BookmarkActions({
  bookmark,
  isSelected,
  onAddToCollection,
  onDelete,
  onMoveToCollection,
  onReenrich,
  onSelectChange,
  onTagsChange,
  onTitleChange,
}: BookmarkActionsProps): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(bookmark.title)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const tags = bookmark.tags ?? []

  const openEdit = () => {
    setEditTitle(bookmark.title)
    setEditOpen(true)
  }

  const openBookmark = () => {
    window.open(bookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
  }

  const copyLink = () => {
    void navigator.clipboard?.writeText(bookmarkUrl(bookmark))
  }

  const dialogs = (
    <BookmarkActionDialogs
      bookmark={bookmark}
      deleteOpen={deleteOpen}
      editOpen={editOpen}
      editTitle={editTitle}
      onDelete={onDelete}
      onTagsChange={onTagsChange}
      onTitleChange={onTitleChange}
      setDeleteOpen={setDeleteOpen}
      setEditOpen={setEditOpen}
      setEditTitle={setEditTitle}
      setTagsOpen={setTagsOpen}
      tags={tags}
      tagsOpen={tagsOpen}
    />
  )

  const trigger = (
    <Button
      aria-label={`Actions for ${bookmark.title}`}
      className="transition-opacity duration-100 data-popup-open:opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-focus-within/bookmark:opacity-100 min-[800px]:pointer-fine:group-hover/bookmark:opacity-100"
      size="icon-xs"
      variant="ghost"
    >
      <DotsThreeIcon aria-hidden="true" weight="bold" />
    </Button>
  )

  if (isMobile) {
    return (
      <>
        <Drawer>
          <DrawerTrigger render={trigger} />
          <DrawerPopup showBar>
            <DrawerPanel>
              <DrawerMenu>
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Bookmark</DrawerMenuGroupLabel>
                  <DrawerClose
                    render={<DrawerMenuItem onClick={openBookmark} />}
                  >
                    <ArrowUpRightIcon aria-hidden="true" weight="regular" />
                    Open in new tab
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem onClick={copyLink} />}>
                    <CopyIcon aria-hidden="true" weight="duotone" />
                    Copy link
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem onClick={openEdit} />}>
                    <PencilSimpleIcon aria-hidden="true" weight="duotone" />
                    Edit
                  </DrawerClose>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Organize</DrawerMenuGroupLabel>
                  <Drawer>
                    <DrawerMenuTrigger>
                      <TagChevronIcon aria-hidden="true" weight="duotone" />
                      Tags
                    </DrawerMenuTrigger>
                    <DrawerPopup showBar>
                      <DrawerHeader>
                        <DrawerTitle>Tags</DrawerTitle>
                      </DrawerHeader>
                      <DrawerPanel>
                        <TagEditor
                          onChange={(nextTags) =>
                            onTagsChange(bookmark.id, nextTags)
                          }
                          tags={tags}
                        />
                      </DrawerPanel>
                      <DrawerFooter>
                        <DrawerClose render={<Button />}>Done</DrawerClose>
                      </DrawerFooter>
                    </DrawerPopup>
                  </Drawer>
                  <CollectionDrawer
                    label="Add to collection"
                    onSelect={(collection) =>
                      onAddToCollection(bookmark.id, collection)
                    }
                  />
                  <CollectionDrawer
                    label="Move to collection"
                    onSelect={(collection) =>
                      onMoveToCollection(bookmark.id, collection)
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
                    <CheckSquareOffsetIcon
                      aria-hidden="true"
                      weight="regular"
                    />
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
                        onClick={() => setDeleteOpen(true)}
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
            <MenuItem onClick={openEdit}>
              <PencilSimpleIcon aria-hidden="true" weight="duotone" />
              Edit
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Organize</MenuGroupLabel>
            <MenuItem onClick={() => setTagsOpen(true)}>
              <TagChevronIcon aria-hidden="true" weight="duotone" />
              Tags
            </MenuItem>
            <MenuSub>
              <MenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Add to collection
              </MenuSubTrigger>
              <MenuSubPopup>
                {mockCollections.map((collection) => (
                  <MenuItem
                    key={collection.label}
                    onClick={() =>
                      onAddToCollection(bookmark.id, collection.label)
                    }
                  >
                    {collection.label}
                  </MenuItem>
                ))}
              </MenuSubPopup>
            </MenuSub>
            <MenuSub>
              <MenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Move to collection
              </MenuSubTrigger>
              <MenuSubPopup>
                {mockCollections.map((collection) => (
                  <MenuItem
                    key={collection.label}
                    onClick={() =>
                      onMoveToCollection(bookmark.id, collection.label)
                    }
                  >
                    {collection.label}
                  </MenuItem>
                ))}
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
            <MenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
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

export function BookmarkContextMenu({
  bookmark,
  children,
  isSelected,
  onAddToCollection,
  onDelete,
  onMoveToCollection,
  onReenrich,
  onSelectChange,
  onTagsChange,
  onTitleChange,
}: BookmarkActionsProps & {
  children: React.ReactNode
}): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(bookmark.title)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const tags = bookmark.tags ?? []

  if (isMobile) return <>{children}</>

  const openBookmark = () => {
    window.open(bookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
  }

  const copyLink = () => {
    void navigator.clipboard?.writeText(bookmarkUrl(bookmark))
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
            <ContextMenuItem onClick={() => setTagsOpen(true)}>
              <TagChevronIcon aria-hidden="true" weight="duotone" />
              Tags
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Add to collection
              </ContextMenuSubTrigger>
              <ContextMenuSubPopup>
                {mockCollections.map((collection) => (
                  <ContextMenuItem
                    key={collection.label}
                    onClick={() =>
                      onAddToCollection(bookmark.id, collection.label)
                    }
                  >
                    {collection.label}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubPopup>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderIcon aria-hidden="true" />
                Move to collection
              </ContextMenuSubTrigger>
              <ContextMenuSubPopup>
                {mockCollections.map((collection) => (
                  <ContextMenuItem
                    key={collection.label}
                    onClick={() =>
                      onMoveToCollection(bookmark.id, collection.label)
                    }
                  >
                    {collection.label}
                  </ContextMenuItem>
                ))}
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
        bookmark={bookmark}
        deleteOpen={deleteOpen}
        editOpen={editOpen}
        editTitle={editTitle}
        onDelete={onDelete}
        onTagsChange={onTagsChange}
        onTitleChange={onTitleChange}
        setDeleteOpen={setDeleteOpen}
        setEditOpen={setEditOpen}
        setEditTitle={setEditTitle}
        setTagsOpen={setTagsOpen}
        tags={tags}
        tagsOpen={tagsOpen}
      />
    </>
  )
}
