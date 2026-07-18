# 004 — Primitive smoke tests and CI

- **Status**: DONE
- **Severity**: LOW (no known bug this fixes — this is coverage, not a defect)
- **Category**: Testing, CI
- **Estimated scope**: ~4-6 new test files under `src/components/ui/__tests__/` (or colocated `*.test.tsx`, match whichever convention `vitest.config` already expects), plus `.github/workflows/ci.yml`

## Problem

Vitest is configured (`test` script exists: `vitest run`) and listed as a project tool, but zero test files exist anywhere in `src`. CI (`ci.yml`) correctly does not run `pnpm run test` — Vitest exits non-zero with no test files found, so adding it today would just break the pipeline for no reason.

coss ui is installed as a shadcn-style registry (`components.json`: `"@coss": "https://coss.com/ui/r/{name}.json"`), not an npm dependency — once a component is copied in via the registry CLI, it's first-party code with no upstream test suite riding along. This project has since modified several primitives substantially (sound wiring, `AnimatedIcon` integration, the drawer `--inset` fix, a fully custom `navigation-menu.tsx` coss doesn't even ship, scale-on-press, checkbox indeterminate icon-swap). None of that has ever been verified by anyone but manual/visual checks this session.

## Proposed fix

A minimal smoke suite, not exhaustive coverage of all 57 primitives — proportionate to which primitives carry real logic versus which are pure style wrappers with nothing to assert beyond "it renders."

Priority order (highest-value first):

1. **`Checkbox`** — checked/unchecked/indeterminate states render the right indicator content, `onCheckedChange` fires with the right value, indeterminate takes priority over checked visually.
2. **`AnimatedIcon`** — renders its child, swaps content when `transitionKey` changes, and (folding in plan 002 item 7's rapid-retrigger check) doesn't throw or leave stale nodes mounted when `transitionKey` changes faster than the animation's own duration.
3. **`Toggle`/`ToggleGroup`** — pressed state toggles correctly, `ToggleGroup`'s single vs. `multiple` selection modes behave as documented.
4. **`Combobox`** — basic filter-by-input narrows the visible option list correctly.

## Boundaries

- Do NOT attempt full coverage of all 57 primitives in this pass — most are style-only wrappers around Base UI with no logic of this project's own to test; Base UI's own test suite already covers its primitive behavior.
- Do NOT add `pnpm run test` to `ci.yml` until this suite exists and passes locally — sequencing matters here specifically because CI currently and correctly omits it.

## What was actually built

All four priority items built as planned, plus the infrastructure the plan assumed already existed but didn't: no `vitest.config.ts` or test-environment setup file existed anywhere in the repo before this pass, since zero test files existed to need one.

- **`vitest.config.ts`** — a standalone config, deliberately separate from `vite.config.ts` rather than adding a `test` block to it. The app's `vite.config.ts` carries `tanstackStart()` and `devtools()`, both meant for the real app's SSR/router graph; component-only unit tests have no reason to load either, so a separate config (`resolve: { tsconfigPaths: true }` + `viteReact()` + `test: { environment: "jsdom", setupFiles }`) keeps the two concerns from interacting. `resolve.tsconfigPaths` is a native Vite 8 option (confirmed in `vite`'s own `dist/node/index.d.ts`), not a plugin — same mechanism the main config already relies on for `@/*` imports.
- **`src/test-setup.ts`** — mocks `window.matchMedia` to always report `matches: true` (i.e. `prefers-reduced-motion: reduce`). jsdom implements neither `matchMedia` nor the Web Audio API. Checking the actual `@web-kits/audio` `useSound` source (`dist/react.js`) showed its returned callback exits early — before ever touching `AudioContext` — when reduced motion is on. Reporting reduced-motion unconditionally sidesteps needing to fake an entire Web Audio graph just to smoke-test component logic, at the cost of these tests never exercising the non-reduced-motion animation path — an accepted trade since that path is already verified live in the browser (`plans/002-component-consistency-pass.md`). `AnimatedIcon`'s own `useReducedMotion()` reads the same mock, so its animated variants collapse to the opacity-only fallback during tests too.
- **`Checkbox`** (`src/components/ui/checkbox.test.tsx`) — checked/unchecked/indeterminate render the right state, `onCheckedChange` fires with the right value on click. The indeterminate-priority assertion was corrected after reading Base UI's actual source (`checkbox/utils/useStateAttributesMapping.js`): when indeterminate is true, Base UI omits `data-checked` entirely (not "sets both") — `aria-checked="mixed"` plus `data-indeterminate` are the only signals, so the test asserts against those, not against which icon glyph rendered (an SVG-internals assertion would have been fragile and was avoided).
- **`AnimatedIcon`** (`src/components/ui/animated-icon.test.tsx`) — renders its child, swaps content on `transitionKey` change (via `vi.waitFor`), and folds in plan 002 item 7's rapid-retrigger check: 8 synchronous rerenders faster than the 300ms spring, then asserts exactly one `span` remains and `console.error` was never called. Passed on the first real run.
- **`Toggle`/`ToggleGroup`** (`src/components/ui/toggle.test.tsx`) — standalone `Toggle` press/release fires `onPressedChange` and flips `data-pressed`/`aria-pressed`; `ToggleGroup` single-select mode (pressing a new item deselects the old one, pressing the active item clears it) and `multiple` mode (accumulates and removes independently) verified against Base UI's actual `setGroupValue` logic (`toggle-group/ToggleGroup.js`).
- **`Combobox`** (`src/components/ui/combobox.test.tsx`) — filters a static `items` list as the input value changes. Uses the `inline` root prop to skip Popup/Portal/Positioner entirely — confirmed via Base UI's own source (`combobox/root/AriaCombobox.js`, the `filter` memo defaults to `createCollatorItemFilter` whenever `filter` is omitted) and their own test suite's recipe (`ComboboxRoot.test.tsx`, fetched via ctx7) that `inline` is the correct minimal harness for testing filtering logic without floating-ui positioning in the loop.

Test files are colocated as `*.test.tsx` next to their component (no prior convention existed; colocation was chosen for discoverability over a separate `__tests__/` directory).

## Verification performed

- `pnpm run test` — 4 files, 12 tests, all passing, both individually and as a full suite run.
- `pnpm run check` clean (lint, format, typecheck) after running `pnpm run format` once to auto-fix formatting on the new test files.
- `pnpm run test` added as a step in `.github/workflows/ci.yml`, between `check` and `build`. Not yet confirmed against a real CI run (PR/push) — that will happen naturally on this change's own PR.
