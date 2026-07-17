import {
  ArrowDownIcon,
  ArrowElbowDownLeftIcon,
  ArrowUpIcon,
  CopyIcon,
  DotsThreeIcon,
  FolderIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PencilSimpleIcon,
  ShareIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { useHotkey } from "@tanstack/react-hotkeys"
import { Link } from "@tanstack/react-router"
import * as React from "react"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
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
  CommandShortcut,
} from "@/components/ui/command"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerMenu,
  DrawerMenuCheckboxItem,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuRadioGroup,
  DrawerMenuRadioItem,
  DrawerMenuSeparator,
  DrawerMenuTrigger,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Field, FieldLabel } from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"
import { useIsMobile } from "@/hooks/use-media-query"

interface CommandEntry {
  value: string
  label: string
  shortcut?: string
}

interface CommandGroupData {
  value: string
  items: CommandEntry[]
}

const commandSuggestions: CommandEntry[] = [
  { label: "Linear", shortcut: "⌘L", value: "linear" },
  { label: "Figma", shortcut: "⌘F", value: "figma" },
  { label: "Slack", shortcut: "⌘S", value: "slack" },
  { label: "YouTube", shortcut: "⌘Y", value: "youtube" },
  { label: "Raycast", shortcut: "⌘R", value: "raycast" },
]

const commandActions: CommandEntry[] = [
  { label: "Clipboard History", shortcut: "⌘⇧C", value: "clipboard-history" },
  { label: "Import Extension", shortcut: "⌘I", value: "import-extension" },
  { label: "Create Snippet", shortcut: "⌘N", value: "create-snippet" },
  { label: "System Preferences", shortcut: "⌘,", value: "system-preferences" },
  { label: "Window Management", shortcut: "⌘⇧W", value: "window-management" },
]

const commandGroups: CommandGroupData[] = [
  { value: "Suggestions", items: commandSuggestions },
  { value: "Commands", items: commandActions },
]

function DialogDemo(): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Basic dialog
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Rename collection</DialogTitle>
          <DialogDescription>
            This name is visible in the sidebar and search.
          </DialogDescription>
        </DialogHeader>
        <Form className="contents" onSubmit={(event) => event.preventDefault()}>
          <DialogPanel>
            <Field name="collection-name">
              <FieldLabel>Name</FieldLabel>
              <Input defaultValue="Research" />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  )
}

function AlertDialogDemo(): React.ReactElement {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive-outline" />}>
        Delete collection
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the collection. Bookmarks inside it are not
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" />}>
            Delete
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

function SheetDemo({
  side,
}: {
  side: "right" | "left" | "top" | "bottom"
}): React.ReactElement {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>{side}</SheetTrigger>
      <SheetPopup side={side}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Make changes to your profile.</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          <Field name="username">
            <FieldLabel>Username</FieldLabel>
            <Input defaultValue="reader" />
          </Field>
        </SheetPanel>
        <SheetFooter>
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <Button>Save</Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  )
}

