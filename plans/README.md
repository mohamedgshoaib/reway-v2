# Plans

| #   | Title                                                                                   | Severity   | Status |
| --- | --------------------------------------------------------------------------------------- | ---------- | ------ |
| 001 | [Sidebar collapse easing and label fade](001-sidebar-collapse-easing-and-label-fade.md) | LOW/MEDIUM | DONE   |
| 002 | [Component consistency pass](002-component-consistency-pass.md)                         | LOW/MEDIUM | DONE   |
| 003 | [Research folder correction](003-research-folder-correction.md)                         | MEDIUM     | DONE   |
| 004 | [Primitive smoke tests and CI](004-primitive-smoke-tests-and-ci.md)                     | LOW        | DONE   |

Renamed from "Animation plans" — 002 also touches typography and documentation, 003 and 004 aren't animation work at all. Scope was never actually limited to animation; the old title just hadn't been revisited since there was only one plan.

## Execution order

001 has no dependencies (already done). 002, 003, and 004 are mutually independent — no plan blocks another. Suggested order is by cost/risk, cheapest and lowest-risk first: 003 (docs only, no code) → 002 (the bulk of the value, all UI code) → 004 (new test infrastructure, most effort).

## Deferred, not planned

**Sidebar `clip-path` rewrite** — see the "Deferred, not planned" note that used to live here; unchanged, still not worth doing (see git history for the original reasoning if needed, or ask — the reasoning was: no observed dropped frames, low toggle frequency, high effort to handle every `collapsible`×`variant`×`side` combination, and it would fork further from upstream coss `sidebar.tsx`). Revisit only if the sidebar ships with a materially longer nav list and someone observes real dropped frames.

**`table.tsx` `nth-child` row striping** — real, cheap, well-evidenced (Guri's uncommon-Tailwind-classes post), but no real data-dense table exists outside the `/ui` audit demo yet. Revisit once a real dashboard table view exists.

**Dev-only breakpoint indicator badge** — cheap, pairs naturally with keeping `/ui` around and the already-stripped `TanStackDevtools` panel. Not planned because it's pure nice-to-have with zero current pain point, not because it's a bad idea. Revisit if responsive-layout bugs actually start costing time to diagnose.

**`color-mix(in srgb, …)` vs `in oklch`/`in oklab`** (`styles.css`, 3 spots: `--card`, `--popover`, `--code`) — technically not what `jakub-krehel.md` claims about this project's color system, but the blends are 2–8% tints; the perceptual difference between srgb and oklch interpolation at that range is not worth a change on its own. Revisit only if it's ever touched for an unrelated reason.
