import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
} from "@phosphor-icons/react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardDescription,
  CardFooter,
  CardFrame,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame"
import { Group, GroupSeparator } from "@/components/ui/group"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"

const rows = [
  {
    title: "Attention Is All You Need",
    domain: "arxiv.org",
    status: "enriched",
  },
  { title: "reway.page/library", domain: "reway.page", status: "pending" },
  { title: "Refactoring UI", domain: "refactoringui.com", status: "enriched" },
]

type Project = {
  id: string
  project: string
  status: "Paid" | "Unpaid" | "Pending" | "Failed"
  team: string
  budget: number
}

const projects: Project[] = [
  {
    budget: 12500,
    id: "1",
    project: "Website Redesign",
    status: "Paid",
    team: "Frontend Team",
  },
  {
    budget: 8750,
    id: "2",
    project: "Mobile App",
    status: "Unpaid",
    team: "Mobile Team",
  },
  {
    budget: 5200,
    id: "3",
    project: "API Integration",
    status: "Pending",
    team: "Backend Team",
  },
  {
    budget: 3800,
    id: "4",
    project: "Database Migration",
    status: "Paid",
    team: "DevOps Team",
  },
  {
    budget: 7200,
    id: "5",
    project: "User Dashboard",
    status: "Paid",
    team: "UX Team",
  },
  {
    budget: 2100,
    id: "6",
    project: "Security Audit",
    status: "Failed",
    team: "Security Team",
  },
]

function getProjectStatusColor(status: Project["status"]): string {
  switch (status) {
    case "Paid":
      return "bg-emerald-500"
    case "Unpaid":
      return "bg-muted-foreground/64"
    case "Pending":
      return "bg-amber-500"
    case "Failed":
      return "bg-red-500"
    default:
      return "bg-muted-foreground/64"
  }
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
})

