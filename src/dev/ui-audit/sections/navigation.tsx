import { CaretDownIcon } from "@phosphor-icons/react"
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

export function NavigationSection(): React.ReactElement {
  return (
    <AuditSection
      description="tabs, breadcrumb, pagination, accordion, collapsible."
      id="navigation"
      title="Navigation"
    >
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
