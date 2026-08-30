# Dashboard UI interface review

Date: 2026-08-30
Scope: `/dashboard-ui`, `/ui`, and the shared components they use
Method: `better-interface` with applicable `interface-cheatsheet` rules
Initial verdict: Block
Implementation status: All findings handled

## Findings

| ID | Severity | Area | Finding | Status |
| --- | --- | --- | --- | --- |
| BI-01 | High | Color and accessibility | Bookmark selection uses background color as its only persistent cue and does not expose the state to assistive technology. | Handled |
| BI-02 | High | Accessibility | Shared CSS motion has no complete `prefers-reduced-motion` fallback. | Handled |
| BI-03 | High | Accessibility | Several `/ui` form examples rely on placeholders instead of programmatic labels. | Handled |
| BI-04 | High | Writing and forms | Saving a blank bookmark title closes the dialog without saving or explaining the error. | Handled |
| BI-05 | Medium | Accessibility | Repeated navigation appears before main content with no skip link. | Handled |
| BI-06 | Medium | Layout | `/dashboard-ui` has no page heading or persistent current-view title. | Handled |
| BI-07 | Medium | Writing | Empty All Bookmarks renders a blank content area instead of an empty state with a next action. | Handled |
| BI-08 | Medium | Writing | `/ui` examples introduce AI and team features that conflict with Reway's product scope. | Handled |
| BI-09 | Medium | UI polish | Theme changes do not suppress transitions, and shared components use `transition-all`. | Handled |
| BI-10 | Low | Accessibility | Nested frame examples use `h2` below the audit section's `h2`. | Handled |
| BI-11 | Low | Writing | Destructive confirmation buttons use the generic label `Delete`. | Handled |
| BI-12 | Low | Typography | Some placeholders use three periods, and `SliderValue` lacks tabular numerals. | Handled |

## Initial verification

- `pnpm run check`: passed
- `pnpm test`: 20 files and 73 tests passed
- `pnpm run build`: passed for client and server
- `git diff --check`: passed
- Browser, keyboard, screen-reader, responsive, and rendered contrast checks: not run because browser use needs explicit permission in this workspace

## Resolution rule

Mark a finding handled only after its source change and focused checks pass. Keep browser-only behavior listed as not verified until the workspace permits a browser run.

## Resolution log

- BI-01: Added a visible selection icon, screen-reader text, and selected state in the actions button name. `bookmark-selection.test.tsx` passes in list and grid views.
- BI-02: Added the shared reduced-motion fallback to `src/styles.css`. The stylesheet passes Oxfmt.
- BI-03: Added programmatic names to the bare `/ui` form controls. TypeScript passes, and the changed files pass Oxfmt after formatting.
- BI-04: Added inline blank-title validation, error association, and focus recovery. `bookmark-actions.test.tsx` passes.
- BI-05: Added the shared `SkipLink` and focusable main targets to `/dashboard-ui` and `/ui`. TypeScript passes.
- BI-06: Added a dashboard `h1` for the active collection or All Bookmarks. It stays visible beside mobile navigation and becomes screen-reader-only on desktop, where the sidebar already shows the current view. `controls-bar.test.tsx` passes.
- BI-07: Added the All Bookmarks empty state with extension-based guidance. TypeScript passes.
- BI-08: Replaced unsupported AI, collaboration, full-page search, and highlight examples with current bookmark, collection, tag, and command-search copy. Oxfmt passes.
- BI-09: Replaced every `transition-all` under `src` with exact properties and suppressed transitions during theme changes. `theme-store.test.ts` and `navigation-menu.test.tsx` pass.
- BI-10: Changed the nested frame-panel headings from `h2` to `h3`. Oxfmt passes.
- BI-11: Changed destructive confirmation actions to `Delete bookmark`, `Delete collection`, or `Delete tag`. Oxfmt passes.
- BI-12: Replaced three-period placeholders with the ellipsis character and added tabular numerals to `SliderValue`. The source scan and Oxfmt pass.

## Final verification

- `pnpm run check`: passed
- `pnpm test`: 23 files and 78 tests passed
- `pnpm run build`: passed for client and server
- `git diff --check`: passed
- React Doctor changed-scope scan: 100/100, with no issues found
- Browser, keyboard, screen-reader, responsive, and rendered contrast checks: not run because browser use needs explicit permission in this workspace

## Follow-up fixes

- Unified collection, nested collection, and tag row hover and focus states with their menu actions. Moving to the menu button now keeps the row surface active.
- Kept the current-view heading visible on mobile but removed its extra desktop layout layer.
- Replaced the vague collection icon label with `Collection icon`.
- Made the collection color state initializer lazy.
- Replaced the repeated navigation index key with stable IDs.
- Moved static drawer values to module scope and extracted the repeated responsive profile fields.
- Split the forms and text audit into focused groups while keeping one section-level public component.
- React Doctor changed-scope scan: 100/100, with no issues found.
