## Session 05

Write facts only. No plans, no advice, no narration.

**Filename:** `session-05.md`
**Session Status:** Ended

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
- Added `spec/integrations/supabase/phase-08/roadmap.md` as the bottom-up implementation order for Supabase, core data, durable jobs, capture, enrichment, import, export, restore, Realtime, and mock replacement.
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
- Completed the Phase 8C grilling pass and approved all 34 schema, security,
  concurrency, retention, and performance decisions without writing SQL.
- Added `spec/integrations/supabase/phase-08/phase-08c/contract.md` as the
  complete approved question-and-answer record.
- Reconciled the approved decisions with the feature contract. Private
  Broadcast replaces Postgres Changes, raw visit history expires after 30 days,
  lifetime counts move to `bookmark_stats`, normalized tag filtering uses a
  composite B-tree, and normal bulk mutations remain atomic.
- Added private Storage cleanup to confirmed account deletion because Supabase
  cannot delete an Auth user who owns Storage objects.
- Kept Session 05 open and moved the handoff to Phase 8C schema implementation.
- Verified that the Phase 8C decision record contains all 34 approved answers,
  every referenced handoff path exists, and stale Phase 8C grilling and replaced
  schema terms are absent from the active records.
- `pnpm run check` passed after the documentation update. No code test or React
  check applied to this documentation-only checkpoint.
- Completed Phase 8C without starting Phase 8D domain adapters.
- Added and applied four hosted migrations for the core schema, advisor index
  fixes, versioned rebalance, bounded retention cleanup, and corrected
  rebalance constraint lookup.
- Added nine public user-owned tables and thirteen private search, job, file,
  snapshot, and staging tables with direct indexed ownership and same-user
  composite foreign keys.
- Added database-enforced name, hierarchy, Trash, state, idempotency, ordering,
  worker lease, and account-write rules.
- Added exact authenticated grants, RLS policies, one private Realtime Broadcast
  policy, security-invoker public functions, and private checked helpers.
- Added grouped statement triggers for collection counts, visit statistics, and
  search upkeep, plus compact bookmark notices and bulk resync notices.
- Added `supabase/tests/phase-08c-core-schema.mjs` as the Docker-free migration,
  behavior, security, and 100,000-bookmark capacity gate.
- Added `supabase/tests/phase-08c-rebalance.mjs` and expanded the hosted rollback
  suite to check all three rebalance functions and stale-version rejection.
- Reproduced the missing-constraint fault before the fix, then verified the
  corrective migration through the public collection, tag, and bookmark
  functions locally and on the hosted database.
- The hosted rollback suite passed the high-risk account, bookmark, hierarchy,
  visit, search, Trash, worker, RLS, and anonymous-denial paths.
- The hosted generated-fingerprint benchmark inserted 10,000 rows in about
  1.97 seconds. Its forced rollback and follow-up counts confirmed no fixture
  remained.
- Supabase's performance advisor reports zero unindexed foreign keys and no
  warning or error after the follow-up index migration.
- Generated the hosted public schema types at
  `src/types/database.generated.ts`.
- `pnpm run check`, both production builds, the client secret scan, and
  `git diff --check` passed. React Doctor did not apply because no React file
  changed.
- Completed the Phase 8D grilling pass without starting implementation.
- Added `spec/integrations/supabase/phase-08/phase-08d/contract.md` as the
  approved route, domain, adapter, paging, search, mutation, verification, and
  complexity contract.
- Audited the live route and found no CSS or component behavior tied to the
  `/dashboard-ui` URL. The route file and generated route tree own the live URL.
- Audited the generated database functions and found that Phase 8D needs a safe
  direct search function and one atomic bookmark-tag replacement function.
- Kept this checkpoint documentation-only. No route, component, domain module,
  adapter, migration, generated type, package, or database object changed.
- Completed Phase 8D and stopped before Phase 8E.
- Renamed the live route from `/dashboard-ui` to `/library` with no redirect or
  alias. TanStack tooling regenerated `src/routeTree.gen.ts`, and the route
  keeps the same `DashboardUiPage` call and props.
