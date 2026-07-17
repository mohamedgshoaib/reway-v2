import {
  BookmarkSimpleIcon,
  FolderIcon,
  GearIcon,
  HashIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type * as React from "react"

import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AuditSection } from "@/dev/ui-audit/section-shell"

const collections = [
  { label: "Research", count: 24 },
  { label: "Reading list", count: 9 },
  { label: "Design references", count: 12 },
]

const tags = ["engineering", "design", "product"]

export function SidebarSection(): React.ReactElement {
  return (
    <AuditSection
      description="sidebar — self-contained SidebarProvider demo, bounded to a preview box below rather than the full viewport."
      id="sidebar"
      title="Sidebar"
    >
      <div className="w-full overflow-hidden rounded-lg border">
        <SidebarProvider className="h-[420px] min-h-0" defaultOpen>
          <Sidebar collapsible="icon">
            <SidebarHeader>
              {/* size-8 mirrors the collapsed menu button, aligning the logo
                  with the icons below it. */}
              <div className="flex size-8 items-center justify-center">
                <Logo className="size-5 text-foreground" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Library</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive tooltip="All bookmarks">
                        <BookmarkSimpleIcon />
                        <SidebarMenuButtonLabel>
                          All bookmarks
                        </SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Collections</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {collections.map((collection) => (
                      <SidebarMenuItem key={collection.label}>
                        <SidebarMenuButton tooltip={collection.label}>
                          <FolderIcon />
                          <SidebarMenuButtonLabel>
                            {collection.label}
                          </SidebarMenuButtonLabel>
                        </SidebarMenuButton>
                        <SidebarMenuBadge>{collection.count}</SidebarMenuBadge>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Tags</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tags.map((tag) => (
                      <SidebarMenuItem key={tag}>
                        <SidebarMenuButton size="sm" tooltip={tag}>
                          <HashIcon />
                          <SidebarMenuButtonLabel>{tag}</SidebarMenuButtonLabel>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Trash">
                    <TrashIcon />
                    <SidebarMenuButtonLabel>Trash</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Settings">
                    <GearIcon />
                    <SidebarMenuButtonLabel>Settings</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          <SidebarInset>
            <div className="flex items-center gap-2 border-b p-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">
                All bookmarks
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Library content renders here.
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AuditSection>
  )
}