const projectColumns: ColumnDef<Project>[] = [
  {
    cell: ({ row }) => {
      const toggleHandler = row.getToggleSelectedHandler()
      return (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => {
            const syntheticEvent = {
              target: { checked: !!value },
            } as unknown as React.ChangeEvent<HTMLInputElement>
            toggleHandler(syntheticEvent)
          }}
        />
      )
    },
    enableSorting: false,
    header: ({ table }) => {
      const isAllSelected = table.getIsAllPageRowsSelected()
      const isSomeSelected = table.getIsSomePageRowsSelected()
      const toggleHandler = table.getToggleAllPageRowsSelectedHandler()
      return (
        <Checkbox
          aria-label="Select all"
          checked={isAllSelected}
          indeterminate={isSomeSelected && !isAllSelected}
          onCheckedChange={(value) => {
            const syntheticEvent = {
              target: { checked: !!value },
            } as unknown as React.ChangeEvent<HTMLInputElement>
            toggleHandler(syntheticEvent)
          }}
        />
      )
    },
    id: "select",
  },
  {
    accessorKey: "project",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("project")}</div>
    ),
    header: "Project",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Project["status"]
      return (
        <Badge variant="outline">
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${getProjectStatusColor(status)}`}
          />
          {status}
        </Badge>
      )
    },
    header: "Status",
  },
  {
    accessorKey: "team",
    header: "Team",
  },
  {
    accessorKey: "budget",
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue("budget"))
      return (
        <div className="text-right">{currencyFormatter.format(amount)}</div>
      )
    },
    header: () => <div className="text-right">Budget</div>,
  },
]

function TabularNumsDemo(): React.ReactElement {
  const [value, setValue] = React.useState(84213)

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        onClick={() => setValue(Math.floor(Math.random() * 900_000) + 1)}
        size="sm"
        variant="outline"
      >
        Randomize
      </Button>
      <div className="flex flex-col gap-1.5 text-sm">
        <p>
          Without <code className="text-xs">tabular-nums</code>:{" "}
          <span className="font-semibold">{value.toLocaleString()}</span>{" "}
          bookmarks saved
        </p>
        <p>
          With <code className="text-xs">tabular-nums</code>:{" "}
          <span className="font-semibold tabular-nums">
            {value.toLocaleString()}
          </span>{" "}
          bookmarks saved
        </p>
      </div>
    </div>
  )
}

function DataTableDemo(): React.ReactElement {
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    columns: projectColumns,
    data: projects,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0)

  return (
    <CardFrame className="w-full">
      <Table variant="card">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              data-state={row.getIsSelected() && "selected"}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Budget</TableCell>
            <TableCell className="text-right">
              {currencyFormatter.format(totalBudget)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardFrame>
  )
}

export function DataLayoutSection(): React.ReactElement {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <AuditSection
      description="table, card, avatar, frame, group, toolbar, scroll-area, calendar."
      id="data-layout"
      title="Data & layout"
    >
      <AuditGroup label="Table — default" wrap={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.title}>
                <TableCell>{row.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.domain}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={row.status === "enriched" ? "success" : "outline"}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AuditGroup>

      <AuditGroup label="Table — card variant" wrap={false}>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Domain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.title}>
                <TableCell>{row.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.domain}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AuditGroup>

      <AuditGroup label="Table — data table with TanStack" wrap={false}>
        <DataTableDemo />
      </AuditGroup>

      <AuditGroup label="Tabular nums — jitter comparison" wrap={false}>
        <TabularNumsDemo />
      </AuditGroup>

      <AuditGroup label="Card" wrap={false}>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Reading list</CardTitle>
            <CardDescription>12 bookmarks · updated today</CardDescription>
          </CardHeader>
          <CardPanel className="text-sm text-muted-foreground">
            A calm place for links you want to read later.
          </CardPanel>
          <CardFooter className="justify-end gap-2">
            <Button size="sm" variant="ghost">
              Rename
            </Button>
            <Button size="sm">Open</Button>
          </CardFooter>
        </Card>
      </AuditGroup>

      <AuditGroup label="Avatar — image, fallback, sizes">
        <Avatar>
          <AvatarImage alt="Ada Lovelace" src="/logo.svg" />
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar className="size-6 text-[.625rem]">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar className="size-10">
          <AvatarFallback>RW</AvatarFallback>
        </Avatar>
      </AuditGroup>

      <AuditGroup label="Frame — panel composition" wrap={false}>
        <Frame className="w-full max-w-md">
          <FrameHeader>
            <FrameTitle>Collections</FrameTitle>
            <FrameDescription>
              Research, Reading list, Design references.
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <h2 className="text-sm font-semibold">Research</h2>
            <p className="text-sm text-muted-foreground">24 bookmarks</p>
          </FramePanel>
          <FrameFooter>
            <p className="text-sm text-muted-foreground">3 collections</p>
          </FrameFooter>
        </Frame>
      </AuditGroup>

      <AuditGroup label="Frame — separated panels" wrap={false}>
        <Frame className="w-full max-w-md">
          <FrameHeader>
            <FrameTitle>Section header</FrameTitle>
            <FrameDescription>
              Brief description about the section
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            <h2 className="text-sm font-semibold">Separated panel</h2>
            <p className="text-sm text-muted-foreground">Section description</p>
          </FramePanel>
          <FramePanel>
            <h2 className="text-sm font-semibold">Separated panel</h2>
            <p className="text-sm text-muted-foreground">Section description</p>
          </FramePanel>
        </Frame>
      </AuditGroup>

      <AuditGroup label="Group — connected controls">
        <Group>
          <Button variant="outline">Copy</Button>
          <GroupSeparator />
          <Button variant="outline">Paste</Button>
          <GroupSeparator />
          <Button variant="outline">Cut</Button>
        </Group>
        <Group>
          <Input placeholder="Enter URL…" />
          <GroupSeparator />
          <Button>Go</Button>
        </Group>
      </AuditGroup>

      <AuditGroup label="Toolbar" wrap={false}>
        <Toolbar>
          <ToggleGroup className="border-none p-0" defaultValue={["left"]}>
            <ToolbarButton
              aria-label="Align left"
              render={<ToggleGroupItem value="left" />}
            >
              <TextAlignLeftIcon />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Align center"
              render={<ToggleGroupItem value="center" />}
            >
              <TextAlignCenterIcon />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Align right"
              render={<ToggleGroupItem value="right" />}
            >
              <TextAlignRightIcon />
            </ToolbarButton>
          </ToggleGroup>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ToolbarButton
              aria-label="Bold"
              render={<Toggle size="sm" variant="outline" />}
            >
              <TextBIcon />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Italic"
              render={<Toggle size="sm" variant="outline" />}
            >
              <TextItalicIcon />
            </ToolbarButton>
          </ToolbarGroup>
        </Toolbar>
      </AuditGroup>

      <AuditGroup label="Scroll area — fade" wrap={false}>
        <ScrollArea
          className="h-40 w-full max-w-md rounded-lg border"
          scrollFade
          scrollbarGutter
        >
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 12 }, (_, index) => (
              <p className="text-sm" key={String(index)}>
                Bookmark row {index + 1}
              </p>
            ))}
          </div>
        </ScrollArea>
      </AuditGroup>

      <AuditGroup label="Calendar" wrap={false}>
        <Calendar mode="single" onSelect={setDate} selected={date} />
      </AuditGroup>
    </AuditSection>
  )
}
