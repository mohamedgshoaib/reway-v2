import {
  BookmarkIcon,
  DotsSixVerticalIcon,
  GearIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import * as React from "react"

import { Logo } from "@/components/logo"
import { AnimatedIcon } from "@/components/ui/animated-icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerHeader,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuRadioGroup,
  DrawerMenuRadioItem,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Collection } from "@/dev/dashboard-ui/collection-hierarchy"
import type { CollectionDraft } from "@/dev/dashboard-ui/collection-management"
import { CollectionSidebarSection } from "@/dev/dashboard-ui/collection-sidebar-section"
import {
  DashboardCommand,
  DashboardCommandButton,
} from "@/dev/dashboard-ui/command"
import {
  mockBookmarks,
  mockCollections,
  mockTags,
  type SortOption,
  type ViewMode,
} from "@/dev/dashboard-ui/mock-bookmarks"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"
import {
  setDashboardNavigationPreference,
  type DashboardNavigationDisclosures,
  type DashboardNavigationSection,
  type DashboardNavigationSurface,
} from "@/dev/dashboard-ui/navigation-preferences"
import type { Tag, TagDraft } from "@/dev/dashboard-ui/tag-model"
import { TagSidebarSection } from "@/dev/dashboard-ui/tag-sidebar-section"
import { easeOutStrong } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Sidebar shell + content, mounted inside a plain, non-fixed <aside> —
 * unlike the real Sidebar primitive's fixed-to-viewport usage. Manually
 * replicates the width/data-collapsible contract that primitive's
 * exported Sidebar component normally provides, since this composition
 * lives inside the bounded 896px shell instead. See
 * spec/sessions/session-02.md for why.
 */
export function DashboardSidebar({
  activeCollection = null,
  bookmarks = mockBookmarks,
  canReorder = false,
  collections = mockCollections,
  tags = mockTags,
  initialDisclosures,
  isReordering = false,
  onNavigate,
  onCreateCollection,
  onCreateTag,
  onDeleteCollection,
  onDeleteTag,
  onMoveCollection,
  onMoveTag,
  onSelectAllBookmarks,
  onSelectCollection,
  onSortChange,
  onStartReorder,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  viewMode,
}: {
  initialDisclosures: DashboardNavigationDisclosures
  activeCollection?: string | null
  bookmarks?: readonly MockBookmark[]
  canReorder?: boolean
  collections?: readonly Collection[]
  tags?: readonly Tag[]
  isReordering?: boolean
  onNavigate?: () => void
  onCreateCollection?: (draft: CollectionDraft) => void
  onCreateTag?: (draft: TagDraft) => void
  onDeleteCollection?: (collectionId: string) => void
  onDeleteTag?: (tagId: string) => void
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  viewMode: ViewMode
}): React.ReactElement {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  const shouldReduceMotion = useReducedMotion()
  const [disclosures, setDisclosure] = useDashboardNavigationDisclosures(
    "desktop",
    initialDisclosures
  )
  return (
    <aside
      className={cn(
        "group hidden min-h-0 shrink-0 flex-col overflow-hidden min-[800px]:flex",
        collapsed ? "w-(--sidebar-width-icon)" : "w-(--sidebar-width)"
      )}
      data-collapsible={collapsed ? "icon" : ""}
    >
      <SidebarHeader>
        <div className="relative flex h-8 items-center">
          <div className="relative size-8">
            {collapsed ? (
              <Button
                aria-label="Expand sidebar"
                className="absolute inset-0 size-8"
                onClick={toggleSidebar}
                size="icon"
                variant="ghost"
              />
            ) : null}
            <AnimatedIcon
              className="pointer-events-none absolute inset-0 flex size-8 items-center justify-center"
              transitionKey={collapsed ? "expand" : "logo"}
              variant="crossfade"
            >
              {collapsed ? (
                <SidebarSimpleIcon
                  aria-hidden="true"
                  className="size-4.5"
                  weight="duotone"
                />
              ) : (
                <Logo className="size-5 text-foreground" />
              )}
            </AnimatedIcon>
          </div>
          <m.div
            animate={{ opacity: collapsed ? 0 : 1 }}
            aria-hidden={collapsed}
            className={cn(
              "absolute right-0",
              collapsed && "pointer-events-none"
            )}
            initial={false}
            inert={collapsed}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.12, ease: easeOutStrong }
            }
          >
            <SidebarTrigger aria-label="Collapse sidebar" />
          </m.div>
        </div>
      </SidebarHeader>
      <DashboardNavigationContent
        activeCollection={activeCollection}
        bookmarks={bookmarks}
        canReorder={canReorder}
        collapsed={collapsed}
        collections={collections}
        disclosures={disclosures}
        isReordering={isReordering}
        onDisclosureChange={setDisclosure}
        onNavigate={onNavigate}
        onCreateCollection={onCreateCollection}
        onCreateTag={onCreateTag}
        onDeleteCollection={onDeleteCollection}
        onDeleteTag={onDeleteTag}
        onMoveCollection={onMoveCollection}
        onMoveTag={onMoveTag}
        onSelectAllBookmarks={onSelectAllBookmarks}
        onSelectCollection={onSelectCollection}
        onSortChange={onSortChange}
        onStartReorder={onStartReorder}
        onUpdateCollection={onUpdateCollection}
        onUpdateTag={onUpdateTag}
        onViewModeChange={onViewModeChange}
        sort={sort}
        surface="desktop"
        tags={tags}
        viewMode={viewMode}
      />
    </aside>
  )
}

