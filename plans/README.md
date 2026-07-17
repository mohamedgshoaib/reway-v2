# Animation plans

| #   | Title                                                                                   | Severity   | Status |
| --- | --------------------------------------------------------------------------------------- | ---------- | ------ |
| 001 | [Sidebar collapse easing and label fade](001-sidebar-collapse-easing-and-label-fade.md) | LOW/MEDIUM | DONE   |

## Execution order

001 has no dependencies. Originally scoped as a pure-CSS polish pass; executed with `motion` (lazy-loaded via `LazyMotion`) added as a new dependency for the label fade specifically — see the plan for what changed from the original draft.

## Deferred, not planned

**Sidebar `clip-path` rewrite** (replace `sidebar-container`'s `width` animation with a fixed-width box + animated `clip-path: inset()` reveal, eliminating the layout-recalculation cost of the collapse entirely, not just its visible symptom).

Not written as a plan because leverage (impact ÷ effort) is currently poor:

- **Impact**: theoretical. Frame-sampling the existing demo (short list, modern browser) showed no dropped frames. The collapse toggle isn't a high-frequency action. The bug this was originally investigating (label text reflowing into broken multi-line text during collapse) is already fixed at its actual root cause — a missing `<span>` wrapper on the label, not the width animation itself.
- **Effort**: high. `Sidebar` is a shared primitive; the rewrite has to correctly handle every combination of `collapsible` (`offcanvas`/`icon`/`none`) × `variant` (`sidebar`/`floating`/`inset`) × `side` (`left`/`right`) × the mobile `Sheet` fallback, plus `pointer-events` correctness on the clipped-but-still-full-width region during the transition.
- **Divergence cost**: confirmed (byte-diffed against the live upstream registry source) that our installed `sidebar.tsx` is unmodified coss code — only formatting, import aliasing, and an established icon-library swap differ. A `clip-path` rewrite becomes a permanent local fork that a future `npx shadcn@latest add @coss/sidebar` reinstall would silently wipe out, same class of risk already documented for the drawer `--inset` fix.

Revisit if: the sidebar ships in the actual dashboard with a materially longer nav list, and someone observes real dropped frames (DevTools Performance panel, not assumption) during collapse/expand.

Note: `motion` is now a project dependency (added for plan 001). If this is revisited, `motion`'s `layout` animations (the `domMax` feature bundle, not the `domAnimation` bundle already loaded for 001) use the FLIP technique to animate layout/size changes via `transform` under the hood — a lower-effort path to the same GPU-composited goal than hand-rolling `clip-path`, worth evaluating first.