- Added one framework-free `LibraryAdapter` with bounded read and mutation
  unions, branded decimal IDs, millisecond timestamps, opaque view-bound
  cursors, and stable `LibraryError` codes.
- Added a deterministic in-memory adapter and split its read logic from its
  mutation logic. Reads no longer create missing fixture-detail rows.
- Added a typed Supabase adapter for preferences, collection and tag pages,
  bookmark destinations and sorts, bookmark detail, grouped search, simple
  edits, membership changes, Trash, ordering, preferences, and visit events.
- Kept account work, quick save, re-enrichment, queues, import, export, restore,
  Realtime, and visible mock replacement out of Phase 8D.
- Added and applied `phase_08d_library_interface` with checked grouped search,
  atomic bookmark-tag replacement, exact grants, fixed search paths, and a
  collection-name trigram index.
- Generated hosted public types after the migration. Both browser and
  request-scoped clients now use the generated `Database` type.
- The Phase 8D local function test passed grouped search, parent paths, atomic
  tag replacement, cross-user denial, exact grants, and a 10,000-collection
  indexed search plan.
- The Phase 8C replay and capacity gate passed with 100,000 bookmarks and the
  Phase 8D full-text plus trigram search predicate. The three rebalance
  regressions also passed.
- The hosted Phase 8D rollback smoke passed authenticated search, atomic tag
  replacement, cross-owner rejection, anonymous denial, and forced rollback.
- Supabase advisors found no new warning or error from Phase 8D. The new search
  index has a passing 10,000-row plan check despite its immediate unused-index
  information notice.
- The final focused run passed 38 tests across the library contract, adapters,
  typed Supabase clients, profile forms, and management flow. The full run
  passed all 223 tests across 46 files with four workers.
- `pnpm run check`, both production builds, the Phase 8C and 8D database checks,
  the client secret-name scan, and `git diff --check` passed.
- Full-scope React Doctor 0.9.13 completed across 142 files with no skipped
  checks, no findings, and a 100/100 score. Two client-owned mock forms keep
  native submit behavior with narrow false-positive notes. Two locked render
  surfaces and the UI audit's intentional command-footer copy also have narrow
  false-positive notes. Real array and lookup findings now use one-pass loops
  and a set lookup.
- Browser, touch, keyboard, screen-reader, contrast, and screenshot checks
  remain unverified.
- Completed the Phase 8E durable jobs and queues decision pass without writing
  implementation code.
- Audited the current Phase 8 records, job schema, claim and result functions,
  worker client, installed package types, hosted extensions, migrations, and
  Edge Functions.
- Confirmed at the decision checkpoint that the hosted project was healthy and
  current through Phase 8D. PGMQ, Cron, and pg_net were available but not
  installed, and no Edge Function was deployed.
- Added `spec/integrations/supabase/phase-08/phase-08e/contract.md` as the
  approved activation, queue, message, lease, retry, repair, worker security,
  diagnostic, verification, and complexity contract.
- Kept this checkpoint documentation-only. No migration, queue, extension,
  worker module, Edge Function, generated type, or hosted database object
  changed.
- Completed Phase 8E and stopped before Phase 8F.
- Added and applied the durable queue, opaque worker ID, extension-helper grant,
  and strict retry-message migrations.
- Installed PGMQ, Cron, and pg_net and created four logged queues for interactive
  enrichment, bulk enrichment, import or restore, and export work.
- Added transactional queue writes for bookmark creation and manual Re-enrich,
  exact message claims, renewable leases, attempt start, retry visibility,
  terminal deletion, poison rejection, bounded repair, and a private operator
  snapshot.
- Kept all public worker functions as security invokers. Browser roles have no
  worker grants, PGMQ has no browser or direct `service_role` grants, and the
  extension event-trigger helper no longer has public execution grants.
- Added the framework-free durable worker, strict versioned envelopes, bounded
  concurrency, stable retry jitter, in-memory adapter, and server-only Supabase
  adapter under `src/lib/durable-worker/`.
