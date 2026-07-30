import {
  CalendarIcon,
  FireIcon,
  ImageIcon,
  ListIcon,
  SquaresFourIcon,
  SortAscendingIcon,
} from "@phosphor-icons/react"
import * as m from "motion/react-m"
import type * as React from "react"

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SortOption, ViewMode } from "@/dev/dashboard-ui/mock-bookmarks"
import { MobileDashboardNavigation } from "@/dev/dashboard-ui/sidebar"
import { easeOutStrong } from "@/lib/motion"

const sortTooltipHandle = TooltipCreateHandle<string>()
const viewTooltipHandle = TooltipCreateHandle<string>()

const sortOptions: {
  value: SortOption
  label: string
  shortLabel: string
  icon: React.ComponentType<{ weight?: "duotone" | "regular" }>
}[] = [
  {
    icon: CalendarIcon,
    label: "Date added",
    shortLabel: "Date",
    value: "date",
  },
  {
    icon: FireIcon,
    label: "Most visited",
    shortLabel: "Visits",
    value: "visits",
  },
  {
    icon: SortAscendingIcon,
    label: "Alphabetical",
    shortLabel: "A–Z",
    value: "alpha",
  },
]

const viewOptions: {
  value: ViewMode
  label: string
  shortLabel: string
  icon: React.ComponentType<{ weight?: "duotone" | "regular" }>
}[] = [
  { icon: ListIcon, label: "List", shortLabel: "List", value: "list" },
  { icon: SquaresFourIcon, label: "Grid", shortLabel: "Grid", value: "grid" },
  {
    icon: ImageIcon,
    label: "Grid with images",
    shortLabel: "Images",
    value: "grid-image",
  },
]

const mobileViewOptions = viewOptions.filter(
  (option) => option.value !== "grid"
)

/**
 * Bookmark-area controls bar. Filter is deferred — tags are unbounded, so
 * they need a different pattern than this fixed-option ToggleGroup one.
 * See spec/sessions/session-02.md.
 */
export function BookmarkControlsBar({
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: {
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  viewMode: ViewMode
  onViewModeChange: (viewMode: ViewMode) => void
}): React.ReactElement {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const selectedSort =
    sortOptions.find((option) => option.value === sort) ?? sortOptions[0]
  const selectedMobileView =
    mobileViewOptions.find((option) => option.value === viewMode) ??
    mobileViewOptions[0]

  return (
    <div className="mb-4 flex h-9 items-center justify-between min-[800px]:h-8">
      <div className="min-[800px]:hidden">
        <MobileDashboardNavigation />
      </div>

      {/* Mirrors the sidebar header trigger's fade timing so the handoff
          between the two locations feels like one continuous motion. */}
      <m.div
        animate={{ opacity: collapsed ? 1 : 0 }}
        className={
          collapsed
            ? "hidden min-[800px]:block"
            : "pointer-events-none hidden min-[800px]:block"
        }
        initial={false}
        transition={
          collapsed
            ? { delay: 0.18, duration: 0.12, ease: easeOutStrong }
            : { duration: 0.08, ease: easeOutStrong }
        }
      >
        <SidebarTrigger />
      </m.div>

      <div className="flex min-w-0 items-center gap-2 min-[800px]:hidden">
        <Select
          aria-label="Sort bookmarks"
          itemToStringValue={(option) => option.value}
          items={sortOptions}
          onValueChange={(option) => {
            if (option) onSortChange(option.value)
          }}
          value={selectedSort}
        >
          <SelectTrigger className="w-auto min-w-0 shrink-0" size="sm">
            <SelectValue>
              {(option: (typeof sortOptions)[number]) => (
                <span className="flex items-center gap-1.5">
                  <option.icon aria-hidden="true" weight="duotone" />
                  <span>{option.shortLabel}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option}>
                <option.icon weight="duotone" />
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          aria-label="Change bookmark view"
          itemToStringValue={(option) => option.value}
          items={mobileViewOptions}
          onValueChange={(option) => {
            if (option) onViewModeChange(option.value)
          }}
          value={selectedMobileView}
        >
          <SelectTrigger className="w-auto min-w-0 shrink-0" size="sm">
            <SelectValue>
              {(option: (typeof viewOptions)[number]) => (
                <span className="flex items-center gap-1.5">
                  <option.icon aria-hidden="true" weight="duotone" />
                  <span>{option.shortLabel}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {mobileViewOptions.map((option) => (
              <SelectItem key={option.value} value={option}>
                <option.icon weight="duotone" />
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <div className="hidden items-center gap-4 min-[800px]:flex">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Sort
          </span>
          <TooltipProvider>
            <ToggleGroup
              onValueChange={(value) => {
                if (value[0]) {
                  onSortChange(value[0] as SortOption)
                }
              }}
              size="default"
              value={[sort]}
              variant="default"
            >
              {sortOptions.map((option) => (
                <TooltipTrigger
                  handle={sortTooltipHandle}
                  key={option.value}
                  payload={option.label}
                  render={
                    <ToggleGroupItem
                      aria-label={option.label}
                      value={option.value}
                    />
                  }
                >
                  <option.icon weight="duotone" />
                </TooltipTrigger>
              ))}
            </ToggleGroup>
            <Tooltip handle={sortTooltipHandle}>
              {({ payload }) => <TooltipPopup>{payload}</TooltipPopup>}
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            View
          </span>
          <TooltipProvider>
            <ToggleGroup
              onValueChange={(value) => {
                if (value[0]) {
                  onViewModeChange(value[0] as ViewMode)
                }
              }}
              size="default"
              value={[viewMode]}
              variant="default"
            >
              {viewOptions.map((option) => (
                <TooltipTrigger
                  handle={viewTooltipHandle}
                  key={option.value}
                  payload={option.label}
                  render={
                    <ToggleGroupItem
                      aria-label={option.label}
                      value={option.value}
                    />
                  }
                >
                  <option.icon weight="duotone" />
                </TooltipTrigger>
              ))}
            </ToggleGroup>
            <Tooltip handle={viewTooltipHandle}>
              {({ payload }) => <TooltipPopup>{payload}</TooltipPopup>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
