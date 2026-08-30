import {
  CaretDownIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
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
  type TagDraft,
  type TagOrderMode,
} from "@/dev/dashboard-ui/tag-model"
import { TagReorderList } from "@/dev/dashboard-ui/tag-reorder"
import { cn } from "@/lib/utils"

function TagRow({
  onDelete,
  onEdit,
  onNavigate,
  tag,
}: {
  onDelete: () => void
  onEdit: () => void
  onNavigate?: () => void
  tag: Tag
}): React.ReactElement {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={onNavigate} tooltip={tag.name}>
        <TagIcon color={tag.color} />
        <SidebarMenuButtonLabel>{tag.name}</SidebarMenuButtonLabel>
      </SidebarMenuButton>
      <Menu>
        <MenuTrigger
          render={
            <SidebarMenuAction
              aria-label={`Actions for ${tag.name}`}
              showOnHover
            />
          }
        >
          <DotsThreeIcon aria-hidden="true" weight="bold" />
        </MenuTrigger>
        <MenuPopup align="start" side="right">
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
    </SidebarMenuItem>
  )
}

export function TagSidebarSection({
  bookmarks,
  collapsed,
  isOpen,
  isReordering: controlledIsReordering,
  onCreateTag,
  onDeleteTag,
  onMoveTag,
  onNavigate,
  onOpenChange,
  onReorderingChange,
  onUpdateTag,
  tags,
}: {
  bookmarks: readonly MockBookmark[]
  collapsed: boolean
  isOpen: boolean
  isReordering?: boolean
  onCreateTag?: (draft: TagDraft) => void
  onDeleteTag?: (tagId: string) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onNavigate?: () => void
  onOpenChange: (open: boolean) => void
  onReorderingChange?: (reordering: boolean) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
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
                  render={<button aria-label="Tags" type="button" />}
                />
              }
            >
              <span className="truncate">
                {isReordering ? "Reordering tags" : "Tags"}
              </span>
              {!isReordering ? (
                <CaretDownIcon
                  className="size-3.5 shrink-0 opacity-70 transition-transform duration-200"
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
                  : "opacity-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-focus-within/tag-header:opacity-100 min-[800px]:pointer-fine:group-hover/tag-header:opacity-100",
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
                      <DotsThreeIcon aria-hidden="true" weight="bold" />
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
                    onClick={() => setEditor({ mode: "create" })}
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
                      key={tag.id}
                      onDelete={() => setDeletingId(tag.id)}
                      onEdit={() => setEditor({ mode: "edit", tagId: tag.id })}
                      onNavigate={onNavigate}
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
        onCreate={(draft) => onCreateTag?.(draft)}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onUpdate={(tagId, draft) => onUpdateTag?.(tagId, draft)}
        request={editor}
        tags={tags}
      />
      <TagDeleteDialog
        bookmarks={bookmarks}
        onDelete={(tagId) => onDeleteTag?.(tagId)}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        tagId={deletingId}
        tags={tags}
      />
    </>
  )
}
