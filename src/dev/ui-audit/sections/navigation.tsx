import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import * as React from "react"

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIcon,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuTrigger,
  navigationMenuTriggerVariants,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"
import { useMediaQuery } from "@/hooks/use-media-query"

interface NavLink {
  href: string
  title: string
  description: string
}

const libraryLinks: NavLink[] = [
  {
    href: "/library",
    title: "All bookmarks",
    description: "Everything you have saved, newest first.",
  },
  {
    href: "/library/unread",
    title: "Unread",
    description: "Links you meant to get back to.",
  },
  {
    href: "/library/favorites",
    title: "Favorites",
    description: "The ones worth keeping close.",
  },
  {
    href: "/library/archive",
    title: "Archive",
    description: "Read and put away, still searchable.",
  },
]

const collectionLinks: NavLink[] = [
  {
    href: "/collections/research",
    title: "Research",
    description: "Papers and long-form reading.",
  },
  {
    href: "/collections/design",
    title: "Design references",
    description: "Interfaces worth stealing from.",
  },
  {
    href: "/collections/reading-list",
    title: "Reading list",
    description: "Queued up for later.",
  },
]

const expandedNavigationLinks = [
  ...libraryLinks.map((item) => ({ id: `library-start-${item.href}`, item })),
  ...collectionLinks.map((item) => ({ id: `collection-${item.href}`, item })),
  ...libraryLinks.map((item) => ({ id: `library-end-${item.href}`, item })),
]

// NavigationMenuLink renders an <a> by default, so a plain href works.
// `h-full` (as in Base UI's reference) makes the card fill its grid cell:
// rows stretch to their tallest cell, and without it a shorter card's hover
// target would stop short of the row's height.
function LinkCard({ item }: { item: NavLink }): React.ReactElement {
  return (
    <NavigationMenuLink
      className="h-full w-full p-2 transition-colors hover:bg-accent hover:text-accent-foreground"
      href={item.href}
    >
      <h3 className="mb-1 text-sm leading-4 font-medium">{item.title}</h3>
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </NavigationMenuLink>
  )
}