function DrawerDemo(): React.ReactElement {
  return (
    <Drawer position="bottom">
      <DrawerTrigger render={<Button variant="outline" />}>
        Open drawer
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerHeader>
          <DrawerTitle>Move bookmark</DrawerTitle>
          <DrawerDescription>
            Choose a destination collection.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>Content</DrawerPanel>
        <DrawerFooter>
          <DrawerClose render={<Button variant="ghost" />}>Close</DrawerClose>
          <Button>Move</Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function DrawerVariantDemo({
  variant,
}: {
  variant: "inset" | "straight"
}): React.ReactElement {
  const positions = ["right", "left", "top", "bottom"] as const

  return (
    <>
      {positions.map((position) => (
        <Drawer key={position} position={position}>
          <DrawerTrigger render={<Button variant="outline" />}>
            {position}
          </DrawerTrigger>
          <DrawerPopup variant={variant}>
            <DrawerHeader>
              <DrawerTitle className="capitalize">{position}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel>
              <p className="text-sm text-muted-foreground">
                Content from the {position}.
              </p>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      ))}
    </>
  )
}

function DrawerScrollableDemo(): React.ReactElement {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Scrollable content
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerHeader>
          <DrawerTitle>Scrollable content</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 48 }, (_, i) => `box-${i}`).map((key) => (
              <div
                className="h-12 shrink-0 rounded-xl border bg-muted"
                key={key}
              />
            ))}
          </div>
        </DrawerPanel>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function DrawerNestedDemo(): React.ReactElement {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Nested drawers
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerHeader className="text-center">
          <DrawerTitle>First step</DrawerTitle>
          <DrawerDescription>
            This is the first step. Tap the button below to continue to the next
            screen.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter
          className="justify-center sm:justify-center"
          variant="bare"
        >
          <DrawerClose render={<Button variant="ghost" />}>Cancel</DrawerClose>
          <Drawer>
            <DrawerTrigger render={<Button variant="outline" />}>
              Continue
            </DrawerTrigger>
            <DrawerPopup showBar>
              <DrawerHeader className="text-center">
                <DrawerTitle>Second step</DrawerTitle>
                <DrawerDescription>
                  You&apos;ve reached the second step. Tap the button below to
                  continue to the next screen.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerPanel>
                <div className="flex justify-center">
                  <div className="size-48 shrink-0 rounded-xl border bg-muted" />
                </div>
              </DrawerPanel>
              <DrawerFooter
                className="justify-center sm:justify-center"
                variant="bare"
              >
                <DrawerClose render={<Button variant="ghost" />}>
                  Back
                </DrawerClose>
                <Drawer>
                  <DrawerTrigger render={<Button variant="outline" />}>
                    Continue
                  </DrawerTrigger>
                  <DrawerPopup showBar>
                    <DrawerHeader className="text-center">
                      <DrawerTitle>Third step</DrawerTitle>
                      <DrawerDescription>
                        You&apos;ve reached the final step. You can close this
                        drawer or go back.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerPanel>
                      <div className="flex justify-center">
                        <div className="size-32 shrink-0 rounded-full border bg-muted" />
                      </div>
                    </DrawerPanel>
                  </DrawerPopup>
                </Drawer>
              </DrawerFooter>
            </DrawerPopup>
          </Drawer>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function DrawerSnapPointsDemo(): React.ReactElement {
  const snapPoints = ["300px", 1] as const
  const [snapPoint, setSnapPoint] = React.useState<
    (typeof snapPoints)[number] | null
  >(snapPoints[0])

  return (
    <Drawer
      onSnapPointChange={(point) =>
        setSnapPoint(point as (typeof snapPoints)[number] | null)
      }
      position="bottom"
      snapPoint={snapPoint}
      snapPoints={[...snapPoints]}
      snapToSequentialPoints
    >
      <DrawerTrigger render={<Button variant="outline" />}>
        With snap points
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerHeader>
          <DrawerTitle>Snap points</DrawerTitle>
          <DrawerDescription>
            Drag the drawer to snap between a compact peek and full-height view.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 48 }, (_, i) => `box-${i}`).map((key) => (
              <div
                className="h-12 shrink-0 rounded-xl border bg-muted"
                key={key}
              />
            ))}
          </div>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function DrawerMobileMenuDemo(): React.ReactElement {
  const navItems = ["Home", "Profile", "Settings", "Sign out"]

  return (
    <Drawer position="left">
      <DrawerTrigger render={<Button variant="outline" />}>
        Open menu
      </DrawerTrigger>
      <DrawerPopup showCloseButton variant="straight">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel>
          <nav className="-mx-[calc(--spacing(3)-1px)] flex flex-col gap-0.5">
            {navItems.map((item) => (
              <DrawerClose
                key={item}
                nativeButton={false}
                render={
                  <Button
                    className="justify-start"
                    render={<Link to="/" />}
                    variant="ghost"
                  />
                }
              >
                {item}
              </DrawerClose>
            ))}
          </nav>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function ResponsiveMenuDemo(): React.ReactElement {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger
          render={
            <Button aria-label="Open menu" size="icon" variant="outline" />
          }
        >
          <DotsThreeIcon aria-hidden="true" />
        </DrawerTrigger>
        <DrawerPopup showBar>
          <DrawerPanel>
            <DrawerMenu>
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Actions</DrawerMenuGroupLabel>
                <DrawerClose render={<DrawerMenuItem />}>
                  <PencilIcon aria-hidden="true" />
                  Edit
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <CopyIcon aria-hidden="true" />
                  Duplicate
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <ShareIcon aria-hidden="true" />
                  Share
                </DrawerClose>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuCheckboxItem>Shuffle</DrawerMenuCheckboxItem>
              <DrawerMenuCheckboxItem>Repeat</DrawerMenuCheckboxItem>
              <DrawerMenuCheckboxItem disabled>
                Enhanced audio
              </DrawerMenuCheckboxItem>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Sort by</DrawerMenuGroupLabel>
                <DrawerMenuRadioGroup defaultValue="artist">
                  <DrawerMenuRadioItem value="artist">
                    Artist
                  </DrawerMenuRadioItem>
                  <DrawerMenuRadioItem value="album">Album</DrawerMenuRadioItem>
                  <DrawerMenuRadioItem value="title">Title</DrawerMenuRadioItem>
                </DrawerMenuRadioGroup>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuCheckboxItem variant="switch">
                Auto save
              </DrawerMenuCheckboxItem>
              <DrawerMenuSeparator />
              <Drawer>
                <DrawerMenuTrigger>Add to collection</DrawerMenuTrigger>
                <DrawerPopup showBar>
                  <DrawerPanel>
                    <DrawerMenu>
                      <DrawerMenuGroup>
                        <DrawerMenuGroupLabel>
                          Add to collection
                        </DrawerMenuGroupLabel>
                      </DrawerMenuGroup>
                      <DrawerClose render={<DrawerMenuItem />}>
                        Research
                      </DrawerClose>
                      <DrawerClose render={<DrawerMenuItem />}>
                        Reading list
                      </DrawerClose>
                      <DrawerClose render={<DrawerMenuItem />}>
                        Design references
                      </DrawerClose>
                    </DrawerMenu>
                  </DrawerPanel>
                </DrawerPopup>
              </Drawer>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Danger zone</DrawerMenuGroupLabel>
                <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
                  <TrashIcon aria-hidden="true" />
                  Delete
                </DrawerClose>
              </DrawerMenuGroup>
            </DrawerMenu>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    )
  }

  return (
    <Menu>
      <MenuTrigger
        render={<Button aria-label="Open menu" size="icon" variant="outline" />}
      >
        <DotsThreeIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup>
        <MenuGroup>
          <MenuGroupLabel>Actions</MenuGroupLabel>
          <MenuItem>
            <PencilIcon aria-hidden="true" />
            Edit
          </MenuItem>
          <MenuItem>
            <CopyIcon aria-hidden="true" />
            Duplicate
          </MenuItem>
          <MenuItem>
            <ShareIcon aria-hidden="true" />
            Share
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuCheckboxItem>Shuffle</MenuCheckboxItem>
        <MenuCheckboxItem>Repeat</MenuCheckboxItem>
        <MenuCheckboxItem disabled>Enhanced audio</MenuCheckboxItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Sort by</MenuGroupLabel>
          <MenuRadioGroup defaultValue="artist">
            <MenuRadioItem value="artist">Artist</MenuRadioItem>
            <MenuRadioItem value="album">Album</MenuRadioItem>
            <MenuRadioItem value="title">Title</MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuCheckboxItem variant="switch">Auto save</MenuCheckboxItem>
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger>Add to collection</MenuSubTrigger>
          <MenuSubPopup>
            <MenuItem>Research</MenuItem>
            <MenuItem>Reading list</MenuItem>
            <MenuItem>Design references</MenuItem>
          </MenuSubPopup>
        </MenuSub>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Danger zone</MenuGroupLabel>
          <MenuItem variant="destructive">
            <TrashIcon aria-hidden="true" />
            Delete
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  )
}

