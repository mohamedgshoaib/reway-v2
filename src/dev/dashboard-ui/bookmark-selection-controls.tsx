import {
  ArrowCounterClockwiseIcon,
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

const DELETE_ACTION = { kind: "delete" } as const
const DELETE_FOREVER_ACTION = { kind: "delete-forever" } as const
const RESTORE_ACTION = { kind: "restore" } as const

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

interface SelectionControlState {
  allVisibleSelected: boolean
  bulkDisabled: boolean
  isPending: boolean
  selectedCount: number
  showRangeHint: boolean
}

type SelectionActionVariant =
  | {
      kind: "library"
      collections: readonly Collection[]
      destinationAvailability: ReadonlyMap<
        string,
        BookmarkBulkDestinationAvailability
      >
      mutation: BookmarkSelectionMutation
      removeAction: Extract<BookmarkBulkAction, { kind: "remove" }> | null
      showRemoveProgress: boolean
    }
  | { kind: "trash"; showRestoreProgress: boolean }

function DesktopSelectionBar({
  actions,
  onClose,
  onOpenDelete,
  onRunAction,
  onToggleAll,
  state,
}: {
  actions: SelectionActionVariant
  onClose: () => void
  onOpenDelete: (returnFocusTarget: HTMLElement | null) => void
  onRunAction: RunBulkAction
  onToggleAll: () => void
  state: SelectionControlState
}): React.ReactElement {
  return (
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
        {state.selectedCount} selected
      </span>
      {state.showRangeHint ? (
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
          disabled={state.isPending}
          onClick={onToggleAll}
          size="sm"
          variant="ghost"
        >
          <CheckSquareOffsetIcon aria-hidden="true" />
          {state.allVisibleSelected ? "Clear all" : "Select all"}
        </Button>
        {actions.kind === "trash" ? (
          <>
            <Button
              disabled={state.bulkDisabled}
              onClick={(event) =>
                void onRunAction(RESTORE_ACTION, event.currentTarget)
              }
              size="sm"
              variant="ghost"
            >
              {actions.showRestoreProgress ? (
                <Spinner aria-hidden="true" className="size-4" />
              ) : (
                <ArrowCounterClockwiseIcon aria-hidden="true" />
              )}
              Restore
            </Button>
            <Separator className="mx-1 h-5" orientation="vertical" />
            <Button
              disabled={state.bulkDisabled}
              onClick={(event) => onOpenDelete(event.currentTarget)}
              size="sm"
              variant="destructive-outline"
            >
              <TrashIcon aria-hidden="true" />
              Delete forever
            </Button>
          </>
        ) : (
          <>
            <BulkCollectionPicker
              actionKind="add"
              availability={actions.destinationAvailability}
              collections={actions.collections}
              disabled={state.bulkDisabled}
              label="Add"
              mutation={actions.mutation}
              onRunAction={onRunAction}
            />
            <BulkCollectionPicker
              actionKind="move"
              availability={actions.destinationAvailability}
              collections={actions.collections}
              disabled={state.bulkDisabled}
              label="Move"
              mutation={actions.mutation}
              onRunAction={onRunAction}
            />
            {actions.removeAction ? (
              <Button
                disabled={state.bulkDisabled}
                onClick={(event) =>
                  void onRunAction(actions.removeAction!, event.currentTarget)
                }
                size="sm"
                variant="ghost"
              >
                {actions.showRemoveProgress ? (
                  <Spinner aria-hidden="true" className="size-4" />
                ) : (
                  <MinusIcon aria-hidden="true" />
                )}
                Remove
              </Button>
            ) : null}
            <Separator className="mx-1 h-5" orientation="vertical" />
            <Button
              disabled={state.bulkDisabled}
              onClick={(event) => onOpenDelete(event.currentTarget)}
              size="sm"
              variant="destructive-outline"
            >
              <TrashIcon aria-hidden="true" />
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function MobileSelectionActions({
  actions,
  onOpenChange,
  onOpenDelete,
  onRunAction,
  onToggleAll,
  open,
  selectedBookmarkLabel,
  state,
  triggerRef,
}: {
  actions: SelectionActionVariant
  onOpenChange: (open: boolean) => void
  onOpenDelete: (returnFocusTarget: HTMLElement | null) => void
  onRunAction: RunBulkAction
  onToggleAll: () => void
  open: boolean
  selectedBookmarkLabel: string
  state: SelectionControlState
  triggerRef: React.RefObject<HTMLButtonElement | null>
}): React.ReactElement {
  const runMobileAction: RunBulkAction = (action) => {
    onOpenChange(false)
    return onRunAction(action, triggerRef.current)
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pt-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))] min-[800px]:hidden">
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerTrigger
          render={
            <Button
              aria-label={`Open actions for ${selectedBookmarkLabel}`}
              className="h-12 w-full shadow-sm"
              ref={triggerRef}
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
                  disabled={state.isPending}
                  onClick={onToggleAll}
                >
                  <CheckSquareOffsetIcon aria-hidden="true" />
                  {state.allVisibleSelected ? "Clear all" : "Select all"}
                </DrawerMenuItem>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              {actions.kind === "trash" ? (
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Recovery</DrawerMenuGroupLabel>
                  <DrawerMenuItem
                    className="min-h-11"
                    disabled={state.bulkDisabled}
                    onClick={() => void runMobileAction(RESTORE_ACTION, null)}
                  >
                    {actions.showRestoreProgress ? (
                      <Spinner aria-hidden="true" className="size-4" />
                    ) : (
                      <ArrowCounterClockwiseIcon aria-hidden="true" />
                    )}
                    Restore
                  </DrawerMenuItem>
                </DrawerMenuGroup>
              ) : (
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Organize</DrawerMenuGroupLabel>
                  <BulkCollectionPicker
                    actionKind="add"
                    availability={actions.destinationAvailability}
                    collections={actions.collections}
                    disabled={state.bulkDisabled}
                    label="Add"
                    mobileMenuItem
                    mutation={actions.mutation}
                    onRunAction={runMobileAction}
                  />
                  <BulkCollectionPicker
                    actionKind="move"
                    availability={actions.destinationAvailability}
                    collections={actions.collections}
                    disabled={state.bulkDisabled}
                    label="Move"
                    mobileMenuItem
                    mutation={actions.mutation}
                    onRunAction={runMobileAction}
                  />
                  {actions.removeAction ? (
                    <DrawerMenuItem
                      className="min-h-11"
                      disabled={state.bulkDisabled}
                      onClick={() =>
                        void runMobileAction(actions.removeAction!, null)
                      }
                    >
                      {actions.showRemoveProgress ? (
                        <Spinner aria-hidden="true" className="size-4" />
                      ) : (
                        <MinusIcon aria-hidden="true" />
                      )}
                      Remove from this collection
                    </DrawerMenuItem>
                  ) : null}
                </DrawerMenuGroup>
              )}
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuItem
                  className="min-h-11"
                  disabled={state.bulkDisabled}
                  onClick={() => {
                    onOpenChange(false)
                    onOpenDelete(triggerRef.current)
                  }}
                  variant="destructive"
                >
                  <TrashIcon aria-hidden="true" />
                  {actions.kind === "trash" ? "Delete forever" : "Delete"}
                </DrawerMenuItem>
              </DrawerMenuGroup>
            </DrawerMenu>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </div>
  )
}

function SelectionDeleteDialog({
  deleteButtonRef,
  isPending,
  onOpenChange,
  onRunDelete,
  open,
  selectedCount,
  showDeleteProgress,
  variant,
}: {
  deleteButtonRef: React.RefObject<HTMLButtonElement | null>
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onRunDelete: () => Promise<void>
  open: boolean
  selectedCount: number
  showDeleteProgress: boolean
  variant: "library" | "trash"
}): React.ReactElement {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {variant === "trash"
              ? "Delete selected bookmarks forever?"
              : "Delete selected bookmarks?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {variant === "trash" ? (
              <>
                {selectedCount} selected{" "}
                {selectedCount === 1 ? "bookmark" : "bookmarks"} will be removed
                permanently. This cannot be undone.
              </>
            ) : (
              <>
                {selectedCount} selected{" "}
                {selectedCount === 1 ? "bookmark" : "bookmarks"} will move to
                Trash. You can restore them for 30 days.
              </>
            )}
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
            onClick={() => void onRunDelete()}
            ref={deleteButtonRef}
            variant="destructive"
          >
            {showDeleteProgress ? (
              <Spinner aria-hidden="true" className="size-4" />
            ) : (
              <TrashIcon aria-hidden="true" />
            )}
            {variant === "trash"
              ? "Delete forever"
              : `Delete ${selectedCount === 1 ? "bookmark" : "bookmarks"}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
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
  variant = "library",
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
  variant?: "library" | "trash"
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
    mutation.action.kind ===
      (variant === "trash" ? DELETE_FOREVER_ACTION.kind : DELETE_ACTION.kind)
  const bulkDisabled = selectedCount === 0 || isPending
  const removeAction = activeCollectionId
    ? ({ collectionId: activeCollectionId, kind: "remove" } as const)
    : null
  const showRemoveProgress =
    removeAction !== null &&
    mutation.status === "pending" &&
    mutation.showProgress &&
    getBookmarkBulkActionKey(mutation.action) ===
      getBookmarkBulkActionKey(removeAction)
  const showRestoreProgress =
    mutation.status === "pending" &&
    mutation.showProgress &&
    mutation.action.kind === "restore"
  const showRangeHint = visibleCount >= 2 && !hasSeenRangeHint
  const selectedBookmarkLabel = `${selectedCount} selected ${selectedCount === 1 ? "bookmark" : "bookmarks"}`
  const controlsState: SelectionControlState = {
    allVisibleSelected,
    bulkDisabled,
    isPending,
    selectedCount,
    showRangeHint,
  }
  const actions: SelectionActionVariant =
    variant === "trash"
      ? { kind: "trash", showRestoreProgress }
      : {
          collections,
          destinationAvailability,
          kind: "library",
          mutation,
          removeAction,
          showRemoveProgress,
        }

  const runDelete = async (): Promise<void> => {
    const succeeded = await onRunAction(
      variant === "trash" ? DELETE_FOREVER_ACTION : DELETE_ACTION,
      deleteButtonRef.current
    )
    if (succeeded) setDeleteOpen(false)
  }

  const openDeleteDialog = (returnFocusTarget: HTMLElement | null): void => {
    deleteReturnFocusRef.current = returnFocusTarget
    setDeleteOpen(true)
  }

  return (
    <>
      <DesktopSelectionBar
        actions={actions}
        onClose={onClose}
        onOpenDelete={openDeleteDialog}
        onRunAction={onRunAction}
        onToggleAll={onToggleAll}
        state={controlsState}
      />
      <MobileSelectionActions
        actions={actions}
        onOpenChange={setMobileActionsOpen}
        onOpenDelete={openDeleteDialog}
        onRunAction={onRunAction}
        onToggleAll={onToggleAll}
        open={mobileActionsOpen}
        selectedBookmarkLabel={selectedBookmarkLabel}
        state={controlsState}
        triggerRef={mobileActionsTriggerRef}
      />
      <SelectionDeleteDialog
        deleteButtonRef={deleteButtonRef}
        isPending={isPending}
        onOpenChange={(open) => {
          if (isPending) return
          setDeleteOpen(open)
          if (!open) {
            requestAnimationFrame(() => deleteReturnFocusRef.current?.focus())
          }
        }}
        open={deleteOpen}
        onRunDelete={runDelete}
        selectedCount={selectedCount}
        showDeleteProgress={showDeleteProgress}
        variant={variant}
      />
    </>
  )
}