function NavigationMenuDemo(): React.ReactElement {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Library
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid list-none grid-cols-2 sm:w-[26rem]">
              {libraryLinks.map((item) => (
                <li key={item.href}>
                  <LinkCard item={item} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Collections
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex max-w-[24rem] list-none flex-col">
              {collectionLinks.map((item) => (
                <li key={item.href}>
                  <LinkCard item={item} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          {/* Custom links: `render` swaps the <a> for the router's Link so
              navigation stays client-side. */}
          <NavigationMenuLink
            className={navigationMenuTriggerVariants()}
            render={<Link to="/" />}
          >
            Home
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup />
    </NavigationMenu>
  )
}

function NavigationMenuNestedDemo(): React.ReactElement {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Library
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid list-none grid-cols-2 sm:w-[26rem]">
              {libraryLinks.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <LinkCard item={item} />
                </li>
              ))}
              <li>
                {/* Nested Root inside Content, with its own popup. Per Base
                    UI's reference (verified against their raw demo source),
                    the Item still sits inside a List — omitting it renders
                    the Item's own <li> with no <ul> between it and this
                    grid cell's <li>, which is invalid HTML nesting and a
                    real hydration warning, not just a style nit.
                    A bare List defaults to row-flex with no stretch, so a
                    single Item's width collapses to its content instead of
                    the cell; flex-col items-stretch (this project's own
                    documented convention for vertical Roots) fixes that.
                    h-full is chained through Root, List, and Item: the grid
                    row stretches this cell, and without an unbroken chain
                    the trigger's hover box would stop at its text height. */}
                <NavigationMenu className="h-full" orientation="vertical">
                  <NavigationMenuList className="h-full flex-col items-stretch">
                    <NavigationMenuItem className="h-full">
                      <NavigationMenuTrigger className="h-full w-full flex-col items-start justify-start gap-1 p-2 text-left font-normal">
                        <span className="text-sm leading-4 font-medium">
                          Collections
                        </span>
                        <p className="text-sm text-muted-foreground">
                          Grouped by topic.
                        </p>
                        <NavigationMenuIcon className="absolute top-1/2 right-2.5 -translate-y-1/2 data-popup-open:rotate-180">
                          <CaretRightIcon />
                        </NavigationMenuIcon>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="flex max-w-[22rem] list-none flex-col">
                          {collectionLinks.map((item) => (
                            <li key={item.href}>
                              <LinkCard item={item} />
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>

                  <NavigationMenuPopup
                    align="end"
                    alignOffset={-8}
                    side="right"
                  />
                </NavigationMenu>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup />
    </NavigationMenu>
  )
}

interface AudienceMenu {
  value: string
  label: string
  hint: string
  title: string
  description: string
  links: NavLink[]
}

const audienceMenus: AudienceMenu[] = [
  {
    value: "collectors",
    label: "For collectors",
    hint: "Save anything, find it later.",
    title: "Collect",
    description: "Capture links from anywhere and keep them organized.",
    links: [
      {
        href: "/features/capture",
        title: "Quick capture",
        description: "Save from the browser in one keystroke.",
      },
      {
        href: "/features/tags",
        title: "Tags & collections",
        description: "Structure that stays out of your way.",
      },
    ],
  },
  {
    value: "readers",
    label: "For readers",
    hint: "Return to useful links.",
    title: "Retrieve",
    description: "Search bookmark titles, domains, tags, and collections.",
    links: [
      {
        href: "/features/search",
        title: "Fast search",
        description: "Find a bookmark by title, domain, tag, or collection.",
      },
      {
        href: "/features/command-search",
        title: "Command search",
        description: "Open search from anywhere with Cmd K or Ctrl K.",
      },
    ],
  },
  {
    value: "organizers",
    label: "For organizers",
    hint: "Structure without upkeep.",
    title: "Organize",
    description: "Use collections and tags to keep a large library clear.",
    links: [
      {
        href: "/features/collections",
        title: "Nested collections",
        description: "Keep related bookmarks in a two-level structure.",
      },
      {
        href: "/features/tags",
        title: "Tag filters",
        description: "Use labels across collections without moving links.",
      },
    ],
  },
]

const guideLinks: NavLink[] = [
  {
    href: "/guides/getting-started",
    title: "Getting started",
    description: "From empty library to organized in ten minutes.",
  },
  {
    href: "/guides/import",
    title: "Importing bookmarks",
    description: "Bring everything over from your browser.",
  },
  {
    href: "/guides/keyboard",
    title: "Keyboard shortcuts",
    description: "The fastest way around your library.",
  },
]

// Animation classes below are Base UI's "Nested inline submenus" reference
// verbatim (only color/border tokens adapted): outer content slides ±2rem
// with opacity at half duration; inline submenu content slides ±50% x on
// mobile and ±72px y with a 2px blur at 1.35x duration on desktop.
const inlineOuterContentClassName = [
  "h-full w-[calc(100vw_-_40px)] p-0",
  "transition-[opacity,translate] duration-[calc(var(--duration)*0.5),var(--duration)] ease-[ease,cubic-bezier(0.4,0,0.2,1)]",
  "data-starting-style:data-[activation-direction=left]:opacity-0 data-starting-style:data-[activation-direction=right]:opacity-0 data-ending-style:opacity-0",
  "data-ending-style:duration-[calc(var(--duration)*0.5)] data-ending-style:ease-[ease]",
  "data-starting-style:data-[activation-direction=left]:translate-x-[-2rem]",
  "data-starting-style:data-[activation-direction=right]:translate-x-[2rem]",
  "data-ending-style:data-[activation-direction=left]:translate-x-[2rem]",
  "data-ending-style:data-[activation-direction=right]:translate-x-[-2rem]",
].join(" ")

const inlineSubmenuContentClassName = [
  "flex h-full w-auto translate-x-0 flex-col gap-4 p-4 sm:w-auto min-[700px]:blur-0",
  "transition-[opacity,translate,filter] duration-(--duration) ease-(--easing) min-[700px]:duration-[calc(var(--duration)*1.35)] min-[700px]:ease-[cubic-bezier(0.16,1,0.3,1)]",
  "data-starting-style:data-[activation-direction=left]:opacity-0 data-starting-style:data-[activation-direction=right]:opacity-0 data-starting-style:data-[activation-direction=left]:translate-x-[-50%] data-starting-style:data-[activation-direction=right]:translate-x-[50%]",
  "data-ending-style:opacity-0 data-ending-style:data-[activation-direction=left]:translate-x-[50%] data-ending-style:data-[activation-direction=right]:translate-x-[-50%]",
  "min-[700px]:data-starting-style:data-[activation-direction=up]:opacity-0 min-[700px]:data-starting-style:data-[activation-direction=down]:opacity-0 min-[700px]:data-starting-style:data-[activation-direction=up]:translate-y-[-72px] min-[700px]:data-starting-style:data-[activation-direction=down]:translate-y-[72px] min-[700px]:data-starting-style:blur-[2px]",
  "min-[700px]:data-ending-style:data-[activation-direction=up]:translate-y-[72px] min-[700px]:data-ending-style:data-[activation-direction=down]:translate-y-[-72px] min-[700px]:data-ending-style:blur-[2px]",
].join(" ")

function NavigationMenuInlineSubmenusDemo(): React.ReactElement {
  const isDesktop = useMediaQuery({ min: 700 })

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Product
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent
            className={`${inlineOuterContentClassName} min-[700px]:w-[min(42rem,calc(100vw-40px))]`}
          >
            {/* Inline nested Root: List + Viewport only, no Portal, so the
                second level stays inside the same panel. */}
            <NavigationMenu
              defaultValue="collectors"
              orientation={isDesktop ? "vertical" : "horizontal"}
            >
              <div className="grid grid-cols-1 overflow-clip min-[700px]:grid-cols-[13rem_minmax(0,1fr)]">
                <NavigationMenuList className="flex-row items-stretch overflow-x-auto p-2 min-[700px]:h-(--popup-height) min-[700px]:flex-col min-[700px]:overflow-x-visible min-[700px]:overflow-y-clip min-[700px]:border-r min-[700px]:transition-[height] min-[700px]:duration-(--duration) min-[700px]:ease-(--easing)">
                  {audienceMenus.map((menu) => (
                    <NavigationMenuItem key={menu.value} value={menu.value}>
                      <NavigationMenuTrigger className="h-auto w-full min-w-40 flex-col items-start justify-start gap-1 p-2 text-left whitespace-normal">
                        <span className="text-sm leading-4 font-medium">
                          {menu.label}
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {menu.hint}
                        </span>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent
                        className={inlineSubmenuContentClassName}
                      >
                        <div>
                          <h4 className="text-base leading-5 font-medium">
                            {menu.title}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {menu.description}
                          </p>
                        </div>
                        <ul className="-mx-2 flex list-none flex-col p-0">
                          {menu.links.map((link) => (
                            <li key={link.href}>
                              <LinkCard item={link} />
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
                <NavigationMenuViewport className="min-h-66 border-t min-[700px]:border-t-0" />
              </div>
            </NavigationMenu>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Learn
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent
            className={`${inlineOuterContentClassName} min-[700px]:w-[min(31rem,calc(100vw-40px))]`}
          >
            <div className="flex flex-col gap-4 p-4">
              <div>
                <h4 className="text-base leading-5 font-medium">Guides</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Short, practical reads on getting more out of your library.
                </p>
              </div>
              <ul className="-mx-2 flex list-none flex-col p-0">
                {guideLinks.map((link) => (
                  <li key={link.href}>
                    <LinkCard item={link} />
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerVariants()}
            render={<Link to="/" />}
          >
            Home
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup collisionAvoidance={{ side: "none" }} />
    </NavigationMenu>
  )
}

function NavigationMenuScrollableDemo(): React.ReactElement {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Everything
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          {/* Large menus, per Base UI: cap both Content and Popup to
              --available-height and scroll the Content.
              Base UI's docs suggest swapping the native scrollbar for a
              ScrollArea, but ship no example of it, and nesting one here
              deadlocks: the popup morphs its height over --duration while
              re-measuring Content, and ScrollArea observes that same box to
              recompute overflow, thumb, and fade — each drives the other, so
              the panel judders and scroll position resets. Native overflow is
              the documented, working fallback. */}
          <NavigationMenuContent className="max-h-(--available-height) overflow-y-auto">
            <ul className="flex list-none flex-col sm:w-[22rem]">
              {expandedNavigationLinks.map(({ id, item }) => (
                <li key={id}>
                  <LinkCard item={item} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup className="max-h-(--available-height)" />
    </NavigationMenu>
  )
}

function NavigationMenuVerticalDemo(): React.ReactElement {
  return (
    <NavigationMenu orientation="vertical">
      {/* Vertical Roots must lay their own List out; see NavigationMenuList. */}
      <NavigationMenuList className="w-40 flex-col items-stretch">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="w-full justify-between">
            Library
            <NavigationMenuIcon>
              <CaretRightIcon />
            </NavigationMenuIcon>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex max-w-[22rem] list-none flex-col">
              {libraryLinks.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <LinkCard item={item} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerVariants({
              className: "w-full justify-start",
            })}
            href="/settings"
          >
            Settings
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup align="start" side="right" />
    </NavigationMenu>
  )
}

function NavigationMenuBackdropDemo(): React.ReactElement {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            Library
            <NavigationMenuIcon />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex max-w-[22rem] list-none flex-col">
              {libraryLinks.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <LinkCard item={item} />
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPopup showBackdrop />
    </NavigationMenu>
  )
}

export function NavigationSection(): React.ReactElement {
  return (
    <AuditSection
      description="navigation-menu, tabs, breadcrumb, pagination, accordion, collapsible."
      id="navigation"
      title="Navigation"
    >
      <AuditGroup label="Navigation menu — grid & flex content" wrap={false}>
        <NavigationMenuDemo />
      </AuditGroup>

      <AuditGroup label="Navigation menu — nested submenu" wrap={false}>
        <NavigationMenuNestedDemo />
      </AuditGroup>

      <AuditGroup
        label="Navigation menu — nested inline submenus (resize viewport)"
        wrap={false}
      >
        <NavigationMenuInlineSubmenusDemo />
      </AuditGroup>

      <AuditGroup label="Navigation menu — scrollable large menu" wrap={false}>
        <NavigationMenuScrollableDemo />
      </AuditGroup>

      <AuditGroup label="Navigation menu — vertical orientation" wrap={false}>
        <NavigationMenuVerticalDemo />
      </AuditGroup>

      <AuditGroup label="Navigation menu — with backdrop" wrap={false}>
        <NavigationMenuBackdropDemo />
      </AuditGroup>

      <AuditGroup label="Tabs — default variant" wrap={false}>
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTab value="list">List</TabsTab>
            <TabsTab value="grid">Grid</TabsTab>
            <TabsTab value="grid-image">Grid with image</TabsTab>
          </TabsList>
          <TabsPanel value="list">List view content.</TabsPanel>
          <TabsPanel value="grid">Grid view content.</TabsPanel>
          <TabsPanel value="grid-image">Grid with image content.</TabsPanel>
        </Tabs>
      </AuditGroup>

      <AuditGroup label="Tabs — underline variant" wrap={false}>
        <Tabs defaultValue="bookmarks">
          <TabsList variant="underline">
            <TabsTab value="bookmarks">Bookmarks</TabsTab>
            <TabsTab value="collections">Collections</TabsTab>
            <TabsTab value="tags">Tags</TabsTab>
          </TabsList>
          <TabsPanel value="bookmarks">Bookmarks content.</TabsPanel>
          <TabsPanel value="collections">Collections content.</TabsPanel>
          <TabsPanel value="tags">Tags content.</TabsPanel>
        </Tabs>
      </AuditGroup>

      <AuditGroup label="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Library</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Research</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Deep learning papers</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </AuditGroup>

      <AuditGroup label="Pagination" wrap={false}>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </AuditGroup>

      <AuditGroup label="Accordion" wrap={false}>
        <Accordion className="w-full max-w-md" defaultValue={["enrichment"]}>
          <AccordionItem value="enrichment">
            <AccordionTrigger>What is enrichment?</AccordionTrigger>
            <AccordionPanel>
              Title, favicon, and OG image are fetched asynchronously after a
              bookmark is saved.
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="sorting">
            <AccordionTrigger>How does custom order work?</AccordionTrigger>
            <AccordionPanel>
              Custom order is collection-local. All Bookmarks and Uncollected
              use system sorts only.
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </AuditGroup>

      <AuditGroup label="Collapsible" wrap={false}>
        <Collapsible className="w-full max-w-md" defaultOpen={false}>
          <CollapsibleTrigger
            render={<Button className="justify-between" variant="ghost" />}
          >
            Advanced options
            <CaretDownIcon />
          </CollapsibleTrigger>
          <CollapsiblePanel className="px-2 text-sm text-muted-foreground">
            Scroll capture requires opt-in disclosure before it runs.
          </CollapsiblePanel>
        </Collapsible>
      </AuditGroup>
    </AuditSection>
  )
}
