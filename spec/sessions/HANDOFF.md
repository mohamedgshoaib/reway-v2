# Handoff

## Purpose

- Continue the dashboard UI-only mock while Session 04 remains open.

## Current state

- Phase 0 is complete in `src/dev/dashboard-ui/dashboard-destination.ts`.
- Phase 1 is complete in the selection modules and bookmark views.
- Selection starts from each bookmark menu. Normal mode has no checkbox or panel
  Select button.
- The full bookmark surface opens the bookmark in normal mode. Selection mode
  uses the full item as the checkbox label and blocks Shift-click text selection.
- Desktop uses one evenly spaced selection bar. Mobile uses one bottom Actions
  button and an accessible action sheet.
- Bulk Add, Move, Remove, and Delete use optimistic mock updates, rollback, retry,
  focus return, and stable result messages.
- `src/dev/dashboard-ui/page.tsx` is a small shell. State and event handling live
  in `src/dev/dashboard-ui/dashboard-ui-controller.ts`.

## Verified

- Twelve focused selection tests passed.
- `pnpm run check`, the production build, and `git diff --check` passed.
- Changed-scope React Doctor passed at 100/100.
- The user waived full Vitest for Phase 1. Browser checks were not run.

## Next

1. Follow the `AGENTS.md` start sequence and read this handoff.
2. Start Phase 2 tag filtering.

## Scope

- Keep work local and deterministic.
- Do not add backend, Supabase, authentication, or extension work.
- Do not use browser or Playwright tools without explicit permission.

## References

- `spec/dashboard-ui/implementation-order.md`
- `spec/integrations/features/feature-contract.md`
- `spec/sessions/session-04.md`
- `src/dev/dashboard-ui/dashboard-ui-controller.ts`
- `src/dev/dashboard-ui/bookmark-selection.ts`

## Open questions

- None.