function ResponsiveDrawerDialogDemo(): React.ReactElement {
  const isMobile = useIsMobile()

  const formFields = (
    <>
      <Field name="audit-responsive-name">
        <FieldLabel>Name</FieldLabel>
        <Input defaultValue="Margaret Welsh" type="text" />
      </Field>
      <Field name="audit-responsive-username">
        <FieldLabel>Username</FieldLabel>
        <Input defaultValue="@maggie.welsh" type="text" />
      </Field>
    </>
  )

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger render={<Button variant="outline" />}>
          Open
        </DrawerTrigger>
        <DrawerPopup showBar>
          <DrawerHeader>
            <DrawerTitle>Edit profile</DrawerTitle>
            <DrawerDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DrawerDescription>
          </DrawerHeader>
          <Form className="contents">
            <DrawerPanel className="grid gap-4" scrollable={false}>
              {formFields}
            </DrawerPanel>
            <DrawerFooter>
              <DrawerClose render={<Button variant="ghost" />}>
                Cancel
              </DrawerClose>
              <Button type="submit">Save</Button>
            </DrawerFooter>
          </Form>
        </DrawerPopup>
      </Drawer>
    )
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form className="contents">
          <DialogPanel className="grid gap-4">{formFields}</DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  )
}

function KitchenSinkMenuItems(): React.ReactElement {
  return (
    <>
      <MenuGroup>
        <MenuGroupLabel>Bookmark</MenuGroupLabel>
        <MenuItem>
          <PencilSimpleIcon /> Edit
          <MenuShortcut>E</MenuShortcut>
        </MenuItem>
        <MenuItem>
          <ShareNetworkIcon /> Copy URL
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger>
            <FolderIcon /> Move to collection
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuItem>Research</MenuItem>
            <MenuItem>Reading list</MenuItem>
          </MenuSubPopup>
        </MenuSub>
      </MenuGroup>
      <MenuSeparator />
      <MenuCheckboxItem defaultChecked>Show favicon</MenuCheckboxItem>
      <MenuCheckboxItem variant="switch">Show domain</MenuCheckboxItem>
      <MenuSeparator />
      <MenuRadioGroup defaultValue="date">
        <MenuRadioItem value="date">Sort: date added</MenuRadioItem>
        <MenuRadioItem value="alpha">Sort: alphabetical</MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem variant="destructive">
        <TrashIcon /> Delete
        <MenuShortcut>⌫</MenuShortcut>
      </MenuItem>
    </>
  )
}

