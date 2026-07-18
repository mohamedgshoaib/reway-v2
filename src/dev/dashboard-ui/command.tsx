import {
  ArrowDownIcon,
  ArrowElbowDownLeftIcon,
  ArrowUpIcon,
  FolderIcon,
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
  mockBookmarks,
  mockCollections,
} from "@/dev/dashboard-ui/mock-bookmarks"

interface CommandEntry {
  value: string
  label: string
  domain?: string | null
  count?: number
}

interface CommandGroupData {
  value: string
  items: CommandEntry[]
}

const commandGroups: CommandGroupData[] = [
  {
    items: mockBookmarks.map((bookmark) => ({
      domain: bookmark.domain,
      label: bookmark.title,
      value: bookmark.id,
    })),
    value: "Bookmarks",
  },
  {
    items: mockCollections.map((collection) => ({
      count: collection.count,
      label: collection.label,
      value: collection.label,
    })),
    value: "Collections",
  },
]

/**
 * The sidebar's search row and the search-and-add command palette it
 * opens, self-contained since CommandDialogPopup portals regardless of
 * where it's mounted. Search covers bookmarks and collections per
 * feature-contract.md; direct-paste URL saving isn't wired since this
 * is a disposable, backend-less wireframe — the footer hint communicates
 * it anyway so the capability stays discoverable.
 */
export function DashboardCommand(): React.ReactElement {
  const [open, setOpen] = React.useState(false)

  useHotkey("Mod+K", () => setOpen((prev) => !prev))

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandDialogTrigger render={<SidebarMenuButton tooltip="Search" />}>
        <MagnifyingGlassIcon />
        <SidebarMenuButtonLabel className="flex flex-1 items-center justify-between gap-2">
          <span>Search</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </SidebarMenuButtonLabel>
      </CommandDialogTrigger>
      <CommandDialogPopup>
        <Command items={commandGroups}>
          <CommandInput placeholder="Search bookmarks and collections..." />
          <CommandPanel>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandList>
              {(group: CommandGroupData) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.value}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: CommandEntry) => (
                        <CommandItem
                          key={item.value}
                          onClick={() => setOpen(false)}
                          value={item.value}
                        >
                          {group.value === "Bookmarks" ? (
                            <BookmarkFavicon domain={item.domain ?? null} />
                          ) : (
                            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
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
          <CommandFooter>
            <div className="flex items-center gap-4">
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
