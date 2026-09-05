import {
  BookmarkIcon,
  CaretUpDownIcon,
  DotsSixVerticalIcon,
  FolderSimpleDashedIcon,
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
import { CollectionSidebarSection } from "@/dev/dashboard-ui/collection-sidebar-section"
import {
  DashboardCommand,
  DashboardCommandButton,
} from "@/dev/dashboard-ui/command"
import type {
  CollectionManagementHandlers,
  TagManagementHandlers,
} from "@/dev/dashboard-ui/dashboard-management-state"
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
import type { Tag } from "@/dev/dashboard-ui/tag-model"
import { TagSidebarSection } from "@/dev/dashboard-ui/tag-sidebar-section"
import { easeOutStrong } from "@/lib/motion"
import { cn } from "@/lib/utils"

const EMPTY_TAG_IDS: ReadonlySet<string> = new Set()

function getShowTagResultsLabel(
  activeTagCount: number,
  resultCount: number
): string {
  if (activeTagCount === 0) return "Show all bookmarks"
  return `Show ${resultCount} ${resultCount === 1 ? "bookmark" : "bookmarks"}`
}

/**
 * Sidebar shell + content, mounted inside a plain, non-fixed <aside> —
 * unlike the real Sidebar primitive's fixed-to-viewport usage. Manually
 * replicates the width/data-collapsible contract that primitive's
 * exported Sidebar component normally provides, since this composition
 * lives inside the bounded 896px shell instead. See
 * spec/sessions/session-02.md for why.
 */
export function DashboardSidebar({
  activeTagIds = EMPTY_TAG_IDS,
  activeCollection = null,
  allBookmarksActive = activeCollection === null,
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
  onOpenSettings,
  onSelectAllBookmarks,
  onSelectCollection,
  onSelectTrash,
  onSelectUncollected,
  onSortChange,
  onStartReorder,
  onTagActiveChange,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  tagFilterResultCount = bookmarks.length,
  trashActive = false,
  uncollectedActive = false,
  viewMode,
}: {
  activeTagIds?: ReadonlySet<string>
  initialDisclosures: DashboardNavigationDisclosures
  activeCollection?: string | null
  allBookmarksActive?: boolean
  bookmarks?: readonly MockBookmark[]
  canReorder?: boolean
  collections?: readonly Collection[]
  tags?: readonly Tag[]
  isReordering?: boolean
  onNavigate?: () => void
  onCreateCollection?: CollectionManagementHandlers["onCreateCollection"]
  onCreateTag?: TagManagementHandlers["onCreateTag"]
  onDeleteCollection?: CollectionManagementHandlers["onDeleteCollection"]
  onDeleteTag?: TagManagementHandlers["onDeleteTag"]
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onOpenSettings?: (trigger: HTMLButtonElement) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSelectTrash?: () => void
  onSelectUncollected?: () => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onTagActiveChange?: (tagId: string, active: boolean) => void
  onUpdateCollection?: CollectionManagementHandlers["onUpdateCollection"]
  onUpdateTag?: TagManagementHandlers["onUpdateTag"]
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  tagFilterResultCount?: number
  trashActive?: boolean
  uncollectedActive?: boolean
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
        activeTagIds={activeTagIds}
        activeCollection={activeCollection}
        allBookmarksActive={allBookmarksActive}
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
        onOpenSettings={onOpenSettings}
        onSelectAllBookmarks={onSelectAllBookmarks}
        onSelectCollection={onSelectCollection}
        onSelectTrash={onSelectTrash}
        onSelectUncollected={onSelectUncollected}
        onSortChange={onSortChange}
        onStartReorder={onStartReorder}
        onTagActiveChange={onTagActiveChange}
        onUpdateCollection={onUpdateCollection}
        onUpdateTag={onUpdateTag}
        onViewModeChange={onViewModeChange}
        sort={sort}
        surface="desktop"
        tagFilterResultCount={tagFilterResultCount}
        tags={tags}
        trashActive={trashActive}
        uncollectedActive={uncollectedActive}
        viewMode={viewMode}
      />
    </aside>
  )
}

export function MobileDashboardNavigation({
  activeTagIds = EMPTY_TAG_IDS,
  activeCollection = null,
  allBookmarksActive = activeCollection === null,
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
  onOpenSettings,
  onSelectAllBookmarks,
  onSelectCollection,
  onSelectTrash,
  onSelectUncollected,
  onSortChange,
  onStartReorder,
  onTagActiveChange,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  tagFilterResultCount = bookmarks.length,
  trashActive = false,
  uncollectedActive = false,
  viewMode,
}: {
  activeTagIds?: ReadonlySet<string>
  initialDisclosures: DashboardNavigationDisclosures
  activeCollection?: string | null
  allBookmarksActive?: boolean
  bookmarks?: readonly MockBookmark[]
  canReorder?: boolean
  collections?: readonly Collection[]
  tags?: readonly Tag[]
  isReordering?: boolean
  onNavigate?: () => void
  onCreateCollection?: CollectionManagementHandlers["onCreateCollection"]
  onDeleteCollection?: CollectionManagementHandlers["onDeleteCollection"]
  onCreateTag?: TagManagementHandlers["onCreateTag"]
  onDeleteTag?: TagManagementHandlers["onDeleteTag"]
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onOpenSettings?: (trigger: HTMLButtonElement) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSelectTrash?: () => void
  onSelectUncollected?: () => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onTagActiveChange?: (tagId: string, active: boolean) => void
  onUpdateCollection?: CollectionManagementHandlers["onUpdateCollection"]
  onUpdateTag?: TagManagementHandlers["onUpdateTag"]
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  tagFilterResultCount?: number
  trashActive?: boolean
  uncollectedActive?: boolean
  viewMode: ViewMode
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [displayOpen, setDisplayOpen] = React.useState(false)
  const navigationTriggerRef = React.useRef<HTMLButtonElement>(null)
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
            ref={navigationTriggerRef}
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
            activeTagIds={activeTagIds}
            activeCollection={activeCollection}
            allBookmarksActive={allBookmarksActive}
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
            onOpenSettings={onOpenSettings}
            onSelectAllBookmarks={onSelectAllBookmarks}
            onSelectCollection={onSelectCollection}
            onSelectTrash={onSelectTrash}
            onSelectUncollected={onSelectUncollected}
            onSortChange={onSortChange}
            onStartReorder={onStartReorder}
            onTagActiveChange={onTagActiveChange}
            onShowTagResults={() => {
              if (activeTagIds.size === 0) onSelectAllBookmarks?.()
              setOpen(false)
              requestAnimationFrame(() => navigationTriggerRef.current?.focus())
            }}
            onUpdateCollection={onUpdateCollection}
            onUpdateTag={onUpdateTag}
            onViewModeChange={onViewModeChange}
            sort={sort}
            surface="mobile"
            tagFilterResultCount={tagFilterResultCount}
            tags={tags}
            trashActive={trashActive}
            uncollectedActive={uncollectedActive}
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

interface DashboardNavigationFooterActions {
  onNavigate: () => void
  onOpenDisplay?: () => void
  onOpenSettings?: (trigger: HTMLButtonElement) => void
  onSelectTrash?: () => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onViewModeChange: (viewMode: ViewMode) => void
}

interface DashboardNavigationFooterState {
  activeCollection: string | null
  canReorder: boolean
  isReordering: boolean
  sort: SortOption
  surface: DashboardNavigationSurface
  trashActive: boolean
  viewMode: ViewMode
}

function DashboardNavigationFooter({
  actions,
  state,
}: {
  actions: DashboardNavigationFooterActions
  state: DashboardNavigationFooterState
}): React.ReactElement {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          {state.surface === "mobile" && actions.onOpenDisplay ? (
            <SidebarMenuButton
              disabled={state.isReordering}
              onClick={actions.onOpenDisplay}
              tooltip="Display"
            >
              <SlidersHorizontalIcon weight="duotone" />
              <SidebarMenuButtonLabel>Display</SidebarMenuButtonLabel>
              <CaretUpDownIcon
                aria-hidden="true"
                className="ms-auto opacity-70 transition-opacity duration-100 min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/menu-item:opacity-70 min-[800px]:pointer-fine:group-has-focus-visible/menu-item:opacity-70 min-[800px]:pointer-fine:group-has-data-popup-open/menu-item:opacity-70"
                data-slot="display-menu-indicator"
                weight="regular"
              />
            </SidebarMenuButton>
          ) : (
            <Menu>
              <MenuTrigger
                render={
                  <SidebarMenuButton
                    data-dashboard-display-trigger
                    disabled={state.isReordering}
                    tooltip="Display"
                  />
                }
              >
                <SlidersHorizontalIcon weight="duotone" />
                <SidebarMenuButtonLabel>Display</SidebarMenuButtonLabel>
                <CaretUpDownIcon
                  aria-hidden="true"
                  className="ms-auto opacity-70 transition-opacity duration-100 group-data-[collapsible=icon]:hidden min-[800px]:pointer-fine:opacity-0 min-[800px]:pointer-fine:group-hover/menu-item:opacity-70 min-[800px]:pointer-fine:group-has-focus-visible/menu-item:opacity-70 min-[800px]:pointer-fine:group-has-data-popup-open/menu-item:opacity-70"
                  data-slot="display-menu-indicator"
                  weight="regular"
                />
              </MenuTrigger>
              <MenuPopup align="end" side="right">
                <MenuRadioGroup
                  onValueChange={(value) =>
                    actions.onSortChange(value as SortOption)
                  }
                  value={state.sort}
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
                  {state.activeCollection ? (
                    <MenuRadioItem closeOnClick value="custom">
                      Custom order
                    </MenuRadioItem>
                  ) : null}
                </MenuRadioGroup>
                <MenuSeparator />
                <MenuRadioGroup
                  onValueChange={(value) =>
                    actions.onViewModeChange(value as ViewMode)
                  }
                  value={state.viewMode}
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
                {state.activeCollection ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>Order</MenuGroupLabel>
                      <MenuItem
                        closeOnClick
                        disabled={!state.canReorder}
                        onClick={actions.onStartReorder}
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
          <SidebarMenuButton
            isActive={state.trashActive}
            onClick={() => {
              actions.onSelectTrash?.()
              actions.onNavigate()
            }}
            tooltip="Trash"
          >
            <TrashIcon weight="duotone" />
            <SidebarMenuButtonLabel>Trash</SidebarMenuButtonLabel>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={(event) => actions.onOpenSettings?.(event.currentTarget)}
            tooltip="Settings"
          >
            <GearIcon weight="duotone" />
            <SidebarMenuButtonLabel>Settings</SidebarMenuButtonLabel>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

function DashboardNavigationContent({
  activeTagIds,
  activeCollection,
  allBookmarksActive,
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
  onOpenSettings,
  onSelectAllBookmarks,
  onSelectCollection,
  onSelectTrash,
  onSelectUncollected,
  onSortChange,
  onStartReorder,
  onTagActiveChange,
  onShowTagResults,
  onUpdateCollection,
  onUpdateTag,
  onViewModeChange,
  sort,
  surface,
  tagFilterResultCount,
  tags,
  trashActive,
  uncollectedActive,
  viewMode,
}: {
  activeTagIds: ReadonlySet<string>
  activeCollection: string | null
  allBookmarksActive: boolean
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
  onCreateCollection?: CollectionManagementHandlers["onCreateCollection"]
  onCreateTag?: TagManagementHandlers["onCreateTag"]
  onDeleteCollection?: CollectionManagementHandlers["onDeleteCollection"]
  onDeleteTag?: TagManagementHandlers["onDeleteTag"]
  onMoveCollection?: (
    sourceId: string,
    parentId: string | null,
    index: number
  ) => void
  onMoveTag?: (sourceId: string, index: number) => void
  onNavigate?: () => void
  onOpenCommand?: () => void
  onOpenDisplay?: () => void
  onOpenSettings?: (trigger: HTMLButtonElement) => void
  onSelectAllBookmarks?: () => void
  onSelectCollection?: (collection: string) => void
  onSelectTrash?: () => void
  onSelectUncollected?: () => void
  onSortChange: (sort: SortOption) => void
  onStartReorder?: () => void
  onTagActiveChange?: (tagId: string, active: boolean) => void
  onShowTagResults?: () => void
  onUpdateCollection?: CollectionManagementHandlers["onUpdateCollection"]
  onUpdateTag?: TagManagementHandlers["onUpdateTag"]
  onViewModeChange: (viewMode: ViewMode) => void
  sort: SortOption
  surface: DashboardNavigationSurface
  tagFilterResultCount: number
  trashActive: boolean
  uncollectedActive: boolean
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
                  isActive={allBookmarksActive}
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={uncollectedActive}
                  onClick={() => {
                    onSelectUncollected?.()
                    handleNavigate()
                  }}
                  tooltip="Uncollected"
                >
                  <FolderSimpleDashedIcon weight="duotone" />
                  <SidebarMenuButtonLabel>Uncollected</SidebarMenuButtonLabel>
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
          isOpen={collapsed || disclosures.collections}
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
          activeTagIds={activeTagIds}
          bookmarks={bookmarks}
          collapsed={collapsed}
          isOpen={collapsed || disclosures.tags}
          isReordering={reorderingSection === "tags"}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onMoveTag={onMoveTag}
          onOpenChange={(open) => onDisclosureChange("tags", open)}
          onReorderingChange={(reordering) =>
            setReorderingSection(reordering ? "tags" : null)
          }
          onTagActiveChange={(tagId, active) =>
            onTagActiveChange?.(tagId, active)
          }
          onUpdateTag={onUpdateTag}
          tags={tags}
        />
      </SidebarContent>
      {surface === "mobile" && activeTagIds.size > 0 ? (
        <div className="border-t border-sidebar-border px-2 pt-2">
          <Button className="w-full" onClick={onShowTagResults}>
            {getShowTagResultsLabel(activeTagIds.size, tagFilterResultCount)}
          </Button>
        </div>
      ) : null}
      <DashboardNavigationFooter
        actions={{
          onNavigate: handleNavigate,
          onOpenDisplay,
          onOpenSettings,
          onSelectTrash,
          onSortChange,
          onStartReorder,
          onViewModeChange,
        }}
        state={{
          activeCollection,
          canReorder,
          isReordering,
          sort,
          surface,
          trashActive,
          viewMode,
        }}
      />
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
