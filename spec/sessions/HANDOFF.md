# Handoff

## Purpose

- Continue the dashboard UI-only mock from Phase 7 while Session 05 remains open.

## Current state

- Dashboard UI phases 0 through 6 are complete.
- Settings opens as a responsive modal and preserves the active library
  destination. Desktop uses persistent left page navigation. Mobile uses a page
  list and drill-in view with Back. Neither layout uses tab semantics.
- The profile and onboarding flows cover email and Google defaults, generated
  and uploaded avatars, validation, source restoration, failure, and Retry.
- Account deletion uses two confirmations, exact typed `delete`, pending locks,
  failure recovery, and a persistent mock result.
- Visible Demo controls are temporary mock tools. Real authentication and
  profile data will replace their fixture adapter and remove the controls.
- Each active Settings page has one labeled region. Mobile drill-in moves focus
  to that region, and Back returns focus to the selected page button.
- Appearance marks and fixture radios keep their compact visual size. Their
  coarse-pointer targets expand without overlapping nearby controls.
- Session 04 ended after Phase 5; Session 05 is open.

## Verified

- The final Phase 5 and 6 risk-based run passed 45 tests across six relevant
  suites. It covers settings focus, dirty Demo reset, stale same-item mutation
  failure, and coarse-pointer target geometry.
- `pnpm run check`, the client and server production build, `git diff --check`,
  and changed-scope React Doctor at 91/100 with no findings across 14 files
  passed after the final hardening pass.
- Browser, touch, keyboard, screen-reader, and rendered checks were not run.

## Next

1. Run the required new-feature grilling pass for Phase 7.
2. Confirm the X archive import fixtures and review-state entry points from the
   feature contract.
3. Implement the import UI without parser, backend, or extension work.

## Scope

- Phase 6 is complete. Phase 7 covers the dashboard X archive import UI.
- Keep archive parsing, backend upload, Supabase, and extension scroll capture
  out of scope.
- Do not use browser or Playwright tools without explicit permission.

## Suggested skills

- `grilling` before Phase 7 code because it is a new feature.
- `codebase-design` for the import-state and fixture boundary.
- `interface-design` for the review, progress, completion, and error hierarchy.
- `coss` for file selection, dialogs, status, and progress composition.
- `no-use-effect` and `vercel-react-best-practices` for the React implementation.
- `vitest` for the risky fixture, upload, onboarding, and deletion behavior.
- `react-doctor` after the React implementation.
- `unslop` for interface and spec text.

## Established workflow

- Follow `AGENTS.md` and load skills just before the work that needs them.
- Use focused tests for important behavior, then run lint, formatting, type
  checks, the production build, and diff hygiene.
- Keep all mock outcomes deterministic and do not imply that local actions
  changed a real account or session.

## References

- `spec/dashboard-ui/implementation-order.md`
- `spec/integrations/features/feature-contract.md`
- `spec/sessions/session-05.md`
- `src/dev/dashboard-ui/dashboard-ui-controller.ts`
- `src/dev/dashboard-ui/command.tsx`
- `src/dev/dashboard-ui/collection-hierarchy.ts`

## Open questions

- None.
