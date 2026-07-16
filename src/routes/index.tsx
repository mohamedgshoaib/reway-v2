import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CheckIcon,
  DotsThreeOutlineIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: IconInventory })

type IconEntry = {
  icon: Icon
  name: string
  usedIn: string
  weight: IconWeight
}

const icons: IconEntry[] = [
  {
    icon: CaretDownIcon,
    name: "CaretDownIcon",
    usedIn: "accordion, select",
    weight: "regular",
  },
  {
    icon: CaretLeftIcon,
    name: "CaretLeftIcon",
    usedIn: "calendar, pagination",
    weight: "regular",
  },
  {
    icon: CaretRightIcon,
    name: "CaretRightIcon",
    usedIn: "breadcrumb, calendar, context menu, drawer, menu, pagination",
    weight: "regular",
  },
  {
    icon: CaretUpDownIcon,
    name: "CaretUpDownIcon",
    usedIn: "autocomplete, calendar, combobox, select",
    weight: "regular",
  },
  {
    icon: CaretUpIcon,
    name: "CaretUpIcon",
    usedIn: "select",
    weight: "regular",
  },
  {
    icon: WarningCircleIcon,
    name: "WarningCircleIcon",
    usedIn: "error toast",
    weight: "duotone",
  },
  {
    icon: CheckCircleIcon,
    name: "CheckCircleIcon",
    usedIn: "success toast only",
    weight: "duotone",
  },
  {
    icon: CheckIcon,
    name: "CheckIcon",
    usedIn: "checkbox and selection indicators",
    weight: "regular",
  },
  {
    icon: InfoIcon,
    name: "InfoIcon",
    usedIn: "info toast",
    weight: "duotone",
  },
  {
    icon: SpinnerGapIcon,
    name: "SpinnerGapIcon",
    usedIn: "spinner, loading toast",
    weight: "regular",
  },
  {
    icon: MinusIcon,
    name: "MinusIcon",
    usedIn: "number field, indeterminate checkbox",
    weight: "regular",
  },
  {
    icon: DotsThreeOutlineIcon,
    name: "DotsThreeOutlineIcon",
    usedIn: "breadcrumb, pagination",
    weight: "duotone",
  },
  {
    icon: SidebarSimpleIcon,
    name: "SidebarSimpleIcon",
    usedIn: "sidebar",
    weight: "duotone",
  },
  {
    icon: PlusIcon,
    name: "PlusIcon",
    usedIn: "number field",
    weight: "regular",
  },
  {
    icon: MagnifyingGlassIcon,
    name: "MagnifyingGlassIcon",
    usedIn: "command",
    weight: "duotone",
  },
  {
    icon: WarningIcon,
    name: "WarningIcon",
    usedIn: "warning toast",
    weight: "duotone",
  },
  {
    icon: XIcon,
    name: "XIcon",
    usedIn: "autocomplete, combobox, dialog, drawer, sheet",
    weight: "regular",
  },
]

function IconInventory() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <header className="max-w-2xl space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Phosphor icon system
        </p>
        <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          Icon inventory
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The project icon set after migrating from Lucide to Phosphor. Each
          icon is shown at its assigned weight.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {icons.map(({ icon: IconComponent, name, usedIn, weight }) => (
          <li
            className="flex min-w-0 items-center gap-4 bg-background p-4"
            key={name}
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-md border bg-muted/40">
              <IconComponent
                aria-hidden="true"
                className="size-5"
                weight={weight}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-medium">{name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {usedIn} · {weight}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
