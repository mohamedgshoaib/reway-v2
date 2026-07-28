import {
  AirplaneTiltIcon,
  BookOpenTextIcon,
  BookmarkIcon,
  BriefcaseIcon,
  CaretDownIcon,
  CodesandboxLogoIcon,
  CookingPotIcon,
  FileMagnifyingGlassIcon,
  GearIcon,
  HouseLineIcon,
  NotebookIcon,
  PaintBrushIcon,
  TagChevronIcon,
  TrashIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import * as m from "motion/react-m"
import type * as React from "react"

import { Logo } from "@/components/logo"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { DashboardCommand } from "@/dev/dashboard-ui/command"
import { mockCollections } from "@/dev/dashboard-ui/mock-bookmarks"
import { easeOutStrong } from "@/lib/motion"
import { cn } from "@/lib/utils"

const tags = [
  "engineering",
  "design",
  "product",
  "research",
  "marketing",
  "ai",
  "typography",
  "accessibility",
  "performance",
  "writing",
]

const collectionIcons = {
  "Book notes": NotebookIcon,
  "Client work": UserCircleIcon,
  "Design references": PaintBrushIcon,
  "Home renovation": HouseLineIcon,
  "Job hunting": BriefcaseIcon,
  "Reading list": BookOpenTextIcon,
  Recipes: CookingPotIcon,
  Research: FileMagnifyingGlassIcon,
  "Side project": CodesandboxLogoIcon,
  "Travel planning": AirplaneTiltIcon,
} as const

/**
 * Sidebar shell + content, mounted inside a plain, non-fixed <aside> —
 * unlike the real Sidebar primitive's fixed-to-viewport usage. Manually
 * replicates the width/data-collapsible contract that primitive's
 * exported Sidebar component normally provides, since this composition
 * lives inside the bounded 896px shell instead. See
 * spec/sessions/session-02.md for why.
 */
export function DashboardSidebar(): React.ReactElement {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <aside
      className={cn(
        "group flex min-h-0 shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-in-out-strong",
        collapsed ? "w-(--sidebar-width-icon)" : "w-(--sidebar-width)"
      )}
      data-collapsible={collapsed ? "icon" : ""}
    >
      <SidebarHeader>
        <div className="relative flex h-8 items-center">
          <div className="flex size-8 items-center justify-center">
            <Logo className="size-5 text-foreground" />
          </div>
          {/* Absolutely positioned, like SidebarMenuBadge, so fading it
              never shifts the logo. Same asymmetric timing as the badge
              counts: wait out the width transition before fading in,
              snap out fast before the rail narrows. Hidden once collapsed
              — the icon-only rail has no room for both logo and trigger;
              it reappears in the bookmark-area controls bar (sort/filter/
              view row) once that exists. */}
          <m.div
            animate={{ opacity: collapsed ? 0 : 1 }}
            className={cn(
              "absolute right-0",
              collapsed && "pointer-events-none"
            )}
            initial={false}
            transition={
              collapsed
                ? { duration: 0.08, ease: easeOutStrong }
                : { delay: 0.18, duration: 0.12, ease: easeOutStrong }
            }
          >
            <SidebarTrigger />
          </m.div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DashboardCommand />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="All bookmarks">
                  <BookmarkIcon weight="duotone" />
                  <SidebarMenuButtonLabel>All bookmarks</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              render={
                <SidebarGroupLabel
                  className="w-full cursor-pointer justify-between data-panel-open:*:data-[slot=collections-indicator]:rotate-180"
                  render={<button aria-label="Collections" type="button" />}
                />
              }
            >
              Collections
              <CaretDownIcon
                className="size-4 shrink-0 opacity-80 transition-transform duration-200"
                data-slot="collections-indicator"
                weight="regular"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mockCollections.map((collection) => {
                    const CollectionIcon =
                      collectionIcons[
                        collection.label as keyof typeof collectionIcons
                      ]

                    return (
                      <SidebarMenuItem key={collection.label}>
                        <SidebarMenuButton tooltip={collection.label}>
                          <CollectionIcon weight="duotone" />
                          <SidebarMenuButtonLabel>
                            {collection.label}
                          </SidebarMenuButtonLabel>
                        </SidebarMenuButton>
                        <SidebarMenuBadge>{collection.count}</SidebarMenuBadge>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsiblePanel>
          </Collapsible>
        </SidebarGroup>
        <SidebarGroup>
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              render={
                <SidebarGroupLabel
                  className="w-full cursor-pointer justify-between data-panel-open:*:data-[slot=tags-indicator]:rotate-180"
                  render={<button aria-label="Tags" type="button" />}
                />
              }
            >
              Tags
              <CaretDownIcon
                className="size-4 shrink-0 opacity-80 transition-transform duration-200"
                data-slot="tags-indicator"
                weight="regular"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tags.map((tag) => (
                    <SidebarMenuItem key={tag}>
                      <SidebarMenuButton size="sm" tooltip={tag}>
                        <TagChevronIcon weight="duotone" />
                        <SidebarMenuButtonLabel>{tag}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsiblePanel>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <GearIcon weight="duotone" />
              <SidebarMenuButtonLabel>Settings</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Trash">
              <TrashIcon weight="duotone" />
              <SidebarMenuButtonLabel>Trash</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </aside>
  )
}
