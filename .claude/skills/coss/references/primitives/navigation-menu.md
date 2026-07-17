# Navigation Menu

## When to use

- Top-level app/site navigation with hover-activated dropdown panels (grouped links, feature previews).
- Any menu that needs nested submenus, either as separate popups or staying inline in the same panel.

**Not a coss primitive.** coss ui does not ship a navigation-menu component or docs page. This is built directly on `@base-ui/react/navigation-menu`, composed to match coss's own styling conventions (`data-slot`, `cn()`, `cva` variants, token classes) as closely as possible. There is no `npx shadcn add @coss/navigation-menu` — verify any API change against Base UI's docs (`https://base-ui.com/react/components/navigation-menu`) and source (`github.com/mui/base-ui`, `docs/src/app/(docs)/react/components/navigation-menu/demos/`), never against coss.

## Install

```bash
npm install @base-ui/react
```

Copy `src/components/ui/navigation-menu.tsx` directly; there is no registry entry to install from.

## Canonical imports

```tsx
import {
  NavigationMenu,
  NavigationMenuBackdrop,
  NavigationMenuContent,
  NavigationMenuIcon,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPortal,
  NavigationMenuTrigger,
  navigationMenuTriggerVariants,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
```

## Minimal pattern

```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        Library
        <NavigationMenuIcon />
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="flex list-none flex-col">
          <li>
            <NavigationMenuLink className="block p-2" href="/library">
              All bookmarks
            </NavigationMenuLink>
          </li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink className={navigationMenuTriggerVariants()} href="/">
        Home
      </NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>

  <NavigationMenuPopup />
</NavigationMenu>
```

`NavigationMenuPopup` renders `Portal → [Backdrop] → Positioner → Popup → Viewport` internally and takes one per `NavigationMenu` root (top-level or nested-with-its-own-popup). Render it once, as a sibling of `NavigationMenuList`, not per item.

### Nested submenu (separate popup)

A nested `NavigationMenu.Root` placed inside a `Content` panel **still needs its own `List`** — confirmed against Base UI's raw demo source (`demos/nested/tailwind/index.tsx`, fetched via the GitHub API and base64-decoded directly, not summarized). Omitting it is a real bug, not just a style nit: `Item` renders as `<li>` by default, and the grid cell wrapping this nested Root is itself a hand-written `<li>` (a sibling of the plain-link `<li>`s in the same `<ul>`) — with no `List` (which renders `<ul>`) in between, you get `<li><li>`, invalid HTML that React flags as a hydration warning on interaction. `List` defaults to row-flex with no stretch, so a single `Item` inside it will collapse to its content width unless you also add `flex-col items-stretch` (this project's own convention for any vertical Root, see pitfalls below) — that's what actually shrinks the trigger, not the presence of `List` itself.

```tsx
<NavigationMenuContent>
  <ul className="grid grid-cols-2">
    <li>{/* plain link items */}</li>
    <li>
      <NavigationMenu className="h-full" orientation="vertical">
        <NavigationMenuList className="h-full flex-col items-stretch">
          <NavigationMenuItem className="h-full">
            <NavigationMenuTrigger className="h-full w-full flex-col items-start justify-start gap-1 p-2 text-left font-normal">
              <span>Collections</span>
              <p>Grouped by topic.</p>
              <NavigationMenuIcon className="absolute top-1/2 right-2.5 -translate-y-1/2 data-popup-open:rotate-180" />
            </NavigationMenuTrigger>
            <NavigationMenuContent>{/* ... */}</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuPopup align="end" alignOffset={-8} side="right" />
      </NavigationMenu>
    </li>
  </ul>
</NavigationMenuContent>
```

### Nested inline submenus (same panel, no Portal)

For a second level that stays in the same panel (audience/category switchers), omit `NavigationMenuPopup`/`NavigationMenuPortal` on the nested `Root` and render only `NavigationMenuList` + `NavigationMenuViewport` directly:

```tsx
<NavigationMenu defaultValue="collectors" orientation="vertical">
  <div className="grid grid-cols-[13rem_1fr]">
    <NavigationMenuList className="flex-col">
      {menus.map((menu) => (
        <NavigationMenuItem key={menu.value} value={menu.value}>
          <NavigationMenuTrigger>{menu.label}</NavigationMenuTrigger>
          <NavigationMenuContent>{/* panel content */}</NavigationMenuContent>
        </NavigationMenuItem>
      ))}
    </NavigationMenuList>
    <NavigationMenuViewport />
  </div>
</NavigationMenu>
```

Base UI's reference animation classes for this pattern (outer panel slide + inline submenu slide/blur) are reproduced verbatim in `src/dev/ui-audit/sections/navigation.tsx` (`inlineOuterContentClassName`, `inlineSubmenuContentClassName`) — copy them rather than re-deriving, the exact duration/easing/blur values are load-bearing for the intended feel.

## Common pitfalls

