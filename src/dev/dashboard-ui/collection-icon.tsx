import {
  AirplaneTiltIcon,
  ArchiveIcon,
  BarbellIcon,
  BookOpenTextIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingsIcon,
  CalendarIcon,
  CameraIcon,
  ClipboardIcon,
  CodeIcon,
  CookingPotIcon,
  FileMagnifyingGlassIcon,
  FolderIcon,
  HeartIcon,
  HouseLineIcon,
  MapPinIcon,
  NotebookIcon,
  PaintBrushIcon,
  ShoppingCartIcon,
  StackIcon,
  StarIcon,
  UserCircleIcon,
  XLogoIcon,
  type Icon,
} from "@phosphor-icons/react"
import type * as React from "react"

import {
  appearanceTextClasses,
  resolveAppearanceColor,
  type AppearanceColor,
} from "@/dev/dashboard-ui/appearance-color"
import type { CollectionIconName } from "@/dev/dashboard-ui/collection-hierarchy"
import { cn } from "@/lib/utils"

const collectionIcons: Record<CollectionIconName, Icon> = {
  airplane: AirplaneTiltIcon,
  archive: ArchiveIcon,
  barbell: BarbellIcon,
  book: BookOpenTextIcon,
  bookmark: BookmarkIcon,
  briefcase: BriefcaseIcon,
  buildings: BuildingsIcon,
  calendar: CalendarIcon,
  camera: CameraIcon,
  clipboard: ClipboardIcon,
  code: CodeIcon,
  cooking: CookingPotIcon,
  folder: FolderIcon,
  heart: HeartIcon,
  home: HouseLineIcon,
  location: MapPinIcon,
  notebook: NotebookIcon,
  paintbrush: PaintBrushIcon,
  research: FileMagnifyingGlassIcon,
  shopping: ShoppingCartIcon,
  stack: StackIcon,
  star: StarIcon,
  user: UserCircleIcon,
  x: XLogoIcon,
}

export function CollectionIcon({
  className,
  color,
  icon,
}: {
  className?: string
  color?: AppearanceColor
  icon: CollectionIconName
}): React.ReactElement {
  const IconComponent = collectionIcons[icon]
  const resolvedColor = resolveAppearanceColor(color)

  return (
    <IconComponent
      aria-hidden="true"
      className={cn(appearanceTextClasses[resolvedColor.value], className)}
      weight="duotone"
    />
  )
}
