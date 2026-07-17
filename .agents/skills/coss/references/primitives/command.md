# coss Command

## When to use

- Command palette and keyboard-navigable action menus.
- Fast action discovery for power-user and app shortcut workflows.

## When NOT to use

- If the list is a simple set of actions without search -> use Menu instead.
- If the user is selecting from a predefined list -> use Select or Combobox instead.
- If the flow is a data form -> use Form instead.

## Install

```bash
npx shadcn@latest add @coss/command
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
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
import { Button } from "@/components/ui/button"
```

## Minimal pattern

```tsx
const items = [
  { value: "linear", label: "Linear" },
  { value: "figma", label: "Figma" },
  { value: "slack", label: "Slack" },
]

<CommandDialog>
  <CommandDialogTrigger render={<Button variant="outline" />}>
    Open Command Palette
  </CommandDialogTrigger>

  <CommandDialogPopup>
    <Command items={items}>
      <CommandInput placeholder="Search..." />
      <CommandPanel>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandList>
          {(item) => (
            <CommandItem key={item.value} value={item.value}>
              {item.label}
            </CommandItem>
          )}
        </CommandList>
      </CommandPanel>
      <CommandFooter>{/* nav/select/close hints */}</CommandFooter>
    </Command>
  </CommandDialogPopup>
</CommandDialog>
```

**Structure inside `Command`** (order matters — `CommandInput` and `CommandFooter` sit *outside* `CommandPanel`):

- `CommandInput` — search field, directly under `Command`.
- `CommandPanel` — the scrollable content region; wraps `CommandEmpty` + `CommandList`. Supplies the inner bordered/rounded panel and the scroll area. Used **inside** the dialog, not only standalone.
- `CommandFooter` — optional hint bar (⌘ nav/select/close), directly under `Command` after the panel.

## Patterns from coss particles

- **Portal forwarding**: optional `portalProps` on `CommandDialogPopup` → Base UI `Dialog.Portal` (`keepMounted`, `container`, …). See [portal-props.md](../portal-props.md).

### Key patterns

Grouped items — nest `CommandGroup` + `CommandCollection` inside `CommandList` (keep the outer `CommandInput`/`CommandPanel`/`CommandFooter` structure from the minimal pattern):

```tsx
<CommandList>
  {(group) => (
    <Fragment key={group.value}>
      <CommandGroup items={group.items}>
        <CommandGroupLabel>{group.value}</CommandGroupLabel>
        <CommandCollection>
          {(item) => (
            <CommandItem key={item.value} value={item.value}>
              {item.label}
            </CommandItem>
          )}
        </CommandCollection>
      </CommandGroup>
      <CommandSeparator />
    </Fragment>
  )}
</CommandList>
```

Keyboard shortcut: use controlled `open`/`onOpenChange`, and wire the toggle with `useHotkey("Mod+J", () => setOpen((o) => !o))` from `@tanstack/react-hotkeys` — **not** the `useEffect` + `addEventListener` the coss docs show (this repo bans `useEffect` in components; same pattern as `ThemeHotkey`).

### More examples

See `p-command-1` and `p-command-2` for dialog palette and grouped action patterns.

## Common pitfalls

- Using command list without clear grouping and action labels.
- Binding critical destructive actions without confirmation pathway.
- Missing keyboard accessibility checks for arrow/select/escape interactions.
- Omitting `CommandPanel` around the list (or putting `CommandInput` inside it) breaks scrolling and the panel/footer border seams — see the structure note under Minimal pattern.

## Useful particle references

- core patterns: `p-command-1`, `p-command-2`
- related search/selection references: `p-autocomplete-1`, `p-select-1`, `p-input-group-1`