function MenuDemo(): React.ReactElement {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button aria-label="Bookmark actions" size="icon" variant="ghost" />
        }
      >
        <GearIcon />
      </MenuTrigger>
      <MenuPopup>
        <KitchenSinkMenuItems />
      </MenuPopup>
    </Menu>
  )
}

function ContextMenuDemo(): React.ReactElement {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-24 w-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Right click this bookmark
      </ContextMenuTrigger>
      <ContextMenuPopup>
        <ContextMenuGroup>
          <ContextMenuGroupLabel>Bookmark</ContextMenuGroupLabel>
          <ContextMenuItem>
            <PencilSimpleIcon /> Edit
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderIcon /> Move to collection
            </ContextMenuSubTrigger>
            <ContextMenuSubPopup>
              <ContextMenuItem>Research</ContextMenuItem>
              <ContextMenuItem>Reading list</ContextMenuItem>
            </ContextMenuSubPopup>
          </ContextMenuSub>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem defaultChecked>
          Show favicon
        </ContextMenuCheckboxItem>
        <ContextMenuRadioGroup defaultValue="date">
          <ContextMenuRadioItem value="date">
            Sort: date added
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="alpha">
            Sort: alphabetical
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">
          <TrashIcon /> Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuPopup>
    </ContextMenu>
  )
}

