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
import { easeOutStrong } from "@/lib/motion"

const sortTooltipHandle = TooltipCreateHandle<string>()
const viewTooltipHandle = TooltipCreateHandle<string>()

const sortOptions: {
  value: SortOption
  label: string
  icon: React.ComponentType<{ weight?: "duotone" | "regular" }>
}[] = [
  { icon: CalendarIcon, label: "Date added", value: "date" },
  { icon: FireIcon, label: "Most visited", value: "visits" },
  { icon: SortAscendingIcon, label: "Alphabetical", value: "alpha" },
]

const viewOptions: {
  value: ViewMode
  label: string
  icon: React.ComponentType<{ weight?: "duotone" | "regular" }>
}[] = [
  { icon: ListIcon, label: "List", value: "list" },
  { icon: SquaresFourIcon, label: "Grid", value: "grid" },
  { icon: ImageIcon, label: "Grid with images", value: "grid-image" },
]

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

  return (
    <div className="mb-4 flex h-8 items-center justify-between">
      {/* Mirrors the sidebar header trigger's fade timing so the handoff
          between the two locations feels like one continuous motion. */}
      <m.div
        animate={{ opacity: collapsed ? 1 : 0 }}
        className={collapsed ? undefined : "pointer-events-none"}
        initial={false}
        transition={
          collapsed
            ? { delay: 0.18, duration: 0.12, ease: easeOutStrong }
            : { duration: 0.08, ease: easeOutStrong }
        }
      >
        <SidebarTrigger />
      </m.div>

      <div className="flex items-center gap-4">
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