- Added and deployed a dormant `durable-worker` Edge Function with JWT
  verification and a separate wake-token check. Phase 8E enables no queue
  handler and stores no wake token.
- Regenerated hosted public types after changing worker message IDs and
  enrichment generations to opaque strings at the RPC seam.
- The Phase 8E PGLite suite, applied-schema hosted rollback smoke, and focused
  worker run passed. The focused run has 22 tests across five files.
- The full suite passed 245 tests across 51 files with four workers. The Phase
  8C 100,000-bookmark gate, three rebalance checks, Phase 8D 10,000-row search
  check, and Phase 8E queue checks passed.
- `pnpm run check`, both production builds, the client secret-name scan, and
  `git diff --check` passed.
- Supabase security and performance advisors report no warning or error after
  the final grant migration. Their remaining notices are informational.
- React Doctor and browser checks did not apply because Phase 8E changed no
  React or rendered UI.
- Completed the Phase 8F decision pass without starting implementation.
- Replaced the proposed offline Retry-only path with a durable, user-scoped
  IndexedDB outbox that survives reload and browser restart, keeps one client
  request ID, isolates accounts, and never labels local-only work as saved.
- Confirmed that every valid imported bookmark enters the bulk enrichment
  queue without delaying or changing import success.
- Confirmed private Supabase Storage for bounded sanitized favicon and OG-image
  derivatives, batched signed delivery, immutable generation paths, and durable
  tracked cleanup. The browser never hotlinks source metadata URLs.
- Approved a fast-import contract that commits 50 bookmarks before metadata,
  opens the result at once, wakes bulk work after commit, enriches the first
  visible page first, and prevents one slow host from blocking the rest.
- Approved controlled hosted p95 gates of one second for Phase 8F's 50-item
  bulk publication fixture and Phase 8G's later durable import response, 250
  milliseconds for eligible queue wait, two seconds for the first 12
  enrichments, and ten seconds for all 50 basic metadata and asset results.
- Approved moving the enrichment handler to a dedicated worker runtime if the
  Supabase Edge Function cannot pin destinations or meet the security,
  resource, and latency gates. The Phase 8E worker interface and durable queue
  controls remain unchanged.
- Added `spec/integrations/supabase/phase-08/phase-08f/contract.md`
  and reconciled the feature contract, backend plan, Supabase index, and
  handoff. This checkpoint changes documentation only.
- Completed Phase 8F implementation-order step 1 and stopped before the browser
  outbox.
- Added pure HTTP URL normalization, public IP classification, a 16-address DNS
  bound, mixed-safe DNS rejection, an injected SSRF policy, exact peer checks,
  and Deno DNS and pinned-connection adapters.
- The Deno adapter opens TCP to the checked IP and starts TLS with the original
  host name. The dormant worker now fails at boot if the runtime lacks the DNS,
  TCP, or TLS operation needed for destination pinning.
- Deployed the still-dormant worker with JWT verification on. The hosted boot
  proof passed without a wake token, enabled queue, outbound connection, or
  page fetch.
- The focused URL, IP, SSRF, Deno adapter, and worker-wake run passed 93 tests
  across five files. `pnpm run check`, both production builds, the client
  secret-name scan, and `git diff --check` passed.
- No outbox, library command, migration, metadata, asset, queue handler, wake,
  live fetch, or Phase 8G work started.
- Completed Phase 8F implementation-order step 2 and stopped before library
  quick-save and Re-enrich commands.
- Added one framework-free quick-save outbox interface with matching in-memory
  and IndexedDB adapters, subject-scoped reads and mutations, atomic per-subject
  totals, bounded multi-tab claims, lease recovery, and stable retry timing.
- Kept one client request ID through retries and reloads. Uncertain responses
  persist `reconcile` as the next action. Confirmed saves remove the stored entry,
  while permanent failures remain until explicit dismissal.
- Enforced 1,000-entry and 16 MiB caps without dropping older saves. Missing or
  different identities cannot read or claim another subject's entries through
  the normal interface.
