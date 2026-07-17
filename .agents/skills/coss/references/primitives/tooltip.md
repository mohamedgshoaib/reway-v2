# coss Tooltip

## When to use

- Short helper text on hover/focus for controls and icons.
- Non-blocking contextual hints without modal behavior.

## When NOT to use

- If the content is interactive (links, buttons) -> use Popover instead.
- If the content is rich (images, forms) -> use PreviewCard or Popover instead.
- If the hint should persist until dismissed -> use Popover instead.

## Install

```bash
npx shadcn@latest add @coss/tooltip
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
```

## Minimal pattern

```tsx
<Tooltip>
  <TooltipTrigger render={<Button variant="outline" />}>
    Hover me
  </TooltipTrigger>
  <TooltipPopup>Helpful hint</TooltipPopup>
</Tooltip>
```

## Patterns from coss particles

- **Portal forwarding**: optional `portalProps` on `TooltipPopup` → Base UI `Tooltip.Portal` (`keepMounted`, `container`, …). See [portal-props.md](../portal-props.md).

### Key patterns

Tooltip on an icon-only button:

```tsx
<Tooltip>
  <TooltipTrigger render={<Button size="icon" variant="ghost" aria-label="Settings" />}>
    <SettingsIcon aria-hidden="true" />
  </TooltipTrigger>
  <TooltipPopup>Settings</TooltipPopup>
</Tooltip>
```

Grouped tooltips (shared delay/provider, independent popups):

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Item 1</TooltipTrigger>
    <TooltipPopup>Hint 1</TooltipPopup>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger>Item 2</TooltipTrigger>
    <TooltipPopup>Hint 2</TooltipPopup>
  </Tooltip>
</TooltipProvider>
```

Animated tooltips (one popup, detached triggers sharing a `handle` — coss's `p-tooltip-3`):

```tsx
const formatTooltipHandle = TooltipCreateHandle<string>()

function Toolbar() {
  return (
    <TooltipProvider>
      <ToggleGroup defaultValue={["bold"]} multiple>
        <TooltipTrigger
          handle={formatTooltipHandle}
          payload="Make text bold"
          render={<ToggleGroupItem aria-label="Toggle bold" value="bold" />}
        >
          <TextBolderIcon />
        </TooltipTrigger>
        {/* more triggers, same handle, different payload */}
      </ToggleGroup>

      <Tooltip handle={formatTooltipHandle}>
        {({ payload }) => <TooltipPopup>{payload}</TooltipPopup>}
      </Tooltip>
    </TooltipProvider>
  )
}
```

This is a different composition from grouped/independent tooltips above: **one** `Tooltip` renders the popup for **all** the detached `TooltipTrigger`s, which pass `handle` + `payload` instead of owning their own `TooltipPopup`. The `TooltipPopup`'s `Viewport` renders Base UI's `data-current`/`data-previous` cross-fade + directional slide as the active trigger changes — that's the whole "animated tooltip" effect, and it lives entirely in the shared component (see Local divergences below); this pattern adds no animation classes of its own.

### More examples

See `p-tooltip-1` through `p-tooltip-3` for basic, grouped, and animated tooltip patterns.

## Common pitfalls

- Placing interactive controls inside tooltip content (tooltip should stay informational).
- Relying on tooltip as sole label for icon-only controls (still provide accessible name).
- Using tooltip for long-form content that should be popover/dialog.
- Assuming a switch between detached triggers always slides. It only does when the tooltip stays *continuously open* across the switch (Base UI treats it as one content morph). Leave one trigger and land on another within the `TooltipProvider`'s `timeout` (400ms default) and Base UI's `FloatingDelayGroup` opens the next one **instantly** (`data-instant`, no animation at all) instead of sliding; wait past that window and it's a fresh open, which only fades (no `data-previous`, no direction). This is inherent to Base UI's continuity/timeout model, not a bug — don't try to force every switch into a slide by tuning `closeDelay`/adding hover bridges between triggers; it doesn't produce a materially different feel and fights the primitive's own design.
- Assuming word count decides slide vs. fade. It doesn't — see above. Longer labels just make the popup's width morph (which runs on every switch) more visually obvious, which can look like a different decision when it isn't.

## Local divergences from upstream (survive a re-install!)

`tooltip.tsx` was verified byte-for-byte identical to coss's registry source before these changes — the gap was upstream, not local. coss ships `TooltipPopup` without the timing/selectors Base UI's own "Animating the Tooltip" reference relies on, so the shared-`handle` animated pattern silently doesn't animate correctly as shipped:

- **Positioner/Popup transitions gained explicit `duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]`.** coss ships the transition property list with no timing, which falls back to Tailwind's default ~150ms/`ease` instead of Base UI's intended 0.35s glide.
- **Viewport content-slide rewritten from a `**:` Tailwind variant chain to Base UI's `[&_[data-current][data-starting-style]]` arbitrary-selector form.** The `**:data-current:data-starting-style:` compound-variant chain (stacking a `data-[activation-direction~=...]:` selector on top) silently fails to compile for these compound direction+starting-style rules — confirmed by reading the emitted `translate` computed style during a real transition: it stayed `0px` for the entire switch with the variant-chain version, and correctly animated `50% → 0px` after switching to the arbitrary-selector form. Without this, the popup's width still morphs between triggers but the content doesn't slide to mask it, so text reveals word-by-word as the box grows — a real, easy-to-miss defect, not a demo issue. If a future edit touches this Viewport className, keep the `[&_[data-current]]`/`[&_[data-previous]]` form; don't "simplify" it back to a `**:` chain.
- **No `TooltipArrow` export.** Base UI's reference includes one, but it doesn't compose with this project's `TooltipPopup`: `children` render inside the `Viewport`, so an arrow placed there gets caught in the content-transition wrapper instead of sitting at the popup edge. Not implemented; would need the Popup restructured (arrow as a `Viewport` sibling, not a child) before it could work.

## Useful particle references

- grouped tooltips: `p-tooltip-2`
- animated tooltips: `p-tooltip-3`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
