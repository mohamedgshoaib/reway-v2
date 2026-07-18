# 002 — Component consistency pass

- **Status**: DONE
- **Severity**: LOW (items 1–3, 8), MEDIUM (items 4–7)
- **Category**: Feedback, Accessibility, Typography, Staging, Documentation
- **Estimated scope**: ~14 files across `src/components/ui/*`, `.claude/skills/coss/references/primitives/*`

## Problem

Two sweeps of the component set (one focused on `make-interfaces-feel-better`/`emil-design-eng`, one on `interaction-craft`/`apple-design` plus the individual `spec/research/design-craft/*` sources) turned up eight distinct gaps, all in the same family: things fixed on _some_ primitives this session but not carried through consistently, plus documentation that never caught up. Approved in full by the user across both sweeps.

1. **`button.tsx`** — `transition-[scale,box-shadow]` doesn't include `background-color`, so every hover state (`hover:bg-primary/90`, `hover:bg-accent/50`, etc.) snaps instantly instead of fading.
2. **`checkbox.tsx`, `toggle.tsx`, `theme-toggle.tsx`** — no press-scale feedback, unlike `button.tsx` (fixed this session). `switch.tsx` is explicitly excluded — it already has a considered iOS-style thumb-stretch (`scale-x-110` on `:active`) that a blanket `scale-97` would conflict with, not complement.
3. **`animated-icon.tsx`** — zero `prefers-reduced-motion` handling anywhere in `src` (grep-confirmed). The scale/blur/spring swap should degrade to an opacity-only cross-fade for users who've opted out.
4. **`sheet.tsx`, `command.tsx`, `preview-card.tsx`, `frame.tsx`, `navigation-menu.tsx`** — Title/Description-shaped text still missing the `text-balance`/`text-pretty` pairing already applied to Card, CardFrame, Dialog, AlertDialog, Drawer, Alert.
5. **Sidebar label fade, drawer swipe, tabs indicator** — same `prefers-reduced-motion` gap as item 3, in the CSS-transition primitives rather than the Motion one.
6. **`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`** — backdrop and popup both use `duration-200` with no offset between them; per Raphael Salaja's "Staging" principle (independently corroborated by Rauno Freiberg's iOS Home Screen example), a backdrop should visibly lead the panel it's revealing, not animate in perfect lockstep.
7. **`animated-icon.tsx` rapid re-triggering** — not a known bug, an unverified assumption. Rauno Freiberg's robustness bar (cancel/retarget cleanly if a new update arrives faster than ~150–200ms) hasn't actually been checked against fast checkbox indeterminate↔checked toggling or a toast type flipping quickly.
8. **Documentation** — none of today's new conventions (scale-on-press formula, `AnimatedIcon` pattern, `text-balance`/`text-pretty` pairing rule, `antialiased`) are written down anywhere durable. Separately, `animated-icon` and `theme-toggle` are first-party primitives with no reference doc at all (confirmed: 55 of 57 installed primitives have one; these two don't).

## Proposed fix

1. `button.tsx`: `transition-[scale,box-shadow]` → `transition-[scale,background-color,box-shadow]`, same `duration-150 ease-out-strong`.
2. `checkbox.tsx`, `toggle.tsx`, `theme-toggle.tsx`: add `[:active,[data-pressed]]:scale-97` + `transition-[scale,box-shadow] duration-150 ease-out-strong`, matching `button.tsx`'s exact pattern. `theme-toggle.tsx`'s buttons aren't built on the `Toggle` primitive, so this is a direct class addition, not a shared-variant change.
3. `animated-icon.tsx`: wrap the scale/blur values in a reduced-motion check — likely `@media (prefers-reduced-motion: reduce)` collapsing `initial`/`animate`/`exit` to opacity-only, `scale: 1` and `filter: "blur(0px)"` held constant. Confirm whether Motion's own `useReducedMotion()` is cleaner than a raw media query given `m`/`LazyMotion` strict mode.
4. Add `text-balance` to the five Title-shaped exports, `text-pretty` to the five Description-shaped exports across the listed files, same as the six pairs already done.
5. Same reduced-motion treatment as item 3, applied to the CSS-transition versions: drop `translate`/`scale` under the media query, keep opacity.
6. Add a small `delay-[40ms]` (or similar, tune by eye) to the popup's transition in `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx` — backdrop starts immediately, panel follows just behind it. Keep both well under emil's 500ms modal ceiling combined.
7. Verify in-browser first (rapid-click a checkbox between checked/indeterminate, rapid-fire a toast type change) — only write a fix if something actually breaks (a stuck animation, a console error, a visual glitch). If `AnimatePresence`'s default behavior already handles it cleanly, this item closes with no code change, just a recorded verification.
8. Document scale-on-press, `AnimatedIcon`, text-wrap pairing, and `antialiased` as house conventions in the coss skill docs (wherever the existing per-primitive pitfall docs live), and write `animated-icon.md` + `theme-toggle.md` following the existing doc format.