- The browser adapter requests persistent storage once. Denial keeps the entry
  with `best_effort` status, while an IndexedDB failure reports that the device
  did not preserve the save.
- Added pinned `fake-indexeddb` 6.2.5 as a test-only dependency.
- The focused URL, IP, SSRF, outbox, Deno adapter, and worker-wake run passed
  112 tests across seven files. `pnpm run check`, both production builds, the
  client secret-name scan, and `git diff --check` passed.
- Browser-backed IndexedDB, persistence, and multi-tab checks remain unverified.
- No library command, Supabase adapter change, migration, metadata, asset, queue
  handler, wake, live fetch, UI wiring, or Phase 8G work started.
- Completed Phase 8F implementation-order step 3 and stopped before the
  reviewed migration.
- Extended `LibraryAdapter` and both adapters with idempotent quick save,
  client request reconciliation, and manual Re-enrich.
- Quick save now uses the checked Phase 8F URL policy, preserves the client
  creation time, creates a pending Uncollected bookmark, and permits the same
  URL under different request IDs.
- The Supabase adapter uses the existing atomic bookmark and Re-enrich
  functions, returns an authoritative bookmark with visit stats, and looks up
  uncertain saves through the user-scoped request ID index under RLS.
- Added tests for repeat saves, request reconciliation, duplicate URLs,
  metadata preservation, Trash, unsafe input, invalid receipts, and
  authoritative Supabase mapping.
- The focused library run passed 29 tests across three files. The Phase 8F run
  passed 141 tests across ten files. The Phase 8D and 8E database checks,
  `pnpm run check`, both production builds, the client secret-name scan, and
  `git diff --check` passed.
- React Doctor did not apply because no React file changed. Browser-backed
  IndexedDB, persistence, and multi-tab checks remain unverified.
- No migration, metadata parser, asset work, queue handler, wake, live fetch,
  UI wiring, or Phase 8G work started.
- Completed Phase 8F implementation-order step 4 and stopped before metadata
  parsing, derivative creation, and Storage upload.
- Added the reviewed `phase_08f_bookmark_assets` migration without applying it
  to the hosted project or regenerating hosted types.
- Added the 8,192-character bookmark URL bound and one private derivative bucket
  limited to JPEG, PNG, WebP, and 256 KiB objects.
- Added private tracked bookmark assets, current bookmark asset references,
  immutable user-prefixed paths, checked derivative facts, six-candidate request
  caps, owner-checked signing-path reads, and bounded cleanup leases.
- Replaced the worker's source-image URL result with checked asset IDs and one
  required normalized domain. Successful work switches assets atomically.
  Failed Re-enrich keeps the last good metadata, and stale work queues its
  candidates for deletion.
- Aligned worker asset locks with bookmark deletion order and made manual
  Re-enrich keys race-safe and conflicting cross-bookmark reuse explicit.
- Added `supabase/tests/phase-08f-bookmark-assets.mjs` and updated the shared
  PGlite Storage stub plus older worker calls for the new result contract.
- All Phase 8C through 8F database gates passed. The Phase 8C capacity run kept
  its 100,000-bookmark check, and the new gate passed URL, asset, ownership,
  replacement, stale-generation, grant, deletion, and cleanup cases.
- The Phase 8F focused run passed 141 tests across ten files. `pnpm run check`,
  both production builds, the client secret-name scan, and `git diff --check`
  passed.
- React Doctor did not apply because no React file changed. Browser-backed
  IndexedDB, persistence, and multi-tab checks remain unverified.
- No metadata parser, derivative implementation, Storage object upload, queue
  handler, wake, hosted apply, generated type update, live fetch, UI wiring, or
  Phase 8G work started.
- Completed Phase 8F implementation-order step 5 and stopped before queue
  handlers.
- Added bounded HTML and XHTML parsing for title, favicon, base URL, and OG-image
  metadata. The parser supports UTF-8, UTF-16, and Windows-1252 input, the 2 MiB
  body cap, 512-code-point titles, malformed markup, bounded duplicate fields,
  and safe relative URL resolution.
- Added a framework-free bookmark asset processor with injected rasterizer,
  checked registry, and private Storage interfaces.