function CommandDemo(): React.ReactElement {
  const [open, setOpen] = React.useState(false)

  useHotkey("Mod+J", () => setOpen((prev) => !prev))

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandDialogTrigger render={<Button variant="outline" />}>
        Open Command Palette
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>J</Kbd>
        </KbdGroup>
      </CommandDialogTrigger>
      <CommandDialogPopup>
        <Command items={commandGroups}>
          <CommandInput placeholder="Search for apps and commands..." />
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
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut && (
                            <CommandShortcut>{item.shortcut}</CommandShortcut>
                          )}
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
            <div className="flex items-center gap-2">
              <Kbd>Esc</Kbd>
              <span>Close</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}

export function OverlaysSection(): React.ReactElement {
  return (
    <AuditSection
      description="dialog, alert-dialog, sheet, drawer, popover, tooltip, preview-card, menu, context-menu, command."
      id="overlays"
      title="Overlays"
    >
      <AuditGroup label="Dialog — with form-in-dialog composition">
        <DialogDemo />
      </AuditGroup>

      <AuditGroup label="Alert dialog — destructive confirmation">
        <AlertDialogDemo />
      </AuditGroup>

      <AuditGroup label="Sheet — sides">
        <SheetDemo side="right" />
        <SheetDemo side="left" />
        <SheetDemo side="bottom" />
        <SheetDemo side="top" />
      </AuditGroup>

      <AuditGroup label="Drawer — bottom, with handle">
        <DrawerDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — inset variant">
        <DrawerVariantDemo variant="inset" />
      </AuditGroup>

      <AuditGroup label="Drawer — straight variant">
        <DrawerVariantDemo variant="straight" />
      </AuditGroup>

      <AuditGroup label="Drawer — scrollable content">
        <DrawerScrollableDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — nested">
        <DrawerNestedDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — snap points">
        <DrawerSnapPointsDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — mobile menu">
        <DrawerMobileMenuDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — responsive dialog (resize viewport)">
        <ResponsiveDrawerDialogDemo />
      </AuditGroup>

      <AuditGroup label="Drawer — responsive menu (resize viewport)">
        <ResponsiveMenuDemo />
      </AuditGroup>

      <AuditGroup label="Popover — default & tooltip-style">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            Open popover
          </PopoverTrigger>
          <PopoverPopup>
            <PopoverTitle>Collection settings</PopoverTitle>
            <PopoverDescription>
              Choose how this collection sorts by default.
            </PopoverDescription>
          </PopoverPopup>
        </Popover>
        <Popover>
          <PopoverTrigger
            render={<Button aria-label="Help" size="icon" variant="ghost" />}
          >
            ?
          </PopoverTrigger>
          <PopoverPopup tooltipStyle>
            Uncollected bookmarks use system sorts only.
          </PopoverPopup>
        </Popover>
      </AuditGroup>

      <AuditGroup label="Tooltip — grouped">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Search" size="icon" variant="ghost" />
              }
            >
              <MagnifyingGlassIcon />
            </TooltipTrigger>
            <TooltipPopup>Search</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Settings" size="icon" variant="ghost" />
              }
            >
              <GearIcon />
            </TooltipTrigger>
            <TooltipPopup>Settings</TooltipPopup>
          </Tooltip>
        </TooltipProvider>
      </AuditGroup>

      <AuditGroup label="Preview card">
        <PreviewCard>
          <PreviewCardTrigger
            className="text-sm underline underline-offset-4"
            render={<button aria-label="Reway library" type="button" />}
          >
            reway.page/library
          </PreviewCardTrigger>
          <PreviewCardPopup>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium">Reway library</h4>
              <p className="text-sm text-muted-foreground">
                A calm, searchable home for the links you actually meant to
                keep.
              </p>
            </div>
          </PreviewCardPopup>
        </PreviewCard>
      </AuditGroup>

      <AuditGroup label="Menu — kitchen sink">
        <MenuDemo />
      </AuditGroup>

      <AuditGroup label="Context menu — kitchen sink" wrap={false}>
        <ContextMenuDemo />
      </AuditGroup>

      <AuditGroup label="Command — grouped palette (⌘J)">
        <CommandDemo />
      </AuditGroup>
    </AuditSection>
  )
}
