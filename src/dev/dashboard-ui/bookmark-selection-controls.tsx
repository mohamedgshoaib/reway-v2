import {
  ArrowRightIcon,
  CaretUpIcon,
  CheckSquareOffsetIcon,
  FolderIcon,
  MinusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"
import type React from "react"
import { useMemo, useRef, useState, useSyncExternalStore } from "react"

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
  Drawer,
  DrawerClose,
  DrawerDescription,
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
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  deriveBookmarkBulkDestinationAvailability,
  getBookmarkBulkActionKey,
  type BookmarkBulkDestinationAvailability,
  type BookmarkBulkAction,
  type BookmarkSelectionMutation,
} from "@/dev/dashboard-ui/bookmark-selection"
import {
  getBookmarkRangeHintSeen,
  getDefaultBookmarkRangeHintSeen,
  markBookmarkRangeHintSeen,
  subscribeToBookmarkRangeHint,
} from "@/dev/dashboard-ui/bookmark-selection-hint-store"
import {
  createCollectionIndex,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { useIsMobile } from "@/hooks/use-media-query"

type CollectionBulkAction = Extract<
  BookmarkBulkAction,
  { kind: "add" | "move" }
>

type RunBulkAction = (
  action: BookmarkBulkAction,
  trigger: HTMLElement | null
) => Promise<boolean>

function DestinationContent({
  collection,
  label,
  reason,
}: {
  collection: Collection
  label: string
  reason: string | null
}): React.ReactElement {
  return (
    <>
      <CollectionIcon color={collection.color} icon={collection.icon} />
      <span>{label}</span>
      {reason ? (
        <span className="ms-auto text-xs text-muted-foreground">{reason}</span>
      ) : null}
    </>
  )
}

function DesktopCollectionDestinations({
  actionKind,
  availability,
  collections,
  onSelect,
}: {
  actionKind: CollectionBulkAction["kind"]
  availability: ReadonlyMap<string, BookmarkBulkDestinationAvailability>
  collections: readonly Collection[]
  onSelect: (collectionId: string) => void
}): React.ReactElement {
  const roots = createCollectionIndex(collections, [], "custom").roots
  const actionLabel = actionKind === "add" ? "Add to" : "Move to"
  const getReason = (collectionId: string) => {
    const destination = availability.get(collectionId)
    return actionKind === "add"
      ? (destination?.addDisabledReason ?? null)
      : (destination?.moveDisabledReason ?? null)
  }

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
              <MenuItem
                disabled={Boolean(getReason(root.collection.id))}
                onClick={() => onSelect(root.collection.id)}
              >
                <DestinationContent
                  collection={root.collection}
                  label={`${actionLabel} ${root.collection.name}`}
                  reason={getReason(root.collection.id)}
                />
              </MenuItem>
              <MenuSeparator />
              {root.children.map((child) => (
                <MenuItem
                  disabled={Boolean(getReason(child.collection.id))}
                  key={child.collection.id}
                  onClick={() => onSelect(child.collection.id)}
                >
                  <DestinationContent
                    collection={child.collection}
                    label={child.collection.name}
                    reason={getReason(child.collection.id)}
                  />
                </MenuItem>
              ))}
            </MenuSubPopup>
          </MenuSub>
        ) : (
          <MenuItem
            disabled={Boolean(getReason(root.collection.id))}
            key={root.collection.id}
            onClick={() => onSelect(root.collection.id)}
          >
            <DestinationContent
              collection={root.collection}
              label={root.collection.name}
              reason={getReason(root.collection.id)}
            />
          </MenuItem>
        )
      )}
    </>
  )
}

