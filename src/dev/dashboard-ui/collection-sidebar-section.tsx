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
  type CollectionDraft,
  type CollectionEditorRequest,
} from "@/dev/dashboard-ui/collection-management"
import { CollectionReorderList } from "@/dev/dashboard-ui/collection-reorder"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { cn } from "@/lib/utils"

function CollectionRowMenu({
  onDelete,
  onEdit,
  onNewNested,
  row,
}: {
  onDelete: () => void
  onEdit: () => void
  onNewNested?: () => void
  row: CollectionRow
}): React.ReactElement {
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
              showOnHover
            />
          }
        >
          <OverflowMenuIcon />
        </MenuTrigger>
        <MenuPopup align="start" side="right">
          {onNewNested ? (
            <MenuItem onClick={onNewNested}>
              <PlusIcon aria-hidden="true" weight="regular" />
              New nested collection
            </MenuItem>
          ) : null}
          <MenuItem onClick={onEdit}>
            <PencilSimpleIcon aria-hidden="true" weight="duotone" />
            Edit
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={onDelete} variant="destructive">
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
  onDelete: () => void
  onEdit: () => void
  onNavigate?: () => void
  onNewNested?: () => void
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
  onDelete: (collectionId: string) => void
  onEdit: (collectionId: string) => void
  onNavigate?: () => void
  onNewNested: (parentId: string) => void
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
            onDelete={() => onDelete(row.collection.id)}
            onEdit={() => onEdit(row.collection.id)}
            onNavigate={onNavigate}
            onNewNested={
              row.depth === 0 ? () => onNewNested(row.collection.id) : undefined
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
                    onDelete={() => onDelete(child.collection.id)}
                    onEdit={() => onEdit(child.collection.id)}
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
  onCreateCollection?: (draft: CollectionDraft) => void
  onDeleteCollection?: (collectionId: string) => void
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onNavigate?: () => void
  onOpenChange: (open: boolean) => void
  onReorderingChange?: (reordering: boolean) => void
  onSelectCollection?: (collectionId: string) => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
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
                  render={<button aria-label="Collections" type="button" />}
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
                    onClick={() =>
                      setEditor({ mode: "create", parentId: null })
                    }
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
                  onDelete={setDeletingId}
                  onEdit={(collectionId) =>
                    setEditor({ collectionId, mode: "edit" })
                  }
                  onNavigate={onNavigate}
                  onNewNested={(parentId) =>
                    setEditor({ mode: "create", parentId })
                  }
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
        onCreate={(draft) => onCreateCollection?.(draft)}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onUpdate={(collectionId, draft) =>
          onUpdateCollection?.(collectionId, draft)
        }
        request={editor}
      />
      <CollectionDeleteDialog
        bookmarks={bookmarks}
        collectionId={deletingId}
        collections={collections}
        onDelete={(collectionId) => onDeleteCollection?.(collectionId)}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
      />
    </>
  )
}
