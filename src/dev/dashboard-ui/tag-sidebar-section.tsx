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
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { TagManagementHandlers } from "@/dev/dashboard-ui/dashboard-management-state"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import { TagIcon } from "@/dev/dashboard-ui/tag-icon"
import {
  TagDeleteDialog,
  TagEditorDialog,
  type TagEditorRequest,
} from "@/dev/dashboard-ui/tag-management"
import {
  sortTags,
  type Tag,
  type TagOrderMode,
} from "@/dev/dashboard-ui/tag-model"
import { TagReorderList } from "@/dev/dashboard-ui/tag-reorder"
import { cn } from "@/lib/utils"

function TagRow({
  active,
  onDelete,
  onEdit,
  onTagActiveChange,
  tag,
}: {
  active: boolean
  onDelete: (trigger: HTMLElement | null) => void
  onEdit: (trigger: HTMLElement | null) => void
  onTagActiveChange: (active: boolean) => void
  tag: Tag
}): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-label={`Filter by ${tag.name}`}
        aria-pressed={active}
        isActive={active}
        onClick={() => onTagActiveChange(!active)}
        tooltip={tag.name}
      >
        <TagIcon color={tag.color} />
        <SidebarMenuButtonLabel>{tag.name}</SidebarMenuButtonLabel>
      </SidebarMenuButton>
      <Menu>
        <MenuTrigger
          render={
            <SidebarMenuAction
              aria-label={`Actions for ${tag.name}`}
              ref={triggerRef}
              showOnHover
            />
          }
        >
          <OverflowMenuIcon />
        </MenuTrigger>
        <MenuPopup align="start" side="right">
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
    </SidebarMenuItem>
  )
}

export function TagSidebarSection({
  activeTagIds,
  bookmarks,
  collapsed,
  isOpen,
  isReordering: controlledIsReordering,
  onCreateTag,
  onDeleteTag,
  onMoveTag,
  onOpenChange,
  onReorderingChange,
  onTagActiveChange,
  onUpdateTag,
  tags,
}: {
  activeTagIds: ReadonlySet<string>
  bookmarks: readonly MockBookmark[]
  collapsed: boolean
  isOpen: boolean
  isReordering?: boolean
  onCreateTag?: TagManagementHandlers["onCreateTag"]
  onDeleteTag?: TagManagementHandlers["onDeleteTag"]
  onMoveTag?: (sourceId: string, index: number) => void
  onOpenChange: (open: boolean) => void
  onReorderingChange?: (reordering: boolean) => void
  onTagActiveChange: (tagId: string, active: boolean) => void
  onUpdateTag?: TagManagementHandlers["onUpdateTag"]
  tags: readonly Tag[]
}): React.ReactElement {
  const [orderMode, setOrderMode] = React.useState<TagOrderMode>("alpha")
  const [localIsReordering, setLocalIsReordering] = React.useState(false)
  const isReordering = controlledIsReordering ?? localIsReordering
  const setIsReordering = (reordering: boolean): void => {
    setLocalIsReordering(reordering)
    onReorderingChange?.(reordering)
  }
  const [editor, setEditor] = React.useState<TagEditorRequest | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const createButtonRef = React.useRef<HTMLButtonElement>(null)
  const sectionHeaderRef = React.useRef<HTMLButtonElement>(null)
  const returnFocusRef = React.useRef<HTMLElement | null>(null)
  const restoreFocus = (): void => {
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }
  const orderedTags = sortTags(tags, orderMode)

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
          <div className="group/tag-header flex items-center">
            <CollapsibleTrigger
              inert={collapsed}
              render={
                <SidebarGroupLabel
                  className="min-w-0 flex-1 gap-1 px-2 data-panel-open:*:data-[slot=tags-indicator]:rotate-180"
                  render={
                    <button
                      aria-label="Tags"
                      ref={sectionHeaderRef}
                      type="button"
                    />
                  }
                />
              }
            >
              <span className="truncate">
                {isReordering ? "Reordering tags" : "Tags"}
              </span>
              {!isReordering ? (
                <CaretDownIcon
                  className="size-3.5 shrink-0 opacity-70 transition-[opacity,transform] duration-200 group-data-[collapsible=icon]:hidden min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/tag-header:opacity-70 min-[800px]:pointer-fine:group-has-focus-visible/tag-header:opacity-70 min-[800px]:pointer-fine:group-has-data-popup-open/tag-header:opacity-70"
                  data-slot="tags-indicator"
                  weight="regular"
                />
              ) : null}
            </CollapsibleTrigger>
            <SidebarGroupActions
              className={cn(
                "transition-opacity duration-100",
                isReordering
                  ? "opacity-100"
                  : "opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/tag-header:opacity-100 min-[800px]:pointer-fine:group-has-focus-visible/tag-header:opacity-100 min-[800px]:pointer-fine:group-has-data-popup-open/tag-header:opacity-100",
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
                          aria-label="Tag options"
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
                          setOrderMode(value as TagOrderMode)
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
                        Reorder tags
                      </MenuItem>
                    </MenuPopup>
                  </Menu>
                  <Button
                    aria-label="New tag"
                    onClick={() => {
                      returnFocusRef.current = createButtonRef.current
                      setEditor({ mode: "create" })
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
                <TagReorderList
                  onMove={(sourceId, index) => onMoveTag?.(sourceId, index)}
                  tags={tags}
                />
              ) : orderedTags.length > 0 ? (
                <SidebarMenu>
                  {orderedTags.map((tag) => (
                    <TagRow
                      active={activeTagIds.has(tag.id)}
                      key={tag.id}
                      onDelete={() => {
                        returnFocusRef.current = sectionHeaderRef.current
                        setDeletingId(tag.id)
                      }}
                      onEdit={(trigger) => {
                        returnFocusRef.current = trigger
                        setEditor({ mode: "edit", tagId: tag.id })
                      }}
                      onTagActiveChange={(active) =>
                        onTagActiveChange(tag.id, active)
                      }
                      tag={tag}
                    />
                  ))}
                </SidebarMenu>
              ) : (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No tags yet
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </CollapsiblePanel>
        </Collapsible>
      </SidebarGroup>
      <TagEditorDialog
        onCreate={(draft, reopenDraft, retryTagId) =>
          onCreateTag?.(draft, reopenDraft, retryTagId)
        }
        onOpenChange={(open) => {
          if (!open) {
            setEditor(null)
            restoreFocus()
          }
        }}
        onRetryRequest={setEditor}
        onUpdate={(tagId, draft, reopenDraft) =>
          onUpdateTag?.(tagId, draft, reopenDraft)
        }
        request={editor}
        tags={tags}
      />
      <TagDeleteDialog
        bookmarks={bookmarks}
        key={deletingId ?? "no-tag-delete"}
        onDelete={(tagId, reopenDelete) =>
          onDeleteTag?.(tagId, reopenDelete) ?? Promise.resolve(false)
        }
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null)
            restoreFocus()
          }
        }}
        onRetryRequest={setDeletingId}
        tagId={deletingId}
        tags={tags}
      />
    </>
  )
}