export function MobileDashboardNavigation({
  activeCollection = null,
  bookmarks = mockBookmarks,
  canReorder = false,
  collections = mockCollections,
  tags = mockTags,
  initialDisclosures,
  isReordering = false,
  onNavigate,
  onCreateCollection,
  onDeleteCollection,
  onCreateTag,
  onDeleteTag,
  onMoveCollection,
  onMoveTag,
  onSelectAllBookmarks,
  onSelectCollection,
  onSortChange,
  onStartReorder,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  viewMode,
}: {
  initialDisclosures: DashboardNavigationDisclosures
  activeCollection?: string | null
  bookmarks?: readonly MockBookmark[]
  canReorder?: boolean
  collections?: readonly Collection[]
  tags?: readonly Tag[]
  isReordering?: boolean
  onNavigate?: () => void
  onCreateCollection?: (draft: CollectionDraft) => void
  onDeleteCollection?: (collectionId: string) => void
  onCreateTag?: (draft: TagDraft) => void
  onDeleteTag?: (tagId: string) => void
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  viewMode: ViewMode
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [displayOpen, setDisplayOpen] = React.useState(false)
  const [disclosures, setDisclosure] = useDashboardNavigationDisclosures(
    "mobile",
    initialDisclosures
  )
  return (
    <Drawer onOpenChange={setOpen} open={open} position="left">
      <DrawerTrigger
        render={
          <Button
            aria-label="Open navigation"
            className="-ms-2 pointer-coarse:hover:bg-transparent pointer-coarse:data-pressed:bg-transparent"
            size="icon"
            variant="ghost"
          />
        }
      >
        <SidebarSimpleIcon weight="duotone" />
      </DrawerTrigger>
      <DrawerPopup
        className="ps-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)]"
        portalProps={{ keepMounted: true }}
        variant="inset"
      >
        <DrawerHeader className="relative p-4 pe-12 pt-[calc(env(safe-area-inset-top)+--spacing(4))]">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Logo className="size-5 text-foreground" />
            Navigation
          </DrawerTitle>
          <DrawerClose
            className="absolute end-2 top-[calc(env(safe-area-inset-top)+--spacing(2))]"
            render={
              <Button
                aria-label="Close navigation"
                size="icon"
                variant="ghost"
              />
            }
          >
            <XIcon weight="regular" />
          </DrawerClose>
        </DrawerHeader>
        <DrawerPanel
          className="flex min-h-0 flex-1 flex-col p-0"
          scrollable={false}
        >
          <DashboardNavigationContent
            activeCollection={activeCollection}
            bookmarks={bookmarks}
            canReorder={canReorder}
            collapsed={false}
            collections={collections}
            disclosures={disclosures}
            isReordering={isReordering}
            onDisclosureChange={setDisclosure}
            onNavigate={() => {
              onNavigate?.()
              setOpen(false)
            }}
            onCreateCollection={onCreateCollection}
            onCreateTag={onCreateTag}
            onDeleteCollection={onDeleteCollection}
            onDeleteTag={onDeleteTag}
            onMoveCollection={onMoveCollection}
            onMoveTag={onMoveTag}
            onOpenCommand={() => setCommandOpen(true)}
            onOpenDisplay={() => setDisplayOpen(true)}
            onSelectAllBookmarks={onSelectAllBookmarks}
            onSelectCollection={onSelectCollection}
            onSortChange={onSortChange}
            onStartReorder={onStartReorder}
            onUpdateCollection={onUpdateCollection}
            onUpdateTag={onUpdateTag}
            onViewModeChange={onViewModeChange}
            sort={sort}
            surface="mobile"
            tags={tags}
            viewMode={viewMode}
          />
        </DrawerPanel>
      </DrawerPopup>
      <DashboardCommand
        bookmarks={bookmarks}
        collections={collections}
        onOpenChange={setCommandOpen}
        onSelectCollection={onSelectCollection}
        open={commandOpen}
        registerHotkey
        showTrigger={false}
      />
      <MobileDisplayDialog
        activeCollection={activeCollection}
        canReorder={canReorder}
        onOpenChange={setDisplayOpen}
        onSortChange={onSortChange}
        onStartReorder={() => {
          setOpen(false)
          onStartReorder?.()
        }}
        onViewModeChange={onViewModeChange}
        open={displayOpen}
        sort={sort}
        viewMode={viewMode}
      />
    </Drawer>
  )
}

function MobileDisplayDialog({
  activeCollection,
  canReorder,
  onOpenChange,
  onSortChange,
  onStartReorder,
  onViewModeChange,
  open,
  sort,
  viewMode,
}: {
  activeCollection: string | null
  canReorder: boolean
  onOpenChange: (open: boolean) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onViewModeChange: (viewMode: ViewMode) => void
  open: boolean
  sort: SortOption
  viewMode: ViewMode
}): React.ReactElement {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup backdropProps={{ forceRender: true }} className="max-w-sm">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base">Display</DialogTitle>
        </DialogHeader>
        <DialogPanel className="px-6 pt-1 pb-6">
          <DrawerMenu>
            <DrawerMenuGroup>
              <DrawerMenuGroupLabel>Sort by</DrawerMenuGroupLabel>
              <DrawerMenuRadioGroup
                onValueChange={(value) => onSortChange(value as SortOption)}
                value={sort}
              >
                <DrawerMenuRadioItem value="date">
                  Date added
                </DrawerMenuRadioItem>
                <DrawerMenuRadioItem value="visits">
                  Most visited
                </DrawerMenuRadioItem>
                <DrawerMenuRadioItem value="alpha">
                  Alphabetical
                </DrawerMenuRadioItem>
                {activeCollection ? (
                  <DrawerMenuRadioItem value="custom">
                    Custom order
                  </DrawerMenuRadioItem>
                ) : null}
              </DrawerMenuRadioGroup>
            </DrawerMenuGroup>
            <DrawerMenuGroup className="mt-2">
              <DrawerMenuGroupLabel>View as</DrawerMenuGroupLabel>
              <DrawerMenuRadioGroup
                onValueChange={(value) => onViewModeChange(value as ViewMode)}
                value={viewMode}
              >
                <DrawerMenuRadioItem value="list">List</DrawerMenuRadioItem>
                <DrawerMenuRadioItem value="grid-image">
                  Grid with images
                </DrawerMenuRadioItem>
              </DrawerMenuRadioGroup>
            </DrawerMenuGroup>
            {activeCollection ? (
              <DrawerMenuGroup className="mt-2">
                <DrawerMenuGroupLabel>Order</DrawerMenuGroupLabel>
                <DrawerMenuItem
                  disabled={!canReorder}
                  onClick={() => {
                    onOpenChange(false)
                    onStartReorder?.()
                  }}
                >
                  <DotsSixVerticalIcon weight="bold" />
                  Reorder items
                </DrawerMenuItem>
              </DrawerMenuGroup>
            ) : null}
          </DrawerMenu>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}

function DashboardNavigationContent({
  activeCollection,
  bookmarks,
  canReorder,
  collapsed,
  collections,
  disclosures,
  isReordering,
  onDisclosureChange,
  onCreateCollection,
  onCreateTag,
  onDeleteCollection,
  onDeleteTag,
  onMoveCollection,
  onMoveTag,
  onNavigate,
  onOpenCommand,
  onOpenDisplay,
  onSelectAllBookmarks,
  onSelectCollection,
  onSortChange,
  onStartReorder,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  surface,
  tags,
  viewMode,
}: {
  activeCollection: string | null
  bookmarks: readonly MockBookmark[]
  canReorder: boolean
  collapsed: boolean
  collections: readonly Collection[]
  tags: readonly Tag[]
  disclosures: DashboardNavigationDisclosures
  isReordering: boolean
  onDisclosureChange: (
    section: DashboardNavigationSection,
    open: boolean
  ) => void
  onCreateCollection?: (draft: CollectionDraft) => void
  onCreateTag?: (draft: TagDraft) => void
  onDeleteCollection?: (collectionId: string) => void
  onDeleteTag?: (tagId: string) => void
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onNavigate?: () => void
  onOpenCommand?: () => void
  onOpenDisplay?: () => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onUpdateCollection?: (collectionId: string, draft: CollectionDraft) => void
  onUpdateTag?: (tagId: string, draft: TagDraft) => void
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  surface: DashboardNavigationSurface
  viewMode: ViewMode
}): React.ReactElement {
  const [reorderingSection, setReorderingSection] = React.useState<
    "collections" | "tags" | null
  >(null)
  const handleNavigate = (): void => {
    setReorderingSection(null)
    onNavigate?.()
  }

  return (
    <>
      <SidebarContent
        hideScrollbar
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape" || reorderingSection === null) return
          event.preventDefault()
          event.stopPropagation()
          setReorderingSection(null)
        }}
      >
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {onOpenCommand ? (
                  <DashboardCommandButton onClick={onOpenCommand} />
                ) : (
                  <DashboardCommand
                    bookmarks={bookmarks}
                    collections={collections}
                    onNavigate={handleNavigate}
                    onSelectCollection={onSelectCollection}
                    registerHotkey={false}
                  />
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeCollection === null}
                  onClick={() => {
                    onSelectAllBookmarks?.()
                    handleNavigate()
                  }}
                  tooltip="All bookmarks"
                >
                  <BookmarkIcon weight="duotone" />
                  <SidebarMenuButtonLabel>All bookmarks</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <CollectionSidebarSection
          activeCollection={activeCollection}
          bookmarks={bookmarks}
          collapsed={collapsed}
          collections={collections}
          isOpen={disclosures.collections}
          isReordering={reorderingSection === "collections"}
          onCreateCollection={onCreateCollection}
          onDeleteCollection={onDeleteCollection}
          onMoveCollection={onMoveCollection}
          onNavigate={handleNavigate}
          onOpenChange={(open) => onDisclosureChange("collections", open)}
          onReorderingChange={(reordering) =>
            setReorderingSection(reordering ? "collections" : null)
          }
          onSelectCollection={onSelectCollection}
          onUpdateCollection={onUpdateCollection}
        />
        <TagSidebarSection
          bookmarks={bookmarks}
          collapsed={collapsed}
          isOpen={disclosures.tags}
          isReordering={reorderingSection === "tags"}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onMoveTag={onMoveTag}
          onNavigate={handleNavigate}
          onOpenChange={(open) => onDisclosureChange("tags", open)}
          onReorderingChange={(reordering) =>
            setReorderingSection(reordering ? "tags" : null)
          }
          onUpdateTag={onUpdateTag}
          tags={tags}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNavigate} tooltip="Settings">
              <GearIcon weight="duotone" />
              <SidebarMenuButtonLabel>Settings</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {surface === "mobile" && onOpenDisplay ? (
              <SidebarMenuButton
                disabled={isReordering}
                onClick={onOpenDisplay}
                tooltip="Display"
              >
                <SlidersHorizontalIcon weight="duotone" />
                <SidebarMenuButtonLabel>Display</SidebarMenuButtonLabel>
              </SidebarMenuButton>
            ) : (
              <Menu>
                <MenuTrigger
                  render={
                    <SidebarMenuButton
                      data-dashboard-display-trigger
                      disabled={isReordering}
                      tooltip="Display"
                    />
                  }
                >
                  <SlidersHorizontalIcon weight="duotone" />
                  <SidebarMenuButtonLabel>Display</SidebarMenuButtonLabel>
                </MenuTrigger>
                <MenuPopup align="end" side="right">
                  <MenuRadioGroup
                    onValueChange={(value) => onSortChange(value as SortOption)}
                    value={sort}
                  >
                    <MenuGroupLabel>Sort by</MenuGroupLabel>
                    <MenuRadioItem closeOnClick value="date">
                      Date added
                    </MenuRadioItem>
                    <MenuRadioItem closeOnClick value="visits">
                      Most visited
                    </MenuRadioItem>
                    <MenuRadioItem closeOnClick value="alpha">
                      Alphabetical
                    </MenuRadioItem>
                    {activeCollection ? (
                      <MenuRadioItem closeOnClick value="custom">
                        Custom order
                      </MenuRadioItem>
                    ) : null}
                  </MenuRadioGroup>
                  <MenuSeparator />
                  <MenuRadioGroup
                    onValueChange={(value) =>
                      onViewModeChange(value as ViewMode)
                    }
                    value={viewMode}
                  >
                    <MenuGroupLabel>View as</MenuGroupLabel>
                    <MenuRadioItem closeOnClick value="list">
                      List
                    </MenuRadioItem>
                    <MenuRadioItem closeOnClick value="grid">
                      Grid
                    </MenuRadioItem>
                    <MenuRadioItem closeOnClick value="grid-image">
                      Grid with images
                    </MenuRadioItem>
                  </MenuRadioGroup>
                  {activeCollection ? (
                    <>
                      <MenuSeparator />
                      <MenuGroup>
                        <MenuGroupLabel>Order</MenuGroupLabel>
                        <MenuItem
                          closeOnClick
                          disabled={!canReorder}
                          onClick={onStartReorder}
                        >
                          <DotsSixVerticalIcon weight="bold" />
                          Reorder items
                        </MenuItem>
                      </MenuGroup>
                    </>
                  ) : null}
                </MenuPopup>
              </Menu>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNavigate} tooltip="Trash">
              <TrashIcon weight="duotone" />
              <SidebarMenuButtonLabel>Trash</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}

function useDashboardNavigationDisclosures(
  surface: DashboardNavigationSurface,
  initialDisclosures: DashboardNavigationDisclosures
): [
  DashboardNavigationDisclosures,
  (section: DashboardNavigationSection, open: boolean) => void,
] {
  const [disclosures, setDisclosures] =
    React.useState<DashboardNavigationDisclosures>(initialDisclosures)

  const setDisclosure = React.useCallback(
    (section: DashboardNavigationSection, open: boolean): void => {
      const previousOpen = disclosures[section]

      setDisclosures((current) => ({ ...current, [section]: open }))
      void setDashboardNavigationPreference({
        data: { open, section, surface },
      }).catch(() => {
        setDisclosures((current) =>
          current[section] === open
            ? { ...current, [section]: previousOpen }
            : current
        )
      })
    },
    [disclosures, surface]
  )

  return [disclosures, setDisclosure]
}