- The processor checks declared and actual image types, source bytes, static
  PNG, JPEG, and WebP structure, the 20-megapixel decode cap, animation, output
  dimensions, output bytes, and checksum before it marks an asset ready.
- Added a Photon WebAssembly rasterizer for bounded static WebP derivatives. It
  keeps aspect ratio, never upscales, strips source metadata, and makes at most
  eight size-reduction attempts.
- Added immutable private Supabase Storage upload with explicit content type,
  one-hour cache metadata, and no upsert. An uncertain duplicate succeeds only
  when the stored bytes match. A different object returns a non-retryable
  conflict.
- Pinned `htmlparser2` 12.0.0 and `@cf-wasm/photon` 0.4.0.
- The new parser, processor, rasterizer, and Storage adapter passed 36 tests
  across four files. The Phase 8F focused run passed 177 tests across 14 files,
  and the local Phase 8F database gate passed.
- `pnpm run check`, both production builds, `pnpm audit --prod`, the client
  secret-name scan, and `git diff --check` passed.
- React Doctor did not apply because no React file changed. Browser-backed
  IndexedDB, persistence, and multi-tab checks remain unverified.
- HTML parsing costs `O(H)` time and memory for at most 2 MiB. Image inspection
  costs `O(B)` time and constant extra memory. Decode and bounded re-encoding
  cost `O(P)` time and memory for at most 20 million pixels. Duplicate upload
  checks cost `O(S)` time and memory for at most 256 KiB.
- No queue handler, wake, hosted apply, generated type update, live fetch, UI
  wiring, or Phase 8G work started.

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
- Phase 8C uses one implicit library per user, hybrid UUID and bigint keys,
  direct junction ownership, composite ownership foreign keys, and indexed RLS
  predicates.
- Collection and tag names use generated normalized values with race-safe
  uniqueness. Postgres is the final authority for the one-child-tier collection
  hierarchy.
- Exact URL lookup uses a fixed SHA-256 fingerprint plus a full-URL comparison.
  Search uses a separate language-neutral full-text and trigram projection.
- Raw visit rows expire after 30 days. Batched inserts keep one row per visit,
  and a statement-level trigger updates the permanent narrow statistics row.
- Bookmark queries use keyset pagination. A later UI slice adds list and grid
  virtualization so database, network, memory, and DOM work remain bounded.
- Ordering uses fractional keys, per-scope versions, short locks, stale-write
  rejection, and rare scoped rebalance.
- Simple one-row edits may use direct RLS-safe mutations. Multi-row invariants
  use short atomic database functions, with security-invoker behavior by
  default and tightly controlled private helpers only where required.
- Library sync uses one private Broadcast channel per user. Bulk work suppresses
  per-row notices and sends one resync notice after commit.
- Import, export, and restore use typed durable job state, private staging, and
  private Storage files with explicit retention. High-volume enrichment
  requests remain separate from transfer-job details.
- Normal bulk bookmark actions remain one atomic set-based mutation. Import may
  commit in idempotent chunks because it stores one durable result per item.
- Confirmed account deletion removes tracked Storage objects before deleting the
  Auth user and cascading relational data. Once confirmed deletion starts, it
  remains pending and retries until complete.
- Docker is not part of the Phase 8C gate. The local gate uses pinned PGlite,
  while hosted checks use rollback-only fixtures against the connected project.
- Public application functions run as security invokers. Work that needs raised
  rights stays in the private schema, fixes its search path, checks the caller,
  and receives only the grants it needs.
- Phase 8D renames `/dashboard-ui` directly to `/library` with no redirect and
  keeps the same rendered `DashboardUiPage` without any visual or behavioral
  change. The `src/dev/dashboard-ui/` directory stays in place during Phase 8D.
- Phase 8D builds domain interfaces and matching in-memory and Supabase adapters
  without replacing the visible mock controller. Phase 8J owns live UI
  replacement.
- One framework-free, user-scoped `LibraryAdapter` exposes `read(request)` and
  `mutate(command)`. It never accepts a user ID and never creates its own
  Supabase client.
