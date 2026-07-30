## Session 02

Write facts only. No plans, no advice, no narration.

**Filename:** `session-02.md`
**Session Status:** Open

---

## Status at Start

- **Sprint goal:** Prepare for the dashboard build; decide auth-vs-UI sequencing and lock the shell's foundational layout decisions before writing any dashboard code.
- **Last blocker:** None
- **Feature state:** No dashboard or auth code exists. `feature-contract.md` fully specs auth and library behavior; `design-language.md` leaves container width, boundary-plane ownership, and the line-nav role unresolved.

---

## Completed

- Slice 1: bare two-panel skeleton at the 896px hypothesis (`src/routes/dashboard-ui.tsx`, `src/dev/dashboard-ui/page.tsx`), sidebar flush on page background, main as a bordered card.
- Restored `.web-kits/*` (git-tracked but deleted from disk), which was 500-erroring every route including `/` and `/ui`.
- Fixed `--background`/`--card` both being pure white in light mode (`src/styles.css`); `--background` is now `--color-neutral-50` for real elevation.
- Slice 2: favicon + title rows grouped by recency (`bookmark-list.tsx`, `mock-bookmarks.ts`), matching the Recollect reference.
- Slice 3: sidebar nav — All bookmarks, Collections, Tags, Settings, Trash — and collapse behavior (`sidebar.tsx`), reusing the Sidebar primitive's inner pieces inside a plain `<aside>` instead of its fixed-positioned `Sidebar`/`SidebarInset`.
- Collapse trigger sits in the sidebar header next to the logo, visible only when expanded, fading with the same asymmetric timing as `SidebarMenuBadge`.
- Slice 4: bookmark-area controls bar (`controls-bar.tsx`) with a working Sort `ToggleGroup` (Date added / Most visited / Alphabetical) sharing one animated tooltip handle.
- Sort `ToggleGroup` uses `variant="default"` (not `outline`), with a "Sort" text label for legibility.
- Reverted a `ToggleGroup` gap-dead-zone fix attempt (`toggle-group.tsx`) — didn't work; dead zone accepted as a known, unfixed gap.
- Reverted a `-mt-4` alignment hack and a "trigger lives permanently in the controls bar" restructuring — both explicitly rejected.
- Fixed the sidebar/controls-bar trigger misalignment for real: `<main>`'s padding `p-6`→`p-2`, matching `SidebarHeader`'s own `p-2` exactly.
- Fixed a related sizing bug in the same pass: Sort `ToggleGroup` `size="sm"`→`size="default"` so it renders at 32px, matching `SidebarTrigger`.
- Locked the shell container width at 896px, confirmed against the working shell rather than left as slice 1's guess.
- Slice 5: View mode (List / Grid / Grid with images) via a second `ToggleGroup`; extracted `BookmarkFavicon` into its own file for reuse; added `ogImage`/`ViewMode` to mock data with two deliberate `null` cases.
- Built the search/add command surface (`command.tsx`): sidebar "Search" row opening a `CommandDialog` on click or `Cmd/Ctrl+K`, searching bookmarks and collections; moved `collections` into `mock-bookmarks.ts` as `mockCollections`.
- Fixed the shell not filling the viewport: outer wrapper is `h-svh` with `min-h-0` at every level (`SidebarProvider`, `<main>`, `<aside>`), so bookmark content is the one scroll region and the page itself never scrolls.
- Fixed a real upstream bug in `src/components/ui/autocomplete.tsx`: `AutocompleteItem` had no `gap-*`, unlike sibling primitives (`MenuItem`, `SelectItem`, `ComboboxItem`), so every `CommandItem` icon sat flush against its label.
- Made Collections and Tags actually collapsible (`Collapsible`/`CollapsibleTrigger`/`CollapsiblePanel`, `defaultOpen`) — the original sketch called for this but slice 3 built them static.
- Fixed a `CollapsibleTrigger` native-`<button>` requirement by nesting `SidebarGroupLabel`'s `render` prop with an inner `<button aria-label>`.
- Expanded mock data for real density: `mockCollections` 3→10, `tags` 3→10, `mockBookmarks` 10→20.
- Swapped the bookmark area's native scrollbar for the coss `ScrollArea` component, matching `SidebarContent`'s exact pattern.
- Added `p-2` inside the bookmark `ScrollArea` (matching `SidebarGroup`'s own `p-2`) so content isn't flush against the viewport edge.
- Enabled `scrollbarGutter` on both `ScrollArea` instances (`sidebar.tsx`'s `SidebarContent`, and the bookmark area's) — fixed content leaking behind the scroll thumb in both panels.
- `pnpm run check` and `react-doctor --scope changed` (100/100) both clean; deslop pass found no AI-slop to remove.
- Rewrote the root `README.md` as an application/product README based on the current UI-only checkout, separating shipped UI foundation work from the specified but unimplemented backend, authentication, extension, and live bookmark scope.
- Validated `README.md` with `pnpm exec oxfmt --check README.md`, `git diff --check -- README.md`, local link and image target checks, and a stale-template scan.
- Updated `dashboard-ui` Phosphor icons and weights across controls, sidebar navigation, collection rows, search, and bookmark menus; requested icons are duotone except the regular open-in-new-tab and selection icons.
- Verified the icon change with focused oxfmt, oxlint, and TypeScript checks; old requested icon names are absent from `src/dev/dashboard-ui`.

---

## Decisions

- Dashboard build order: wireframe the UI shell first (disposable, no backend), then implement Supabase auth.
- Shell build proceeds in three slow passes: skeleton → bookmark area → sidebar. No command surface or full view-mode set this pass.
- Shell wireframe lives at a new disposable route (`src/routes/dashboard-ui.tsx` + `src/dev/dashboard-ui/`), mirroring the `/ui` audit pattern; not built at the real `_dashboard` layout route.
- Slice 1 is the bare two-panel skeleton only: no bookmark content, no sidebar items, no collapse behavior.
- Trash is confirmed real V1 scope: soft delete, restore, 30-day auto-purge if unrestored. Not yet added to `feature-contract.md`; out of scope for the current UI-only build phase.
- Boundary-plane ownership resolved: sidebar is flush/borderless against the page background (uses plain `background`, not the dedicated `sidebar` token); the main bookmark area is the one elevated/bordered card (`card` + `border`).
- List and Grid are alternate view-mode states switched via the sort/filter/view control, never rendered simultaneously.
- Light stays the locked default theme; the dark reference used for shell inspiration informs layout/density only, not the default theme.
- Shell container width is locked at 896px, confirmed against the working shell (sidebar, controls bar, real mock content) per `design-language.md`'s own instruction to decide this from a working library, not a guess.
- Page composition confirmed bounded, not edge-to-edge: the Recollect reference's collapsed state shows the whole app (sidebar + main) as one floating panel with margin on all four sides, not a sidebar fixed to the true viewport edge. Sidebar reuses only the Sidebar primitive's inner content/context pieces, never its fixed-positioned `Sidebar`/`SidebarInset` wrapper.
- The sidebar collapse/expand trigger lives next to the logo in the sidebar header only while expanded (matches the reference); once collapsed it disappears from the sidebar (no room next to the logo on the icon-only rail) and belongs in the bookmark area's future controls bar instead, matching the reference's collapsed layout where the trigger sits next to the main content's top controls.
- `<main>`'s padding is `p-2` (8px, all sides), matching `SidebarHeader`'s `p-2` exactly — this is what actually levels the sidebar header and controls-bar rows, confirmed against the reference's own DOM (its sidebar header and main header row both sit the same distance from their shared top by construction). Note this also shrinks the bookmark list's own breathing room to 8px on all sides, not just the header row — accepted as-is per this fix; revisit if the list needs more room once real density is tested.
- The Sort `ToggleGroup` uses `size="default"` (not `size="sm"`), specifically so it renders at the same 32px as `SidebarTrigger` at the `sm:` breakpoint.

---

## Blockers

1. None

---

## Session End

- Session ended

---

## Do Not Include

- Brainstorming
- Implementation plans
- Transcript-style recap
- Repo-wide rules already covered in `AGENTS.md` or `CLAUDE.md`
- Motivational or steering language