## Boundaries

- Do NOT add scale-on-press to `switch.tsx` — see item 2.
- Do NOT touch `table.tsx` striping, the breakpoint-indicator idea, or the `color-mix` srgb/oklch nit — tracked in `plans/README.md`'s "Deferred, not planned" section, not this plan.
- Do NOT force a fix for item 7 if verification shows it already works — false positives waste effort a real gate is supposed to prevent.

## What was actually built (revised from the original draft)

Items 1, 2, 3, 4, 6, 7, 8 built as planned. Item 5 was revised after investigation, and item 4's file list was corrected against the real component shapes:

- **Item 4 scope correction**: `command.tsx` and `navigation-menu.tsx` don't actually have a Title/Description-shaped pair (Command only has a group label and an empty-state message; NavigationMenu has neither) — skipped rather than forced. `preview-card.tsx` has no separate Title/Description slots either, but its popup already carried `text-balance` on what's actually body-length content — corrected to `text-pretty` instead of adding a new pairing.
- **Item 5 scope correction**: investigated all three named targets before touching anything. Sidebar's label fade is already opacity-only (no fix needed — opacity/color transitions are explicitly fine to keep under reduced motion per `apple-design`). The tabs indicator is a small local translate, low vestibular-trigger risk. The drawer's `transform` is structurally load-bearing — it's how the component is positioned on/off screen and tracks live drag-swipe state, not decorative motion layered on top of an already-fixed position; stripping it under `prefers-reduced-motion` would risk breaking real functionality for uncertain accessibility benefit, and would require a much larger, deliberate rewrite to do safely. Skipped all three rather than force a fix with a bad cost/benefit ratio.

## Verification performed

- `pnpm run check` clean after every file (lint, format, typecheck).
- Live browser verification for every remaining item, via the same `/ui` audit page + playwright-cli workflow used earlier this session:
  - Item 1: `getComputedStyle(button).transitionProperty` confirmed `"scale, background-color, box-shadow"`.
  - Item 2: press-scale confirmed on Button, Toggle, Checkbox, and ThemeToggle — all interpolate cleanly toward `0.97` (sampled mid-press: `0.970266`–`0.970399`). One real methodology bug caught and fixed along the way: manual `mouse.move`/`mouse.down` coordinates don't auto-scroll like `locator.click()` does, so testing elements further down the very long audit page initially gave false "not working" readings until `scrollIntoViewIfNeeded()` was added — not a CSS bug.
  - Item 3: emulated `prefers-reduced-motion: reduce`, triggered a checkbox icon swap, sampled the animated span's computed `scale`/`filter`/`opacity` six times through the transition — `scale: none` and `filter: blur(0px)` held constant throughout, only `opacity` changed. Fallback confirmed working.
  - Item 6: confirmed via computed `transitionDelay` — backdrop `0s`, popup `0.075s` (the `delay-75` staging offset).
  - Item 7: rapid-toggled a checkbox 8 times at 80ms intervals (faster than the 300ms animation) — indicator span count alternated cleanly `1`/`0` with no stuck/duplicate nodes, no console errors. No code change needed, matching the plan's own instruction not to force a fix where verification shows none is needed.