function MobileCollectionDestinations({
  actionKind,
  availability,
  collections,
  onSelect,
}: {
  actionKind: CollectionBulkAction["kind"]
  availability: ReadonlyMap<string, BookmarkBulkDestinationAvailability>
  collections: readonly Collection[]
  onSelect: (collectionId: string) => void
}): React.ReactElement {
  const roots = createCollectionIndex(collections, [], "custom").roots
  const actionLabel = actionKind === "add" ? "Add to" : "Move to"
  const getReason = (collectionId: string) => {
    const destination = availability.get(collectionId)
    return actionKind === "add"
      ? (destination?.addDisabledReason ?? null)
      : (destination?.moveDisabledReason ?? null)
  }

  return (
    <>
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
                          disabled={Boolean(getReason(root.collection.id))}
                          onClick={() => onSelect(root.collection.id)}
                        />
                      }
                    >
                      <DestinationContent
                        collection={root.collection}
                        label={`${actionLabel} ${root.collection.name}`}
                        reason={getReason(root.collection.id)}
                      />
                    </DrawerClose>
                    <DrawerMenuSeparator />
                    {root.children.map((child) => (
                      <DrawerClose
                        key={child.collection.id}
                        render={
                          <DrawerMenuItem
                            disabled={Boolean(getReason(child.collection.id))}
                            onClick={() => onSelect(child.collection.id)}
                          />
                        }
                      >
                        <DestinationContent
                          collection={child.collection}
                          label={child.collection.name}
                          reason={getReason(child.collection.id)}
                        />
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
                disabled={Boolean(getReason(root.collection.id))}
                onClick={() => onSelect(root.collection.id)}
              />
            }
          >
            <DestinationContent
              collection={root.collection}
              label={root.collection.name}
              reason={getReason(root.collection.id)}
            />
          </DrawerClose>
        )
      )}
    </>
  )
}

function BulkCollectionPicker({
  actionKind,
  availability,
  collections,
  disabled,
  label,
  mutation,
  mobileMenuItem = false,
  onRunAction,
  triggerClassName,
}: {
  actionKind: CollectionBulkAction["kind"]
  availability: ReadonlyMap<string, BookmarkBulkDestinationAvailability>
  collections: readonly Collection[]
  disabled: boolean
  label: string
  mutation: BookmarkSelectionMutation
  mobileMenuItem?: boolean
  onRunAction: RunBulkAction
  triggerClassName?: string
}): React.ReactElement {
  const isMobile = useIsMobile()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pendingActionKind =
    mutation.status === "pending" ? mutation.action.kind : null
  const showProgress =
    mutation.status === "pending" &&
    mutation.showProgress &&
    pendingActionKind === actionKind
  const icon =
    actionKind === "add" ? (
      <FolderIcon aria-hidden="true" />
    ) : (
      <ArrowRightIcon aria-hidden="true" />
    )
  const trigger = (
    <Button
      className={triggerClassName}
      disabled={disabled}
      ref={triggerRef}
      size="sm"
      variant="ghost"
    >
      {showProgress ? <Spinner aria-hidden="true" className="size-4" /> : icon}
      {label}
    </Button>
  )
  const selectCollection = (collectionId: string): void => {
    void onRunAction({ collectionId, kind: actionKind }, triggerRef.current)
  }

  if (isMobile) {
    return (
      <Drawer>
        {mobileMenuItem ? (
          <DrawerMenuTrigger
            className="min-h-11"
            disabled={disabled}
            ref={triggerRef}
          >
            {showProgress ? (
              <Spinner aria-hidden="true" className="size-4" />
            ) : (
              icon
            )}
            {label}
          </DrawerMenuTrigger>
        ) : (
          <DrawerTrigger render={trigger} />
        )}
        <DrawerPopup showBar showCloseButton>
          <DrawerHeader>
            <DrawerTitle>{label} to collection</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel>
            <DrawerMenu>
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>{label}</DrawerMenuGroupLabel>
                <MobileCollectionDestinations
                  actionKind={actionKind}
                  availability={availability}
                  collections={collections}
                  onSelect={selectCollection}
                />
              </DrawerMenuGroup>
            </DrawerMenu>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    )
  }

  return (
    <Menu>
      <MenuTrigger render={trigger} />
      <MenuPopup align="end">
        <DesktopCollectionDestinations
          actionKind={actionKind}
          availability={availability}
          collections={collections}
          onSelect={selectCollection}
        />
      </MenuPopup>
    </Menu>
  )
}

