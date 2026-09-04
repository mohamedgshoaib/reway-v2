# Handoff

## Purpose

- Continue the dashboard UI-only mock while Session 04 remains open.

## Current state

- Phase 0 is complete in `src/dev/dashboard-ui/dashboard-destination.ts`.
- Phase 1 is complete in the selection modules and bookmark views.
- Phase 2 is complete in the destination, sidebar, and active-filter modules.
- Phase 3 is complete in the shared destination and navigation modules.
- Phase 4 is complete in the Trash model, bookmark views, action modules,
  selection controls, command search, and navigation.
- Tag filters use OR behavior. Active rows, removable filter controls, Clear,
  final-tag fallback, deletion fallback, and selection reset share one state.
- Mobile tag toggles keep the drawer open. A compact Show action appears only
  while tags are active, closes the drawer, and returns focus to the navigation
  trigger.
- Active filter controls stay 28 pixels tall while the shared Badge provides a
  44 by 44 pixel touch target without overlap.
- Uncollected is a working desktop and mobile system destination. It uses system
  sorts, has no reorder or Remove action, and receives collection removals.
- Trash uses fixed recovery dates and shows each bookmark's prior collection
  context and 30-day recovery window in list, compact grid, and image-grid
  views.
- Restore returns a bookmark to every prior collection that still exists. It
  returns as Uncollected when none remain. Delete forever uses a serious
  confirmation and cannot be undone.
- Trash item and bulk actions replace normal library actions. Bulk results share
  the existing pending, rollback, preserved-selection, Retry, and summary flow.
- Bookmark deletion and bulk deletion show a four-second Undo toast. Undo
  restores the prior collection memberships without reopening selection mode.
- Collection deletion, tag deletion, restore, and Delete forever show one named
  four-second result toast. Rapid results for the same item replace that toast.
- Toast timers pause on hover, keyboard focus, and while the window or tab is
  inactive. The timer follows the toast's lower radius.
- Global toasts sit at the bottom right on desktop and bottom center on mobile,
  above the device safe area.
- Successful single and bulk Undo play one restrained Undo cue after the
  bookmark state is restored.
- The navigation footer uses Display, Trash, then Settings. Display keeps its
  sliders icon and adds a trailing Up/Down caret. On fine pointers, the caret
  appears on hover, while the menu is open, or for visible keyboard focus.
- Sidebar row paint and trailing actions follow hover, open-popup, and visible
  keyboard-focus state. Closing an overlay no longer leaves pointer-focus paint.
- The density-specific overflow sizing experiment was removed. Sidebar row
  actions and bookmark overflow actions use their prior shared sizes, with hit
  areas kept separate from visible control size.
- All overflow menus use one shared 16-pixel ellipsis icon. Parent and child
  collection rows share a 32-pixel height, and sidebar actions center without
  row-specific offsets.
- The mock now has four tags: Engineering, Design, Product, and Research.
  Bookmark memberships from removed tags map to those four.
- Child collection icons keep their chosen palette color in light and dark
  themes. Nested rows no longer replace that color with sidebar foreground.
- The collapsed desktop rail hides collection and tag menus, create buttons,
  and carets. It treats both groups as open without changing their saved state.
- `src/dev/dashboard-ui/page.tsx` is a small shell. State and event handling live
  in `src/dev/dashboard-ui/dashboard-ui-controller.ts`.

## Verified

- `pnpm run check` and the production build passed after the icon-color and
  collapsed-control fixes, before the final derived-open rule.
- The focused deletion, restore, toast, and navigation runs passed. The latest
  focused slice passed 43 tests across 5 files.
- The last fully green Vitest run passed with 148 tests across 32 files using
  four workers. A later full run passed 147 tests and found one stale tag-count
  assertion after the mock-data reduction. The corrected focused file passed
  9 tests; the full suite was not rerun.
- The client and server production build and `git diff --check` passed.
- Changed-scope React Doctor passed at 100/100 across 28 files before the final
  derived-open rule.
- The user asked not to test or verify the final collapsed-rail open rule.
- Browser, touch, keyboard, screen-reader, and rendered checks were not run.

## Next

1. Follow the `AGENTS.md` start sequence and read this handoff.
2. Continue Phase 5 with create and edit feedback, edit Undo, pending states,
   rollback, and Retry.

## Scope

- Keep work local and deterministic.
- Do not add backend, Supabase, authentication, or extension work.
- Do not use browser or Playwright tools without explicit permission.

## References

- `spec/dashboard-ui/implementation-order.md`
- `spec/integrations/features/feature-contract.md`
- `spec/sessions/session-04.md`
- `src/dev/dashboard-ui/dashboard-ui-controller.ts`
- `src/dev/dashboard-ui/dashboard-destination.ts`
- `src/dev/dashboard-ui/bookmark-trash.ts`
- `src/dev/dashboard-ui/bookmark-trash-actions.tsx`
- `src/dev/dashboard-ui/sidebar.tsx`

## Open questions

- None.
