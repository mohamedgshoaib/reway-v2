## Session 05

Write facts only. No plans, no advice, no narration.

**Filename:** `session-05.md`
**Session Status:** Open

---

## Status at start

- **Sprint goal:** Build Phase 6 Settings, profile, onboarding, and account deletion as a complete local mock.
- **Last blocker:** None
- **Feature state:** Phase 5 is complete; Phase 6 behavior is locked and implementation has not started.

---

## Completed

- Completed the required Phase 6 grilling pass and a short settings-pattern review.
- Expanded the feature contract and implementation order with the locked Phase 6 Settings, profile, onboarding, Demo, and account-deletion behavior.
- Added a pure account model for profile defaults, Unicode username validation, avatar source restoration, file validation, and full-profile comparison.
- Added a local account state module with an injected mutation adapter, deterministic outcomes, preserved drafts, Retry, and fixture reset.
- Corrected the responsive Settings dialog after a broader product and source-pattern review. Desktop now uses persistent left page navigation; mobile uses a page list and drill-in view. Neither layout uses tab semantics.
- Added email and Google profile fixtures, generated and uploaded avatar states, local preview, correct avatar restoration, and mock-only Demo controls.
- Added the skippable profile-setup dialog and the two-step account-deletion flow with typed `delete`, pending dismissal locks, Retry, and persistent mock results.
- Removed duplicate settings page landmarks and kept one labeled region for each active page.
- Kept the appearance marks and fixture radios at their existing visual size while expanding their coarse-pointer targets without overlap.
- Added checks for mobile page focus, Back focus return, dirty Demo reset, stale same-item mutation failure, and coarse-pointer palette geometry.
- Added five account-model tests and ten Settings-flow tests. The final risk-based run passed 45 tests across six relevant suites.
- `pnpm run check`, the client and server production build, `git diff --check`, and changed-scope React Doctor at 91/100 with no findings across 14 files passed after the final hardening pass.
- Browser, touch, keyboard, screen-reader, and rendered checks remain unverified after Phase 6.
- Completed the required Phase 7 grilling pass and locked the dashboard X archive import flow before implementation.
- Corrected Phase 7 to cover the flat X archive flow only. Generic browser bookmark import, folder flattening, and imported collection-name conflicts remain later work.
- Added one Import page to Settings and one `Import from X` entry in the Collections section menu. Both routes open the same persistent flow.
- Added native `bookmark.js` and `bookmarks.js` selection with valid, empty, malformed, mixed-record, repeated-post, and existing-library duplicate review states.
- Added selected-by-default review rows, individual selection, Select all, Clear selection, preview fallback, and non-blocking preview failures.
- Added deterministic fast and slow import runs with separate initial and retry outcomes for full success, partial failure, and total failure.
- Added background continuation when Settings closes, per-post confirmed library updates, failed-only Retry, and navigation to the created or reused `X Bookmarks` collection.
- Kept the import logic behind a pure model and one React state module. The dashboard controller supplies the library commit, result toast, and destination callbacks.
- Added seven model tests, five state tests, and eight dashboard-flow tests. Phase 7 has 20 passing import tests, the final shared-state run passed 38 tests across five files, and the full run passed 192 tests across 38 files with four workers.
- `pnpm run check`, the client and server production build, and `git diff --check` passed. The build completed without a chunk-size warning after replacing the imported progress and checkbox-group modules with existing or native controls.
- Changed-scope React Doctor scored 82/100. Its three warnings point to unchanged profile form handlers and an unchanged management-state array chain; Phase 7 code produced no diagnostic.
- Browser, touch, keyboard, screen-reader, and rendered checks remain unverified after Phase 7.
- Reset demo restores the account, import, bookmark, collection, tag, destination, selection, sort, and view fixtures after an import.
- Completed the Phase 8 grilling and research pass without starting implementation.
- Reviewed the current X import state, Supabase Queues, Edge Function limits, resumable uploads, Realtime gaps, TanStack Start server boundaries, Linear sync recovery, Vercel queue semantics, and current Karakeep and Raindrop import behavior.
- Added `spec/integrations/supabase/phase-08-backend-plan.md` as the bottom-up implementation order for Supabase, core data, durable jobs, capture, enrichment, import, export, restore, Realtime, and mock replacement.
- Updated the project DNA and feature contract to replace direct per-bookmark enrichment webhooks with transactional durable queueing and batched consumers.
- Updated the dashboard implementation order so Phase 8 routes to the dedicated backend plan and keeps Phase 9 as the completion pass.
- Kept this checkpoint documentation-only. No Supabase package, schema, migration, client, backend code, environment value, or MCP mutation was added.
- Audited the full Phase 8 discussion against the backend plan and handoff before the next chat.
- Confirmed that Phase 8A has no unresolved product question and added an ordered grilling queue for choices that block Phase 8B or later.
- Completed Phase 8A without adding a schema, migration, generated database type, Supabase client, or feature backend code.
- Confirmed that the environment URL and publishable key match the one healthy project exposed by the Supabase MCP server. No environment value or project ID was recorded.
- Confirmed that remote migration history and the remote `public` schema are empty, then initialized the local CLI migration workflow under `supabase/`.
- Pinned `@supabase/supabase-js` 2.112.4, `@supabase/ssr` 0.12.5, and Supabase CLI 2.116.0. The repository's seven-day release guard rejected newer runtime releases.
- Added public and server-only environment checks with five passing tests. Errors report variable names without values.
- Verified the Supabase CLI, focused environment tests, TypeScript, lint, the client and server production build, and a client-output secret scan. The full run passed 197 tests across 39 files with four workers.
- Reserved `src/types/database.generated.ts` for generated types after the first reviewed schema.
- Began the Phase 8B decision pass without adding Supabase client or authentication code.
- Confirmed email verification before the first email and password sign-in and Google OAuth as part of production sign-in.
- Confirmed a complete in-app password-recovery flow with an account-neutral request response, an allowlisted return route, a new-password form, and a clear result.
- Confirmed Supabase's same-verified-email automatic link for Google, disabled manual identity linking for V1, and kept different emails as separate accounts without library merging.
- Confirmed fresh authentication after typing `delete` for permanent account deletion. Failed authentication leaves the account unchanged, and the server revokes active sessions as part of deletion.
- Completed the Phase 8B decision pass without starting client or authentication implementation.
- Confirmed non-unique usernames as private display names. The authenticated user ID remains the owner and authorization identity, and any future public handle will be a separate field.
- Completed Phase 8B without adding a schema, migration, generated database type, or feature backend code.
- Added separate browser, request-scoped server, and privileged worker Supabase client modules.
- The server client reads all request cookies, writes refreshed cookies, and applies Supabase's private no-cache response headers.
- The privileged worker client reads the secret only through the server-only environment module and disables session persistence, token refresh, and URL session detection.
- Added one `createServerFn` identity reader that verifies the session through `getClaims()` and returns only the authenticated subject as `userId`.
- Added six client, cookie, worker, and identity tests. With the five environment tests, the focused Phase 8B run passed 11 tests across five files.
- `pnpm run check`, the client and server production build, the client bundle secret scan, and `git diff --check` passed.
- Hosted Confirm Email and Google OAuth settings and live authentication remain unverified after Phase 8B.