export function BookmarkSelectionBars({
  activeCollectionId,
  allVisibleSelected,
  bookmarks,
  collections,
  mutation,
  onClose,
  onRunAction,
  onToggleAll,
  selectedCount,
  selectedIds,
  visibleCount,
}: {
  activeCollectionId: string | null
  allVisibleSelected: boolean
  bookmarks: readonly MockBookmark[]
  collections: readonly Collection[]
  mutation: BookmarkSelectionMutation
  onClose: () => void
  onRunAction: RunBulkAction
  onToggleAll: () => void
  selectedCount: number
  selectedIds: ReadonlySet<string>
  visibleCount: number
}): React.ReactElement {
  const hasSeenRangeHint = useSyncExternalStore(
    subscribeToBookmarkRangeHint,
    getBookmarkRangeHintSeen,
    getDefaultBookmarkRangeHintSeen
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null)
  const mobileActionsTriggerRef = useRef<HTMLButtonElement>(null)
  const destinationAvailability = useMemo(
    () =>
      deriveBookmarkBulkDestinationAvailability(
        bookmarks,
        selectedIds,
        collections.map((collection) => collection.id)
      ),
    [bookmarks, collections, selectedIds]
  )
  const isPending = mutation.status === "pending"
  const showDeleteProgress =
    mutation.status === "pending" &&
    mutation.showProgress &&
    mutation.action.kind === "delete"
  const bulkDisabled = selectedCount === 0 || isPending
  const deleteAction = { kind: "delete" } as const
  const removeAction = activeCollectionId
    ? ({ collectionId: activeCollectionId, kind: "remove" } as const)
    : null
  const showRemoveProgress =
    removeAction !== null &&
    mutation.status === "pending" &&
    mutation.showProgress &&
    getBookmarkBulkActionKey(mutation.action) ===
      getBookmarkBulkActionKey(removeAction)
  const showRangeHint = visibleCount >= 2 && !hasSeenRangeHint
  const selectedBookmarkLabel = `${selectedCount} selected ${selectedCount === 1 ? "bookmark" : "bookmarks"}`

  const runDelete = async (): Promise<void> => {
    const succeeded = await onRunAction(deleteAction, deleteButtonRef.current)
    if (succeeded) setDeleteOpen(false)
  }

  const openDeleteDialog = (returnFocusTarget: HTMLElement | null): void => {
    deleteReturnFocusRef.current = returnFocusTarget
    setDeleteOpen(true)
  }

  const openMobileDeleteDialog = (): void => {
    setMobileActionsOpen(false)
    openDeleteDialog(mobileActionsTriggerRef.current)
  }

  const runMobileAction: RunBulkAction = (action) => {
    setMobileActionsOpen(false)
    return onRunAction(action, mobileActionsTriggerRef.current)
  }

  const removeButton = removeAction ? (
    <Button
      disabled={bulkDisabled}
      onClick={(event) => void onRunAction(removeAction, event.currentTarget)}
      size="sm"
      variant="ghost"
    >
      {showRemoveProgress ? (
        <Spinner aria-hidden="true" className="size-4" />
      ) : (
        <MinusIcon aria-hidden="true" />
      )}
      Remove
    </Button>
  ) : null

  return (
    <>
      <div className="mb-4 flex h-9 min-w-0 items-center gap-2 px-2 min-[800px]:mb-2">
        <Button
          aria-label="Close selection mode"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon aria-hidden="true" />
        </Button>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {selectedCount} selected
        </span>
        {showRangeHint ? (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground min-[800px]:inline-flex">
            Shift-click to select a range
            <Button
              aria-label="Dismiss range selection hint"
              onClick={markBookmarkRangeHintSeen}
              size="icon-xs"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </span>
        ) : null}
        <div className="ms-auto hidden min-w-0 items-center gap-1 min-[800px]:flex">
          <Button
            disabled={isPending}
            onClick={onToggleAll}
            size="sm"
            variant="ghost"
          >
            <CheckSquareOffsetIcon aria-hidden="true" />
            {allVisibleSelected ? "Clear all" : "Select all"}
          </Button>
          <BulkCollectionPicker
            actionKind="add"
            availability={destinationAvailability}
            collections={collections}
            disabled={bulkDisabled}
            label="Add"
            mutation={mutation}
            onRunAction={onRunAction}
          />
          <BulkCollectionPicker
            actionKind="move"
            availability={destinationAvailability}
            collections={collections}
            disabled={bulkDisabled}
            label="Move"
            mutation={mutation}
            onRunAction={onRunAction}
          />
          {removeButton}
          <Separator className="mx-1 h-5" orientation="vertical" />
          <Button
            disabled={bulkDisabled}
            onClick={(event) => openDeleteDialog(event.currentTarget)}
            size="sm"
            variant="destructive-outline"
          >
            <TrashIcon aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pt-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))] min-[800px]:hidden">
        <Drawer onOpenChange={setMobileActionsOpen} open={mobileActionsOpen}>
          <DrawerTrigger
            render={
              <Button
                aria-label={`Open actions for ${selectedBookmarkLabel}`}
                className="h-12 w-full shadow-sm"
                ref={mobileActionsTriggerRef}
                size="lg"
              />
            }
          >
            Actions
            <CaretUpIcon aria-hidden="true" />
          </DrawerTrigger>
          <DrawerPopup showBar showCloseButton>
            <DrawerHeader>
              <DrawerTitle>Bookmark actions</DrawerTitle>
              <DrawerDescription>{selectedBookmarkLabel}</DrawerDescription>
            </DrawerHeader>
            <DrawerPanel>
              <DrawerMenu aria-label="Bookmark actions">
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Selection</DrawerMenuGroupLabel>
                  <DrawerMenuItem
                    className="min-h-11"
                    disabled={isPending}
                    onClick={onToggleAll}
                  >
                    <CheckSquareOffsetIcon aria-hidden="true" />
                    {allVisibleSelected ? "Clear all" : "Select all"}
                  </DrawerMenuItem>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Organize</DrawerMenuGroupLabel>
                  <BulkCollectionPicker
                    actionKind="add"
                    availability={destinationAvailability}
                    collections={collections}
                    disabled={bulkDisabled}
                    label="Add"
                    mobileMenuItem
                    mutation={mutation}
                    onRunAction={runMobileAction}
                  />
                  <BulkCollectionPicker
                    actionKind="move"
                    availability={destinationAvailability}
                    collections={collections}
                    disabled={bulkDisabled}
                    label="Move"
                    mobileMenuItem
                    mutation={mutation}
                    onRunAction={runMobileAction}
                  />
                  {removeAction ? (
                    <DrawerMenuItem
                      className="min-h-11"
                      disabled={bulkDisabled}
                      onClick={() => void runMobileAction(removeAction, null)}
                    >
                      {showRemoveProgress ? (
                        <Spinner aria-hidden="true" className="size-4" />
                      ) : (
                        <MinusIcon aria-hidden="true" />
                      )}
                      Remove from this collection
                    </DrawerMenuItem>
                  ) : null}
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuItem
                    className="min-h-11"
                    disabled={bulkDisabled}
                    onClick={openMobileDeleteDialog}
                    variant="destructive"
                  >
                    <TrashIcon aria-hidden="true" />
                    Delete
                  </DrawerMenuItem>
                </DrawerMenuGroup>
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (isPending) return
          setDeleteOpen(open)
          if (!open) {
            requestAnimationFrame(() => deleteReturnFocusRef.current?.focus())
          }
        }}
        open={deleteOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected bookmarks?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount} selected{" "}
              {selectedCount === 1 ? "bookmark" : "bookmarks"} will move to
              Trash. You can restore them for 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              disabled={isPending}
              render={<Button variant="ghost" />}
            >
              Cancel
            </AlertDialogClose>
            <Button
              disabled={isPending}
              onClick={() => void runDelete()}
              ref={deleteButtonRef}
              variant="destructive"
            >
              {showDeleteProgress ? (
                <Spinner aria-hidden="true" className="size-4" />
              ) : (
                <TrashIcon aria-hidden="true" />
              )}
              Delete {selectedCount === 1 ? "bookmark" : "bookmarks"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  )
}