- **Rounded-corner hit-test dead zone.** `rounded-lg` on a trigger clips its own hit-test region to the rounded shape, leaving dead pixels in the corners where adjacent triggers meet. Parking a cursor there past the ~50ms `closeDelay` closes the popup instead of morphing to the next trigger. Fixed once, in the shared component, via `after:absolute after:inset-0` on `navigationMenuTriggerVariants` — restores a square hit area without changing the visual radius. Any new trigger built from these variants gets this for free; don't reintroduce a hand-rolled trigger without it.
- **Any list gap is a hover trap, however small.** Base UI's own reference ships `gap-px`/`gap-1` between adjacent triggers (confirmed both from their GitHub demo source and from live `getComputedStyle()` on base-ui.com — this is real, not a rendering illusion). But a real gap, even 1px, is dead space no trigger's hit-box covers. `NavigationMenuList` in this project deliberately drops it to zero everywhere — top-level rows and nested vertical trigger stacks alike — relying on each trigger's own padding for visual spacing instead. Confirmed via pixel-level `elementFromPoint` sweeps: a 1px gap in a vertical trigger stack measures as a full dead row at the seam; zero gap measures zero dead pixels. Never add `gap-*` back to `NavigationMenuList` or its usages, even to "match upstream."
- **Cursor convention.** Triggers get no `cursor-pointer` — they open a popup in place rather than navigate, matching the Menu/Select `cursor-default` convention. Links sharing `navigationMenuTriggerVariants` still get `pointer` from the UA stylesheet automatically; don't add it explicitly to either.
- **`data-orientation` does not exist on NavigationMenu.** Unlike Tabs/ToggleGroup, Base UI's NavigationMenu exposes no `data-orientation` attribute anywhere in its DOM output (verified by scanning the actual rendered markup — Tabs and ToggleGroup are the only two primitives that expose it). A vertical `NavigationMenu.Root` must have its `List` laid out explicitly (`flex-col items-stretch`) by the consumer; `data-[orientation=vertical]:` selectors targeting this component are dead code that will silently never match.
- **`h-full` must chain unbroken from grid cell to trigger.** Grid rows stretch to their tallest cell, but `height: 100%` breaks at the first `auto`-sized ancestor in the chain. A nested trigger inside a grid cell needs `h-full` on the nested `NavigationMenu` Root, its `NavigationMenuList`, its `NavigationMenuItem`, and the `NavigationMenuTrigger` itself — miss any link and the trigger's hit area (and hover background) stops at its text height instead of filling the row, leaving a dead strip below it that's visually indistinguishable from a bug in the cell above.
- **Don't remove `List` to "fix" a shrunk nested trigger.** A single `Item` inside a bare (no `flex-col items-stretch`) `List` collapses to content width, which looks like `List` itself is the problem. It isn't — the fix is `flex-col items-stretch` on that `List` (see the nested-submenu pattern above), not deleting it. Deleting it fixes the width by accident (the `Item`'s `<li>` becomes a normal block child instead of a flex item) but breaks HTML validity, since there's then no `<ul>` between the grid cell's own `<li>` and the `Item`'s `<li>` — a real, silent bug (only surfaces as a console hydration warning on interaction, not on initial load, so it's easy to ship). Verify this class of fix against Base UI's raw demo source (fetch + base64-decode via the GitHub API, not a summarized fetch) before trusting a structural claim about "what Base UI's reference does or doesn't include" — a prior pass in this exact file got this backwards from a paraphrased fetch and shipped the broken version for a full session.
- **Flex-column trigger gap stacks with a child's own margin.** `navigationMenuTriggerVariants` carries `gap-1.5` for the default single-line horizontal trigger. Reusing it for a `flex-col` multi-line trigger (title + description) without overriding that gap means it stacks with any margin on the title (e.g. `mb-1`), producing a visibly larger, inconsistent title-to-description gap than a sibling built without a container gap (a plain link card using only `mb-1` measured 4px; the same content in an un-overridden trigger measured 10px). Always override the gap explicitly on `flex-col` trigger usages and drop the redundant margin — one source of spacing, not two.
- **ScrollArea does not compose with NavigationMenu's size-morph animation.** Base UI's docs recommend swapping the native scrollbar for a Scroll Area component on large menus ("native scrollbars are visible while transitioning content... also allows the Arrow to be centered correctly") — but ship no working example of it anywhere in their demos. In practice the two primitives fight: the popup morphs its height over `--duration` while `ResizeObserver`-measuring `Content`, and `ScrollArea` observes that same box to recompute overflow state, thumb size, and fade mask vars, every frame of the transition. Each drives the other — the panel judders and scroll position resets to top on scroll. Base UI's plain-CSS fallback (`max-height: var(--available-height)` on both `Content` and `Popup`, plain `overflow-y: auto` on `Content`) is what's actually implemented; don't retry ScrollArea here without first patching either primitive's observer behavior.
- **Left-aligned by default, not centered.** Base UI's Positioner defaults `align` to `"center"`. This project's `NavigationMenuPopup` wrapper defaults it to `"start"` instead (logical, so it flips under RTL) to match a leading-edge-aligned nav bar. Pass `align="center"` explicitly if a specific popup genuinely wants Base UI's default.

## Local divergences from upstream (survive a re-install!)

Since this file has no upstream registry entry to diff against, "upstream" here means Base UI's own reference demos, not coss. Divergences, all deliberate:

- **Zero gap on `NavigationMenuList`**, everywhere, vs. Base UI's `gap-px`/`gap-1` — see pitfalls above.
- **`after:absolute after:inset-0` hit-square** on `navigationMenuTriggerVariants` — not in Base UI's reference, added to fix the rounded-corner dead zone.
- **No `cursor-pointer`** on triggers — coss's Menu/Select convention, not Base UI's own demo styling.
- **`align="start"` default** on `NavigationMenuPopup` vs. Base UI's `"center"` default.
- Content/Popup animation values (`--duration: 0.35s`, `cubic-bezier(0.22, 1, 0.36, 1)`, the inline-submenu slide/blur classes) are kept **verbatim** from Base UI's reference — these are not divergences, don't "simplify" them.

## Useful particle references

None — coss has no navigation-menu particles. For composition patterns, cross-reference `p-menu-1` (trigger/content/hover-intent shape) and Base UI's own demos (`hero`, `nested`, `nested-inline` — the only three that exist in their repo).
