# AnimatedIcon

## When to use

- Any icon that swaps for a different one based on state: a copy button flipping from a copy glyph to a checkmark, a toast's icon changing with its type (loading → success/error), a checkbox's check/minus swap between checked and indeterminate.
- Not for icons that only appear/disappear (show/hide) with no second icon replacing them — that's a plain conditional render or a simple opacity transition, not a swap.

**Not a coss primitive.** coss ui ships no icon-transition utility. This is a small project-original component (`src/components/ui/animated-icon.tsx`) built on `motion/react`, following the exact recipe from the `make-interfaces-feel-better` skill (opacity 0→1, scale 0.25→1, blur 4px→0px, spring with `bounce: 0`).

## Install

No registry entry. Copy `src/components/ui/animated-icon.tsx` directly — it has no dependencies beyond `motion` (already a project dependency since `plans/001`).

## Canonical imports

```tsx
import { AnimatedIcon } from "@/components/ui/animated-icon"
```

## Minimal pattern

```tsx
<button onClick={handleCopy}>
  <AnimatedIcon transitionKey={copied ? "check" : "copy"}>
    {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
  </AnimatedIcon>
</button>
```

`transitionKey` is what `AnimatePresence` keys the swap on — change it whenever the icon should change, and it drives the exit/enter transition automatically. It doesn't need to match the rendered icon's name exactly, just be a stable, distinct value per visual state (`"checked"` / `"indeterminate"`, `toast.type`, etc.).

## Common pitfalls

- **Must use `m`, not `motion`.** The root `LazyMotion` provider in `src/routes/__root.tsx` runs in `strict` mode — using the full `motion` component anywhere (including inside a new consumer of `AnimatedIcon`, if one wraps its children in a raw `motion.div`) throws at runtime. `AnimatedIcon` itself already uses `m.span` internally; this only matters if you're extending or forking the component.
- **`transition-[transform,...]` doesn't animate a Motion `scale` prop.** This bit a real edit this session: Motion's own JS-driven scale animation and Tailwind v4's `scale-*` utility both ultimately animate the standalone CSS `scale` property, not `transform`. If you're combining `AnimatedIcon` with a CSS-transitioned parent, make sure any relevant `transition-[...]` list on that parent includes `scale`, not `transform`, if it needs to interpolate a scale change.
- **Reduced motion.** `AnimatedIcon` calls `useReducedMotion()` and drops to an opacity-only cross-fade (no scale, no blur) when the user has `prefers-reduced-motion` enabled — this is handled inside the component, not something a consumer needs to opt into separately.
- **`mode="popLayout"` + `initial={false}`** are load-bearing, not defaults to casually remove: `popLayout` removes the exiting icon from layout flow immediately so the entering one doesn't wait on it, and `initial={false}` prevents an unwanted enter animation the very first time the component mounts.

## Verified behavior

Rapid re-triggering (toggling the `transitionKey` faster than the 300ms spring duration, e.g. spamming a checkbox between checked/indeterminate) was tested directly against the real DOM — no stuck/duplicate nodes, no console errors, clean settle to the final state every time. `AnimatePresence`'s own interruption handling covers this; no extra debouncing or cancellation logic was needed.
