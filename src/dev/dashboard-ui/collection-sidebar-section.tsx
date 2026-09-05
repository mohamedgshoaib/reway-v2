import {
  CaretDownIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { OverflowMenuIcon } from "@/components/ui/overflow-menu-icon"
import {
  SidebarGroup,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  createCollectionIndex,
  type Collection,
  type CollectionOrderMode,
  type CollectionRow,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import {
  CollectionDeleteDialog,
  CollectionEditorDialog,
  type CollectionEditorRequest,
} from "@/dev/dashboard-ui/collection-management"
import { CollectionReorderList } from "@/dev/dashboard-ui/collection-reorder"
import type { CollectionManagementHandlers } from "@/dev/dashboard-ui/dashboard-management-state"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

function CollectionRowMenu({
  onDelete,
  onEdit,
  onNewNested,
  row,
}: {
  onDelete: (trigger: HTMLElement | null) => void
  onEdit: (trigger: HTMLElement | null) => void
  onNewNested?: (trigger: HTMLElement | null) => void
  row: CollectionRow
}): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <>
      <SidebarMenuBadge className="group-hover/menu-item:opacity-0 group-has-focus-visible/menu-item:opacity-0 group-has-data-popup-open/menu-item:opacity-0">
        {row.directCount}
      </SidebarMenuBadge>
      <Menu>
        <MenuTrigger
          render={
            <SidebarMenuAction
              aria-label={`Actions for ${row.collection.name}`}
              ref={triggerRef}
              showOnHover
            />
          }
        >
          <OverflowMenuIcon />
        </MenuTrigger>
        <MenuPopup align="start" side="right">
          {onNewNested ? (
            <MenuItem onClick={() => onNewNested(triggerRef.current)}>
              <PlusIcon aria-hidden="true" weight="regular" />
              New nested collection
            </MenuItem>
          ) : null}
          <MenuItem onClick={() => onEdit(triggerRef.current)}>
            <PencilSimpleIcon aria-hidden="true" weight="duotone" />
            Edit
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            onClick={() => onDelete(triggerRef.current)}
            variant="destructive"
          >
            <TrashIcon aria-hidden="true" weight="duotone" />
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
    </>
  )
}

