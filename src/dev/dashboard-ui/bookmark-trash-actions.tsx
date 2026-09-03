"use client"

import {
  ArrowCounterClockwiseIcon,
  ArrowUpRightIcon,
  CheckSquareOffsetIcon,
  CopyIcon,
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
  ContextMenu,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { OverflowMenuIcon } from "@/components/ui/overflow-menu-icon"
import { getBookmarkUrl } from "@/dev/dashboard-ui/bookmark-url"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { useIsMobile } from "@/hooks/use-media-query"

export interface BookmarkTrashActionHandlers {
  onDeleteForever: (bookmarkId: string) => void
  onRestore: (bookmarkId: string) => void
}

interface BookmarkTrashActionsProps extends BookmarkTrashActionHandlers {
  bookmark: MockBookmark
  isSelected: boolean
  onSelectChange: (bookmarkId: string, selected: boolean) => void
}

function openBookmark(bookmark: MockBookmark): void {
  window.open(getBookmarkUrl(bookmark), "_blank", "noopener,noreferrer")
}

function copyBookmarkLink(bookmark: MockBookmark): void {
  void navigator.clipboard?.writeText(getBookmarkUrl(bookmark))
}

function DeleteForeverDialog({
  bookmark,
  onDeleteForever,
  onOpenChange,
  open,
}: {
  bookmark: MockBookmark
  onDeleteForever: (bookmarkId: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}): React.ReactElement {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete bookmark forever?</AlertDialogTitle>
          <AlertDialogDescription>
            "{bookmark.title}" will be removed permanently. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            onClick={() => onDeleteForever(bookmark.id)}
            render={<Button variant="destructive" />}
          >
            <TrashIcon aria-hidden="true" />
            Delete forever
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

export function BookmarkTrashActions({
  bookmark,
  isSelected,
  onDeleteForever,
  onRestore,
  onSelectChange,
}: BookmarkTrashActionsProps): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteForeverOpen, setDeleteForeverOpen] = React.useState(false)
  const trigger = (
    <Button
      aria-label={`Actions for ${bookmark.title}${isSelected ? ", selected" : ""}`}
      className="transition-opacity duration-100 data-popup-open:opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/bookmark:opacity-100 min-[800px]:pointer-fine:group-has-focus-visible/bookmark:opacity-100"
      data-bookmark-actions={bookmark.id}
      size="icon-xs"
      variant="ghost"
    >
      <OverflowMenuIcon />
    </Button>
  )
  const dialog = (
    <DeleteForeverDialog
      bookmark={bookmark}
      onDeleteForever={onDeleteForever}
      onOpenChange={setDeleteForeverOpen}
      open={deleteForeverOpen}
    />
  )

  if (isMobile) {
    return (
      <>
        <Drawer>
          <DrawerTrigger render={trigger} />
          <DrawerPopup showBar>
            <DrawerPanel>
              <DrawerMenu aria-label={`Trash actions for ${bookmark.title}`}>
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Bookmark</DrawerMenuGroupLabel>
                  <DrawerClose
                    render={
                      <DrawerMenuItem onClick={() => openBookmark(bookmark)} />
                    }
                  >
                    <ArrowUpRightIcon aria-hidden="true" weight="regular" />
                    Open in new tab
                  </DrawerClose>
                  <DrawerClose
                    render={
                      <DrawerMenuItem
                        onClick={() => copyBookmarkLink(bookmark)}
                      />
                    }
                  >
                    <CopyIcon aria-hidden="true" weight="duotone" />
                    Copy link
                  </DrawerClose>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Recovery</DrawerMenuGroupLabel>
                  <DrawerClose
                    render={
                      <DrawerMenuItem onClick={() => onRestore(bookmark.id)} />
                    }
                  >
                    <ArrowCounterClockwiseIcon aria-hidden="true" />
                    Restore
                  </DrawerClose>
                  <DrawerClose
                    render={
                      <DrawerMenuItem
                        onClick={() => onSelectChange(bookmark.id, !isSelected)}
                      />
                    }
                  >
                    <CheckSquareOffsetIcon aria-hidden="true" />
                    {isSelected ? "Remove from selection" : "Select"}
                  </DrawerClose>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Danger</DrawerMenuGroupLabel>
                  <DrawerClose
                    render={
                      <DrawerMenuItem
                        onClick={() => setDeleteForeverOpen(true)}
                        variant="destructive"
                      />
                    }
                  >
                    <TrashIcon aria-hidden="true" weight="duotone" />
                    Delete forever
                  </DrawerClose>
                </DrawerMenuGroup>
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
        {dialog}
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
            <MenuItem onClick={() => openBookmark(bookmark)}>
              <ArrowUpRightIcon aria-hidden="true" weight="regular" />
              Open in new tab
            </MenuItem>
            <MenuItem onClick={() => copyBookmarkLink(bookmark)}>
              <CopyIcon aria-hidden="true" weight="duotone" />
              Copy link
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Recovery</MenuGroupLabel>
            <MenuItem onClick={() => onRestore(bookmark.id)}>
              <ArrowCounterClockwiseIcon aria-hidden="true" />
              Restore
            </MenuItem>
            <MenuItem onClick={() => onSelectChange(bookmark.id, !isSelected)}>
              <CheckSquareOffsetIcon aria-hidden="true" />
              {isSelected ? "Remove from selection" : "Select"}
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Danger</MenuGroupLabel>
            <MenuItem
              onClick={() => setDeleteForeverOpen(true)}
              variant="destructive"
            >
              <TrashIcon aria-hidden="true" weight="duotone" />
              Delete forever
            </MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>
      {dialog}
    </>
  )
}

export function BookmarkTrashContextMenu({
  bookmark,
  children,
  isSelected,
  onDeleteForever,
  onRestore,
  onSelectChange,
}: BookmarkTrashActionsProps & {
  children: React.ReactNode
}): React.ReactElement {
  const isMobile = useIsMobile()
  const [deleteForeverOpen, setDeleteForeverOpen] = React.useState(false)

  if (isMobile) return <>{children}</>

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Bookmark</ContextMenuGroupLabel>
            <ContextMenuItem onClick={() => openBookmark(bookmark)}>
              <ArrowUpRightIcon aria-hidden="true" weight="regular" />
              Open in new tab
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyBookmarkLink(bookmark)}>
              <CopyIcon aria-hidden="true" weight="duotone" />
              Copy link
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Recovery</ContextMenuGroupLabel>
            <ContextMenuItem onClick={() => onRestore(bookmark.id)}>
              <ArrowCounterClockwiseIcon aria-hidden="true" />
              Restore
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onSelectChange(bookmark.id, !isSelected)}
            >
              <CheckSquareOffsetIcon aria-hidden="true" />
              {isSelected ? "Remove from selection" : "Select"}
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuGroupLabel>Danger</ContextMenuGroupLabel>
            <ContextMenuItem
              onClick={() => setDeleteForeverOpen(true)}
              variant="destructive"
            >
              <TrashIcon aria-hidden="true" weight="duotone" />
              Delete forever
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuPopup>
      </ContextMenu>
      <DeleteForeverDialog
        bookmark={bookmark}
        onDeleteForever={onDeleteForever}
        onOpenChange={setDeleteForeverOpen}
        open={deleteForeverOpen}
      />
    </>
  )
}