- `AccountAdapter` separately owns identity and account lifecycle.
  `LibraryAdapter` owns bookmarks, collections, tags, search, Trash, ordering,
  dashboard preferences, and visit recording.
- The Supabase library adapter accepts either the request-scoped server client
  or browser client. Secret and worker clients remain outside the library
  adapter.
- Domain objects use camel-case fields, entity-specific opaque string IDs, and
  epoch-millisecond timestamps. Generated database row types stay inside the
  Supabase adapter.
- Bookmark, collection, and tag keyset pages default to 48 items and reject
  requests over 96. Phase 8J prefetches before the last 12 loaded items enter
  view.
- Routine bookmark pages omit tag and collection memberships. One lazy
  bookmark-detail read loads those relations when its menu or editor needs
  them.
- Search keeps Bookmarks before Collections and returns at most 32 bookmark and
  16 collection matches. A checked authenticated database function exposes only
  safe search results while the search projection remains private.
- Cursors remain opaque to callers and bind to their request kind, destination,
  and sort.
- Simple one-row operations use RLS-safe direct access. Multi-row rules use
  checked database functions, including a new atomic bookmark-tag replacement
  function.
- Single-row mutation results return the authoritative object and row version.
  Reorder returns scope versions. Bulk work returns an affected count and a
  refetch signal without returning the full library.
- Both adapters map failures to stable `LibraryError` codes with Retry safety.
  Raw Supabase and database errors never become browser state or product copy.
- Phase 8D uses focused contract tests, a hosted rollback smoke only for
  behavior local checks cannot prove, one advisor pass after final SQL, and the
  normal static and diff checks. Wider checks run only when changed scope needs
  them.
- Quick save, re-enrichment delivery, queues, import, export, restore, Realtime,
  authentication routes, account replacement, and visible mock replacement
  remain outside Phase 8D.
- Phase 8E uses logged PGMQ queues while application tables remain the durable
  status and audit source.
- Hybrid activation combines a best-effort post-commit wake with independent
  scheduled consumers. A bounded database Cron function repairs queue and lease
  drift without an Edge Function.
- One queue message stays bound to one request or job generation through its
  automatic retry cycle. Terminal messages are deleted, and poison payloads
  are never archived.
- Workers use renewable fail-closed leases, bounded claims, and attempt counts
  that start only before external or irreversible work.
- One typed retry module owns bounded backoff, stable jitter, and bounded
  `Retry-After` handling.
- Interactive, bulk, import or restore, and export queues have independent
  consumers and measured limits behind one shared worker module.
- Worker invocation uses JWT verification plus a separate wake token. Browser
  roles cannot access queue tables, private job state, or worker diagnostics.
- A private `service_role` operator snapshot reports bounded queue, lease,
  retry, repair, and poison counts without user data or payloads.
- Phase 8F quick save uses a durable browser outbox. Its persistence states are
  `queued_offline`, `saving`, `saved`, and `save_failed`, separate from bookmark
  metadata state.
- The outbox writes before command close, reuses one client request ID, pauses
  on missing or mismatched identity, and drains through several wake paths
  without depending on Background Sync or `navigator.onLine`.
- Every valid imported bookmark gets its own bulk enrichment request and result
  state. Same-user exact duplicates may share only one in-flight fetch.
- Favicon and OG-image bytes use private tracked Storage objects, bounded static
  derivatives, immutable generation paths, and batched signed delivery. Source
  metadata URLs never become browser image URLs.
- Phase 8F performance gates measure Reway overhead with a controlled hosted
  50-link fixture. Remote host variance never becomes a page-level import wait.
- The enrichment runtime is replaceable behind `runDurableWorker`. Security and
  measured latency decide whether the Supabase Edge Function remains the
  production handler.

---

## Blockers

1. None

---

## Session end

- Session ended

---

## Do not include

- Brainstorming
- Implementation plans
- Transcript-style recap
- Repo-wide rules already covered in `AGENTS.md` or `CLAUDE.md`
- Motivational or steering language