function CollectionNavigationRow({
  activeCollection,
  nested = false,
  onDelete,
  onEdit,
  onNavigate,
  onNewNested,
  onSelectCollection,
  row,
}: {
  activeCollection: string | null
  nested?: boolean
  onDelete: (trigger: HTMLElement | null) => void
  onEdit: (trigger: HTMLElement | null) => void
  onNavigate?: () => void
  onNewNested?: (trigger: HTMLElement | null) => void
  onSelectCollection?: (collectionId: string) => void
  row: CollectionRow
}): React.ReactElement {
  const isActive = activeCollection === row.collection.id
  const content = (
    <>
      <CollectionIcon color={row.collection.color} icon={row.collection.icon} />
      <SidebarMenuButtonLabel>{row.collection.name}</SidebarMenuButtonLabel>
    </>
  )
  const handleNavigation = (): void => {
    onSelectCollection?.(row.collection.id)
    onNavigate?.()
  }

  if (nested) {
    return (
      <SidebarMenuSubItem className="group/menu-item">
        <SidebarMenuSubButton
          className="peer/menu-button pe-7"
          isActive={isActive}
          onClick={handleNavigation}
          render={<button aria-label={row.collection.name} type="button" />}
        >
          {content}
        </SidebarMenuSubButton>
        <CollectionRowMenu onDelete={onDelete} onEdit={onEdit} row={row} />
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={handleNavigation}
        tooltip={row.path}
      >
        {content}
      </SidebarMenuButton>
      <CollectionRowMenu
        onDelete={onDelete}
        onEdit={onEdit}
        onNewNested={onNewNested}
        row={row}
      />
    </SidebarMenuItem>
  )
}

function CollectionRows({
  activeCollection,
  bookmarks,
  collapsed,
  collections,
  onDelete,
  onEdit,
  onNavigate,
  onNewNested,
  onSelectCollection,
  orderMode,
}: {
  activeCollection: string | null
  bookmarks: readonly MockBookmark[]
  collapsed: boolean
  collections: readonly Collection[]
  onDelete: (collectionId: string, trigger: HTMLElement | null) => void
  onEdit: (collectionId: string, trigger: HTMLElement | null) => void
  onNavigate?: () => void
  onNewNested: (parentId: string, trigger: HTMLElement | null) => void
  onSelectCollection?: (collectionId: string) => void
  orderMode: CollectionOrderMode
}): React.ReactElement {
  const collectionIndex = createCollectionIndex(
    collections,
    bookmarks,
    orderMode
  )
  const rowsById = new Map(
    collectionIndex.rows.map((row) => [row.collection.id, row])
  )
  const groups = collapsed
    ? collectionIndex.rows.map((row) => ({ children: [], row }))
    : collectionIndex.roots.map((root) => ({
        children: root.children,
        row: rowsById.get(root.collection.id) as CollectionRow,
      }))

  return (
    <SidebarMenu>
      {groups.map(({ children, row }) => (
        <React.Fragment key={row.collection.id}>
          <CollectionNavigationRow
            activeCollection={activeCollection}
            onDelete={(trigger) => onDelete(row.collection.id, trigger)}
            onEdit={(trigger) => onEdit(row.collection.id, trigger)}
            onNavigate={onNavigate}
            onNewNested={
              row.depth === 0
                ? (trigger) => onNewNested(row.collection.id, trigger)
                : undefined
            }
            onSelectCollection={onSelectCollection}
            row={row}
          />
          {!collapsed && children.length > 0 ? (
            <SidebarMenuSub>
              {children.map((child) => {
                const childRow = rowsById.get(
                  child.collection.id
                ) as CollectionRow

                return (
                  <CollectionNavigationRow
                    activeCollection={activeCollection}
                    key={child.collection.id}
                    nested
                    onDelete={(trigger) =>
                      onDelete(child.collection.id, trigger)
                    }
                    onEdit={(trigger) => onEdit(child.collection.id, trigger)}
                    onNavigate={onNavigate}
                    onSelectCollection={onSelectCollection}
                    row={childRow}
                  />
                )
              })}
            </SidebarMenuSub>
          ) : null}
        </React.Fragment>
      ))}
    </SidebarMenu>
  )
}

export function CollectionSidebarSection({
  activeCollection,
  bookmarks,
  collapsed,
  collections,
  isOpen,
  isReordering: controlledIsReordering,
  onCreateCollection,
  onDeleteCollection,
  onMoveCollection,
  onNavigate,
  onOpenChange,
  onReorderingChange,
  onSelectCollection,
  onUpdateCollection,
}: {
  activeCollection: string | null
  bookmarks: readonly MockBookmark[]
  collapsed: boolean
  collections: readonly Collection[]
  isOpen: boolean
  isReordering?: boolean
  onCreateCollection?: CollectionManagementHandlers["onCreateCollection"]
  onDeleteCollection?: CollectionManagementHandlers["onDeleteCollection"]
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onNavigate?: () => void
  onOpenChange: (open: boolean) => void
  onReorderingChange?: (reordering: boolean) => void
  onSelectCollection?: (collectionId: string) => void
  onUpdateCollection?: CollectionManagementHandlers["onUpdateCollection"]
}): React.ReactElement {
  const [orderMode, setOrderMode] =
    React.useState<CollectionOrderMode>("newest")
  const [localIsReordering, setLocalIsReordering] = React.useState(false)
  const isReordering = controlledIsReordering ?? localIsReordering
  const setIsReordering = (reordering: boolean): void => {
    setLocalIsReordering(reordering)
    onReorderingChange?.(reordering)
  }
  const [editor, setEditor] = React.useState<CollectionEditorRequest | null>(
    null
  )
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const createButtonRef = React.useRef<HTMLButtonElement>(null)
  const sectionHeaderRef = React.useRef<HTMLButtonElement>(null)
  const returnFocusRef = React.useRef<HTMLElement | null>(null)
  const restoreFocus = (): void => {
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }

  return (
    <>
      <SidebarGroup>
        <Collapsible
          disabled={collapsed}
          onOpenChange={(open) => {
            if (!open) setIsReordering(false)
            onOpenChange(open)
          }}
          open={isOpen}
        >
          <div className="group/collection-header flex items-center">
            <CollapsibleTrigger
              inert={collapsed}
              render={
                <SidebarGroupLabel
                  className="min-w-0 flex-1 gap-1 px-2 data-panel-open:*:data-[slot=collections-indicator]:rotate-180"
                  render={
                    <button
                      aria-label="Collections"
                      ref={sectionHeaderRef}
                      type="button"
                    />
                  }
                />
              }
            >
              <span className="truncate">
                {isReordering ? "Reordering collections" : "Collections"}
              </span>
              {!isReordering ? (
                <CaretDownIcon
                  className="size-3.5 shrink-0 opacity-70 transition-[opacity,transform] duration-200 group-data-[collapsible=icon]:hidden min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/collection-header:opacity-70 min-[800px]:pointer-fine:group-has-focus-visible/collection-header:opacity-70 min-[800px]:pointer-fine:group-has-data-popup-open/collection-header:opacity-70"
                  data-slot="collections-indicator"
                  weight="regular"
                />
              ) : null}
            </CollapsibleTrigger>
            <SidebarGroupActions
              className={cn(
                "transition-opacity duration-100",
                isReordering
                  ? "opacity-100"
                  : "opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/collection-header:opacity-100 min-[800px]:pointer-fine:group-has-focus-visible/collection-header:opacity-100 min-[800px]:pointer-fine:group-has-data-popup-open/collection-header:opacity-100",
                collapsed && "pointer-events-none opacity-0"
              )}
              inert={collapsed}
            >
              {isReordering ? (
                <Button
                  onClick={() => setIsReordering(false)}
                  size="xs"
                  variant="secondary"
                >
                  Done
                </Button>
              ) : (
                <>
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          aria-label="Collection options"
                          size="icon-xs"
                          variant="ghost"
                        />
                      }
                    >
                      <OverflowMenuIcon />
                    </MenuTrigger>
                    <MenuPopup align="start" side="right">
                      <MenuRadioGroup
                        onValueChange={(value) =>
                          setOrderMode(value as CollectionOrderMode)
                        }
                        value={orderMode}
                      >
                        <MenuGroupLabel>Order by</MenuGroupLabel>
                        <MenuRadioItem value="newest">Newest</MenuRadioItem>
                        <MenuRadioItem value="alpha">
                          Alphabetical
                        </MenuRadioItem>
                        <MenuRadioItem value="custom">Custom</MenuRadioItem>
                      </MenuRadioGroup>
                      <MenuSeparator />
                      <MenuItem
                        disabled={orderMode !== "custom"}
                        onClick={() => setIsReordering(true)}
                      >
                        <DotsSixVerticalIcon aria-hidden="true" weight="bold" />
                        Reorder collections
                      </MenuItem>
                    </MenuPopup>
                  </Menu>
                  <Button
                    aria-label="New collection"
                    onClick={() => {
                      returnFocusRef.current = createButtonRef.current
                      setEditor({ mode: "create", parentId: null })
                    }}
                    ref={createButtonRef}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <PlusIcon aria-hidden="true" weight="regular" />
                  </Button>
                </>
              )}
            </SidebarGroupActions>
          </div>
          <CollapsiblePanel>
            <SidebarGroupContent>
              {isReordering ? (
                <CollectionReorderList
                  collections={collections}
                  onMove={(sourceId, parentId, index) =>
                    onMoveCollection?.(sourceId, parentId, index)
                  }
                />
              ) : (
                <CollectionRows
                  activeCollection={activeCollection}
                  bookmarks={bookmarks}
                  collapsed={collapsed}
                  collections={collections}
                  onDelete={(collectionId) => {
                    returnFocusRef.current = sectionHeaderRef.current
                    setDeletingId(collectionId)
                  }}
                  onEdit={(collectionId, trigger) => {
                    returnFocusRef.current = trigger
                    setEditor({ collectionId, mode: "edit" })
                  }}
                  onNavigate={onNavigate}
                  onNewNested={(parentId, trigger) => {
                    returnFocusRef.current = trigger
                    setEditor({ mode: "create", parentId })
                  }}
                  onSelectCollection={onSelectCollection}
                  orderMode={orderMode}
                />
              )}
            </SidebarGroupContent>
          </CollapsiblePanel>
        </Collapsible>
      </SidebarGroup>
      <CollectionEditorDialog
        collections={collections}
        onCreate={(draft, reopenDraft, retryCollectionId) =>
          onCreateCollection?.(draft, reopenDraft, retryCollectionId)
        }
        onOpenChange={(open) => {
          if (!open) {
            setEditor(null)
            restoreFocus()
          }
        }}
        onRetryRequest={setEditor}
        onUpdate={(collectionId, draft, reopenDraft) =>
          onUpdateCollection?.(collectionId, draft, reopenDraft)
        }
        request={editor}
      />
      <CollectionDeleteDialog
        bookmarks={bookmarks}
        collectionId={deletingId}
        collections={collections}
        key={deletingId ?? "no-collection-delete"}
        onDelete={(collectionId, reopenDelete) =>
          onDeleteCollection?.(collectionId, reopenDelete) ??
          Promise.resolve(false)
        }
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null)
            restoreFocus()
          }
        }}
        onRetryRequest={setDeletingId}
      />
    </>
  )
}