---

## Decisions

- Settings opens as a large modal surface and preserves the active library destination when it closes.
- Desktop Settings uses ordinary Profile, Account, Import, and Demo page buttons in a persistent left navigation with `aria-current="page"`. Mobile uses a Settings page list, one drill-in page, and Back. Neither layout uses tab semantics.
- Profile and avatar changes share one explicit save action; a valid upload previews locally but remains a draft until save.
- Settings preserves profile drafts across pages and requires discard confirmation before a dirty dialog closes.
- Onboarding reuses the profile editor, remains skippable, and asks before replacing a changed draft with defaults.
- Demo controls expose Email defaults, Google defaults, deterministic profile and deletion outcomes, profile-setup preview, and full fixture reset.
- Demo controls are mock-only and must be removed when real authentication and profile data replace the fixture adapter.
- A mocked account-deletion result remains visible until Reset demo acknowledges it; it does not imitate logout or session invalidation.
- Usernames trim outer whitespace, require 1 to 40 characters, allow Unicode, and do not simulate uniqueness.
- Avatar upload uses the native file picker and a square cover preview without adding an image crop editor.
- Phase 6 includes every user-visible account and profile behavior in the feature contract that later phases do not cover.
- Phase 7 imports X archive posts into `X Bookmarks`; it does not cover general browser bookmark imports.
- Settings and the Collections section menu share one Import page and one import-state module.
- X archive review accepts `bookmark.js` and `bookmarks.js`, selects every valid post by default, and keeps duplicates eligible.
- Import writes each bookmark only after its mock save succeeds. Partial results keep confirmed posts and Retry processes failed posts only.
- Import state survives Settings page changes and closure. The controller owns library writes, toasts, and navigation while the import-state module owns fixtures and progress.
- The existing `X Bookmarks` collection is reused. A missing collection is created with the X icon and Neutral color.
- General browser bookmark import and its folder rules will be discussed for a later phase.
- Phase 8 is a backend umbrella with independent gates for connection setup, auth and client seams, core schema and RLS, domain adapters, durable jobs, capture and enrichment, import, export and restore, Realtime, and mock replacement.
- Supabase Queues is the durable enrichment transport. A bookmark insert creates its bookmark row, enrichment request, and queue message in one database transaction.
- Interactive quick-save and manual Re-enrich work uses a separate queue from bulk-import enrichment, with capacity reserved for both.
- Transient enrichment failures receive at most three attempts with bounded exponential backoff and jitter. Permanent failures stop at once, and manual Re-enrich starts a new request generation.
- Import success means bookmark and collection records are durable. Metadata enrichment continues separately and cannot turn a successful import into a partial import.
- Browser HTML import merges into the current library. Reway JSON restore stages and validates a full replacement before one short activation transaction.
- Reway exports portable browser HTML and a separate lossless, versioned JSON backup.
- General import proposes unique names for collection conflicts and never merges into an existing collection without an explicit choice.
- Phase 8 targets 100,000 bookmarks per account, uses 10,000 bookmarks as the routine large-import benchmark, and starts with a configurable 50 MB file limit.
- Quick save accepts complete HTTP or HTTPS URLs and clear scheme-less public web addresses, prefixes scheme-less addresses with HTTPS, permits duplicates, creates an Uncollected bookmark, and keeps the current destination.
- When quick save is not visible in the current destination, the dashboard announces `Saved to Uncollected. Metadata pending.` without a success toast.
- Re-enrich keeps the last good metadata while pending and after failure. Missing OG-image metadata remains a valid enriched result.
- Phase 8 uses the CLI migration workflow under `supabase/migrations/`. Local Data API setup requires explicit grants for new tables.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is the main browser variable. `VITE_SUPABASE_KEY` remains a checked alias for the current local environment.
- `SUPABASE_SECRET_KEY` is read only from `process.env` inside a server-only module.
- Phase 8B product choices must be locked before its client or authentication code starts.
- Email and password sign-up requires email confirmation before first sign-in.
- Production sign-in includes Google OAuth.
- Password recovery never reveals whether an account exists and completes the password change inside Reway.
- Supabase may link Google only when it returns the same verified email. V1 keeps manual identity linking disabled and treats different emails as separate accounts.
- Permanent account deletion requires fresh authentication after the typed confirmation and revokes active sessions as part of the server flow.
- Usernames remain non-unique display names and never act as account, routing, ownership, or authorization keys.
- Browser access uses the public URL and publishable key through `createBrowserClient`.
- Server access creates a new cookie-backed client for each request and applies every cookie and cache header returned by `@supabase/ssr`.
- Privileged worker access uses a separate server-only client with no persisted session state.
- Server authorization reads the verified JWT subject through `getClaims()` and does not trust `getSession()` or editable user metadata.

---

## Blockers

1. None

---

## Session end

- Open

---

## Do not include

- Brainstorming
- Implementation plans
- Transcript-style recap
- Repo-wide rules already covered in `AGENTS.md` or `CLAUDE.md`
- Motivational or steering language
