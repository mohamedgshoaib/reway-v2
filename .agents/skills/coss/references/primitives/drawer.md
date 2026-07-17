# coss Drawer

## When to use

- Mobile-first overlay panels and bottom sheets.
- Form-heavy or multi-step overlays where popover is too constrained.

## When NOT to use

- If the overlay should be a centered modal -> use Dialog instead.
- If the overlay should be a persistent side panel on desktop -> use Sheet instead.
- If you need a simple confirmation -> use AlertDialog instead.

## Install

```bash
npx shadcn@latest add @coss/drawer
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Drawer,
  DrawerCreateHandle,
  DrawerClose,
  DrawerContent,
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
  DrawerPanel,
  DrawerPopup,
  DrawerMenuTrigger,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
```

## Minimal pattern

```tsx
<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerPopup>
    <DrawerHeader>
      <DrawerTitle>Drawer Title</DrawerTitle>
      <DrawerDescription>Drawer Description</DrawerDescription>
    </DrawerHeader>
    <DrawerPanel>Content</DrawerPanel>
    <DrawerFooter>
      <DrawerClose>Close</DrawerClose>
    </DrawerFooter>
  </DrawerPopup>
</Drawer>
```

## Patterns from coss particles

- **Portal forwarding**: optional `portalProps` on `DrawerPopup` → Base UI `Drawer.Portal` (`keepMounted`, `container`, …). See [portal-props.md](../portal-props.md).

### Key patterns

Drawer with handle:

```tsx
<Drawer>
  <DrawerTrigger render={<Button variant="outline" />}>Open Drawer</DrawerTrigger>
  <DrawerPopup>
    <DrawerCreateHandle />
    <DrawerHeader>
      <DrawerTitle>Edit Profile</DrawerTitle>
      <DrawerDescription>Make changes to your profile here.</DrawerDescription>
    </DrawerHeader>
    <DrawerPanel>
      {/* Form content */}
    </DrawerPanel>
    <DrawerFooter>
      <Button>Save</Button>
      <DrawerClose render={<Button variant="ghost" />}>Cancel</DrawerClose>
    </DrawerFooter>
  </DrawerPopup>
</Drawer>
```

Responsive drawer + dialog (drawer on mobile, dialog on desktop): see `p-drawer-12`.

### More examples

See `p-drawer-1` through `p-drawer-13` for inset, straight, scrollable, nested, snap points, mobile menu, and responsive patterns.

## Common pitfalls

- Using drawer for desktop modal flows where dialog/sheet is clearer.
- Forgetting responsive switch logic when drawer is mobile-only variant.
- Breaking section layout by putting the whole dialog in a block-level `<form>`; prefer **header outside**, **`Form className="contents"`** around **panel + footer** (see dialog/form skills).
- **`DrawerViewport` must declare `[--inset:0px]`, not `[--inset:--spacing(0)]`.** In this project's installed Tailwind v4 (4.3.2), `--spacing(0)` compiles to a bare unitless `0` instead of `0px`. That breaks every `calc(-100% - var(--inset))` / `calc(100% + ... + var(--inset))` expression used in the non-`inset` variants' `data-starting-style`/`data-ending-style` transforms (invalid `calc()` operand → whole `transform` declaration dropped → drawer mounts with zero motion instead of sliding in/out), and also corrupts the bottom-position snap-points entrance transform (drawer briefly renders at full/natural height before snapping to the target point instead of animating directly to it). Only `variant="inset"` happened to work, because it separately overrides `--inset` with a properly-unit-typed `calc(var(--spacing) * 4)`. If `drawer.tsx` is ever re-copied from `npx shadcn@latest add @coss/drawer` or coss's registry, this line will silently regress — re-apply `[--inset:0px]` after any re-install.

## Useful particle references

- inset variant: `p-drawer-4`
- straight variant: `p-drawer-5`
- scrollable content: `p-drawer-6`
- nested drawers: `p-drawer-7`
- snap points: `p-drawer-9`
- mobile menu: `p-drawer-11`
- responsive dialog: `p-drawer-12`
- responsive menu: `p-drawer-13`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
