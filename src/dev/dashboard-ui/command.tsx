import {
  ArrowDownIcon,
  ArrowElbowDownLeftIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react"
import { useHotkey } from "@tanstack/react-hotkeys"
import * as React from "react"

import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  SidebarMenuButton,
  SidebarMenuButtonLabel,
} from "@/components/ui/sidebar"
import { BookmarkFavicon } from "@/dev/dashboard-ui/bookmark-favicon"
import {
  createCollectionIndex,
  type Collection,
} from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import {
  mockBookmarks,
  mockCollections,
  type MockBookmark,
} from "@/dev/dashboard-ui/mock-bookmarks"

interface CommandEntry {
  collection?: Collection
  value: string
  label: string
  collectionId?: string
  domain?: string | null
  count?: number
}

interface CommandGroupData {
  value: string
  items: CommandEntry[]
}

function createCommandGroups(
  bookmarks: readonly MockBookmark[],
  collections: readonly Collection[]
): CommandGroupData[] {
  const collectionIndex = createCollectionIndex(
    collections,
    bookmarks,
    "custom"
  )

  return [
    {
      items: bookmarks.map((bookmark) => ({
        domain: bookmark.domain,
        label: bookmark.title,
        value: bookmark.id,
      })),
      value: "Bookmarks",
    },
    {
      items: collectionIndex.rows.map((row) => ({
        collection: row.collection,
        collectionId: row.collection.id,
        count: row.directCount,
        label: row.path,
        value: row.collection.id,
      })),
      value: "Collections",
    },
  ]
}

function DashboardCommandTriggerContent(): React.ReactElement {
  return (
    <>
      <MagnifyingGlassIcon weight="duotone" />
      <SidebarMenuButtonLabel className="flex flex-1 items-center justify-between gap-2">
        <span>Search</span>
        <KbdGroup className="hidden min-[800px]:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </SidebarMenuButtonLabel>
    </>
  )
}

export function DashboardCommandButton({
  onClick,
}: {
  onClick: () => void
}): React.ReactElement {
  return (
    <SidebarMenuButton
      aria-haspopup="dialog"
      onClick={onClick}
      tooltip="Search"
    >
      <DashboardCommandTriggerContent />
    </SidebarMenuButton>
  )
}

function DashboardCommandTrigger(): React.ReactElement {
  return (
    <CommandDialogTrigger render={<SidebarMenuButton tooltip="Search" />}>
      <DashboardCommandTriggerContent />
    </CommandDialogTrigger>
  )
}

/**
 * The sidebar's search row and the search-and-add command palette it
 * opens, self-contained since CommandDialogPopup portals regardless of
 * where it's mounted. Search covers bookmarks and collections per
 * feature-contract.md; direct-paste URL saving isn't wired since this
 * is a disposable, backend-less wireframe — the footer hint communicates
 * it anyway so the capability stays discoverable.
 */
export function DashboardCommand({
  bookmarks = mockBookmarks,
  collections = mockCollections,
  onNavigate,
  onOpenChange,
  onSelectCollection,
  open: controlledOpen,
  registerHotkey = true,
  showTrigger = true,
}: {
  bookmarks?: readonly MockBookmark[]
  collections?: readonly Collection[]
  onNavigate?: () => void
  onOpenChange?: (open: boolean) => void
  onSelectCollection?: (collectionId: string) => void
  open?: boolean
  registerHotkey?: boolean
  showTrigger?: boolean
}): React.ReactElement {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const open = controlledOpen ?? internalOpen
  const commandGroups = React.useMemo(
    () => createCommandGroups(bookmarks, collections),
    [bookmarks, collections]
  )
  const defaultCommandGroups = React.useMemo(
    () =>
      commandGroups.map((group) => ({
        ...group,
        items: group.items.slice(0, group.value === "Bookmarks" ? 6 : 3),
      })),
    [commandGroups]
  )

  const handleOpenChange = (nextOpen: boolean): void => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) setQuery("")
  }

  return (
    <CommandDialog onOpenChange={handleOpenChange} open={open}>
      {registerHotkey ? (
        <CommandHotkey onToggle={() => handleOpenChange(!open)} />
      ) : null}
      {showTrigger ? <DashboardCommandTrigger /> : null}
      <CommandDialogPopup backdropProps={{ forceRender: true }}>
        <Command
          items={query ? commandGroups : defaultCommandGroups}
          onValueChange={setQuery}
          value={query}
        >
          <CommandInput placeholder="Search bookmarks and collections..." />
          <CommandPanel>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandList hideScrollbar>
              {(group: CommandGroupData) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.value}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: CommandEntry) => (
                        <CommandItem
                          key={item.value}
                          onClick={() => {
                            handleOpenChange(false)
                            if (item.collectionId) {
                              onSelectCollection?.(item.collectionId)
                            }
                            onNavigate?.()
                          }}
                          value={item.value}
                        >
                          {group.value === "Bookmarks" ? (
                            <BookmarkFavicon domain={item.domain ?? null} />
                          ) : (
                            <CollectionIcon
                              className="size-4 shrink-0"
                              color={item.collection?.color}
                              icon={item.collection?.icon ?? "folder"}
                            />
                          )}
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.count !== undefined ? (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.count}
                            </span>
                          ) : null}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter className="justify-center min-[800px]:justify-between">
            <div className="hidden items-center gap-4 min-[800px]:flex">
              <div className="flex items-center gap-2">
                <KbdGroup>
                  <Kbd>
                    <ArrowUpIcon />
                  </Kbd>
                  <Kbd>
                    <ArrowDownIcon />
                  </Kbd>
                </KbdGroup>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>
                  <ArrowElbowDownLeftIcon />
                </Kbd>
                <span>Open</span>
              </div>
            </div>
            <span>Paste a link to save it instantly</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}

function CommandHotkey({
  onToggle,
}: {
  onToggle: () => void
}): React.ReactElement | null {
  useHotkey("Mod+K", onToggle)
  return null
}
