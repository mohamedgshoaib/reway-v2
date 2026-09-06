# Phase 8 backend plan

## Status

- Research and product decisions were recorded on 2026-09-05.
- Dashboard phases 0 through 7 are complete as local mock work.
- Phase 8A and Phase 8B were completed on 2026-09-06.
- No schema, migration, generated database type, or feature backend code has
  been added in Phase 8. Phase 8B added only the client and authentication
  modules described below.
- Session 05 remains open.

## Goal

Build Reway's backend from the database upward. Replace mock adapters in small,
verified steps. The first complete path is capture, durable import and export,
metadata enrichment, and client reconciliation.

Phase 8 is an umbrella. Each slice below is a stop point with its own tests and
review. Do not treat the phase as one large change.

## Product rules already confirmed

- Quick save accepts complete `http://` and `https://` URLs.
- Quick save also accepts a clear public web address such as
  `mosexperiences.com/path` and prefixes it with `https://`.
- URL input trims outer whitespace. It does not run a DNS request before save.
- Unsupported schemes, malformed input, localhost, and private-network targets
  do not become bookmarks.
- Pressing Enter on a valid address saves a new bookmark. Duplicate URLs remain
  allowed.
- Quick save has no required fields and no collection picker.
- A quick save creates an Uncollected bookmark.
- Quick save keeps the current destination. When the new bookmark is outside
  that view, announce `Saved to Uncollected. Metadata pending.`
- Keyboard submission closes the command at once and adds no decorative motion
  or success toast.
- Settings > Demo controls the next mock enrichment result and speed. A request
  captures those fixture values when it starts. Later fixture changes do not
  alter work already pending.
- Reset demo invalidates pending mock results and restores fixture defaults.
- Re-enrich preserves the last good title, favicon, and OG image while pending.
- A failed Re-enrich keeps the last good metadata and adds a quiet failed state.
- A new bookmark that fails enrichment keeps its URL-derived fallback data.
- Enrichment reads title, favicon, and OG-image metadata in one page-fetch flow,
  regardless of the current display mode.
- Missing OG-image metadata is a valid enriched result with `ogImage = null`.
- Browser bookmark import merges into the current library.
- Reway backup restore stages a complete library replacement. It activates the
  staged snapshot only after validation and creates a recoverable pre-restore
  snapshot.
- Reway supports a portable browser HTML export and a lossless Reway JSON
  backup. JSON restore remains separate from normal browser import.
- Import never merges a conflicting source folder into an existing collection
  without approval. Review proposes unique imported names and offers
  `Use existing collection` as an explicit choice.
- Import completion means the selected bookmark and collection records are
  durable. Metadata work continues separately and does not turn a successful
  import into a partial import.
- The first capacity target is 100,000 bookmarks per account. A 10,000-bookmark
  file is the routine large-import benchmark.
- The initial file limit is 50 MB and remains configurable. Use resumable upload
  above 6 MB or when network stability is a concern.
- Enrichment uses a durable queue instead of one direct webhook per insert.
- Transient enrichment failures receive at most three attempts with bounded
  exponential backoff and jitter. Respect `Retry-After` when supplied.
- Permanent failures do not retry. Manual Re-enrich starts a new request and a
  new attempt budget.

## Work order

### Phase 8A: connection and migration base

1. Verify the Supabase project, CLI, and MCP connection without printing keys.
2. Confirm that the browser key is a publishable key. The current Supabase
   quickstart uses `VITE_SUPABASE_PUBLISHABLE_KEY`. If the provided variable is
   named `VITE_SUPABASE_KEY`, verify that its value is publishable before adding
   an alias or renaming it.
3. Keep `SUPABASE_SECRET_KEY` server-only. Never read it from `import.meta.env`,
   a browser module, a route component, or a client bundle.
4. Install and pin `@supabase/supabase-js` and `@supabase/ssr`. Commit the
   lockfile change.
5. Initialize the repository's migration workflow and keep every schema change
   in version control.
6. Add generated database types only after the first reviewed schema exists.
7. Add environment validation that reports missing variable names without
   logging their values.

Stop after the connection check if the project identity, key type, migration
history, or MCP target is unclear.

Verified Phase 8A state:

- The environment URL and publishable key match the one healthy project exposed
  by the connected Supabase MCP server. No environment value or project ID was
  recorded.
- Remote migration history and the remote `public` schema are empty. The
  repository uses the CLI migration workflow under `supabase/migrations/`, with
  `supabase/config.toml` in version control.
- Local Data API setup requires explicit grants for new tables. RLS remains a
  separate row-access requirement.
- `@supabase/supabase-js`, `@supabase/ssr`, and the Supabase CLI are pinned in
  `package.json` and `pnpm-lock.yaml`.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is the main browser variable.
  `VITE_SUPABASE_KEY` remains a checked alias for the current local setup.
- Public environment checks live in `src/lib/supabase-environment.ts`. Secret
  checks live in `src/lib/supabase-environment.server.ts` and read
  `SUPABASE_SECRET_KEY` from `process.env`.
- Generated database types will live at
  `src/types/database.generated.ts` after the first reviewed schema exists.

### Phase 8B: client and auth seams

Create separate modules for browser, request-scoped server, and privileged
worker access.

- The browser client uses the project URL and publishable key. RLS protects all
  user data it can query.
- The server client reads and writes the signed-in user's cookie-backed session.
- The worker client uses a secret key only inside server-only code or an Edge
  Function.
- Route loaders may run on the server and in the browser. A loader calls a
  `createServerFn` for server-only work.
- Server-only modules use the `.server.ts` boundary and TanStack Start import
  protection.
- Authorization checks use the authenticated user identity, not editable user
  metadata.

The dashboard guide snippet with one shared `src/utils/supabase.ts` client is a
quickstart example. Do not use that single module as Reway's production seam.

Verified Phase 8B state:

- `src/lib/supabase/browser-client.ts` creates the cookie-backed browser client
  from the public URL and publishable key.
- `src/lib/supabase/server-client.server.ts` creates one server client per
  request. It reads all request cookies, writes refreshed cookies, and applies
  Supabase's private no-cache response headers.
- `src/lib/supabase/worker-client.server.ts` creates the privileged client from
  the server-only secret and disables session persistence, token refresh, and
  URL session detection.
- `src/lib/supabase/auth-identity.server.ts` exposes a `createServerFn` that
  verifies the session with `getClaims()` and returns only the authenticated
  subject as `userId`.
- Eleven focused environment, cookie, client-separation, and identity tests
  pass across five files. The static checks, client and server production
  builds, client bundle secret scan, and `git diff --check` also pass.
- Hosted Confirm Email and Google OAuth settings and live authentication remain
  unverified. Verify them before testing a live auth flow.

### Phase 8C: core schema and security

Build and test the data model before wiring feature UI.

1. Profiles and account-owned settings.
2. Bookmarks and their metadata, Trash, visit count, and ordering fields.
3. Collections, one allowed child tier, appearance, and section order.
4. Tags and bookmark-tag membership.
5. Bookmark-collection membership and collection-local order.
6. Dashboard preferences.
7. Bookmark visit events.
8. Import, export, restore, and enrichment request records.

Every user-owned table needs:

- `user_id` ownership where the row can be queried on its own.
- RLS enabled before client access.
- Least-privilege grants.
- Ownership policies that use `(select auth.uid()) = user_id`.
- `USING` and `WITH CHECK` on updates.
- An index that starts with `user_id` for user-scoped access paths.
- Indexed foreign keys.
- Database constraints for enums, required fields, sizes, and valid state
  changes where Postgres can enforce them.

Do not use the secret key to make missing RLS policies appear to work. Test all
user paths with authenticated clients. Add cross-user denial tests before UI
wiring.

### Phase 8D: domain modules and adapter parity

Keep the current mock and Supabase implementations behind the same small domain
interfaces while migration is in progress.

- Bookmark capture owns URL parsing, local request IDs, persistence state, and
  the save result.
- Bookmark lifecycle owns enrichment request generations and visible metadata
  state.
- Collection hierarchy remains the single owner of depth rules and flattening.
- Import owns file parsing, review, staging, conflict decisions, durable commit,
  and result counts.
- Export owns snapshot selection, format generation, storage, and expiry.
- Restore owns validation, staging, replacement activation, and recovery.

Run the same contract tests against the mock adapter and Supabase adapter. Swap
one feature path at a time. Do not keep two independent sets of business rules.

### Phase 8E: durable jobs and queues

Application tables own user-visible job state. Supabase Queues transports work.
The queue is not the only status record.

Use separate queues:

- An interactive enrichment queue for quick saves and manual Re-enrich.
- A bulk enrichment queue for imports.
- An import or restore queue for durable transfer work.
- An export queue for generated files.

Reserve worker capacity for both enrichment queues. Interactive work may pass
bulk work, but bulk work must keep a minimum share so it cannot starve.

Each durable request records:

- A stable request ID and idempotency key.
- The owning user ID.
- A schema or payload version.
- Current state.
- Attempt count and maximum attempts.
- Failure class and safe public error code.
- Queue, start, heartbeat, completion, and next-attempt times.
- The current request generation for stale-result rejection.

Queue consumers assume at-least-once delivery. A consumer must reach the same
stored result if it receives the same message more than once. Never increment a
counter, create a second bookmark, or apply stale metadata without an atomic
guard.

Keep database transactions short. Do not hold a row lock during DNS or HTTP
work. Claim a bounded batch, commit the claim, perform network work, then apply
the result with a generation and state check.

Use a visibility timeout longer than the per-item fetch budget. A worker that
cannot finish must leave the message unacknowledged. A scheduled repair task
checks old active rows, expired leases, queue depth, and missing terminal state.

### Phase 8F: quick add and enrichment

Quick add has two independent state axes:

- Persistence state: `saving`, `saved`, or `save_failed`.
- Metadata state: `pending`, `enriched`, or `failed`.

Do not use metadata pending to hide a failed bookmark insert.

Online save flow:

1. Parse and normalize the address without network access.
2. Create a client request ID.
3. Show the local saving bookmark at once when the destination can display it.
4. Submit an idempotent bookmark-create request.
5. In one database transaction, insert the bookmark, create its enrichment
   request, and enqueue the message.
6. Return the durable bookmark without waiting for metadata.
7. Reconcile an uncertain client response by request ID before retrying.

Enrichment flow:

1. Claim one queued request generation.
2. Validate the scheme, credentials, hostname, resolved addresses, and port.
3. Pin the validated destination for the connection.
4. Disable automatic redirects. Validate and resolve every redirect target.
5. Apply DNS, connection, header, body, redirect-count, content-type, and total
   response limits.
6. Extract title, favicon, and OG-image URL from the same bounded document.
7. Store a complete result, including valid null fields.
8. Update the bookmark only if the request generation still matches.
9. Acknowledge the queue message after the database result commits.

Re-enrich keeps prior metadata visible. A successful result replaces it. A
failed result preserves it and records the failure state.

Do not add a broad cross-user metadata cache in the first version. Exact URL
duplicates inside one user-owned import may share one in-flight fetch, then copy
the result into separate bookmark rows. Manual Re-enrich always makes a fresh
request for one bookmark.

### Phase 8G: browser import

The first general format is Netscape-style bookmark HTML exported by current
browsers.

1. Validate file name, size, and format before starting an upload.
2. Use a private, user-scoped temporary object path. Never overwrite another
   import object.
3. Use resumable upload above 6 MB or for an interrupted prior upload.
4. Create the durable import job only after the server can identify the uploaded
   object.
5. Parse the file as untrusted data. Never execute scripts or X archive
   wrappers.
6. Preserve valid source title and creation time where present.
7. Normalize and validate every URL.
8. Build a review summary for bookmarks, folders, invalid rows, duplicates,
   flattened paths, and name conflicts.
9. Select valid bookmarks by default. Keep duplicates eligible.
10. Resolve every folder conflict before commit. Suggested unique names may be
    accepted in one action. Reusing an existing collection requires an explicit
    choice.
11. Keep the first two collection tiers. Assign deeper descendants to the
    nearest retained child and report each flattened source path.
12. Stage rows in bounded batches with idempotent item keys.
13. Commit valid bookmarks and memberships in batches. Keep per-item results.
14. Mark the import complete when all selected records have a durable result.
15. Enqueue imported bookmarks for bulk enrichment without delaying completion.

Import progress and result pages must use server pagination. Large reviews must
use list virtualization. Do not load or render 100,000 rows at once.

Closing Settings does not affect the job. Closing or reloading the browser after
job creation does not affect the job. If the browser closes before upload
completion, the user may need to select the same local file again before the
resumable client can continue.

### Phase 8H: export and restore

Browser HTML export:

- Produce a browser-compatible bookmark HTML file.
- Escape every URL, title, folder name, tag attribute, and description written
  into HTML.
- Omit unsafe schemes.
- Represent bookmarks in each selected collection. A bookmark in more than one
  collection may appear more than once because browser HTML has no Reway
  membership model.
- Put Uncollected bookmarks in an `Uncollected` folder.
- State that tags, Trash state, visit counts, and Reway-only ordering are not
  portable in this format.

Reway JSON backup:

- Add a schema version, creation time, account-independent object IDs, and a
  checksum manifest.
- Include bookmarks, collections, tags, memberships, ordering, preferences, and
  the user-owned fields needed for a lossless library restore.
- Exclude secrets, sessions, internal queue messages, worker diagnostics, and
  short-lived signed URLs.
- Read source data with cursor pagination and stream output into a private
  temporary object. Do not load a 100,000-bookmark library into worker memory.

Restore:

1. Upload and validate the complete Reway backup.
2. Reject unsupported future schema versions and report required migrations for
   supported older versions.
3. Stage all rows under a new library snapshot ID.
4. Verify counts, references, constraints, ownership, and checksums.
5. Create a recoverable snapshot of the active library.
6. Ask for explicit replacement confirmation.
7. Activate the staged snapshot in one short transaction.
8. Keep the old snapshot available for the documented recovery period.

Failure before activation leaves the active library unchanged. Closing the
dialog or browser does not activate or discard a validated staged restore.

### Phase 8I: Realtime and reconciliation

Postgres is authoritative. Realtime is a notification path.

- Subscribe only to the signed-in user's rows.
- Reconcile job and bookmark state after subscription, reconnect, tab focus,
  and route return.
- Use stable row versions or update times to reject stale events.
- Do not assume that `SUBSCRIBED` proves the client received every change.
- Refetch the active view and active jobs after a gap instead of replaying an
  unbounded client event log.
- Paginate large library reads. Do not load the full account into browser memory.

Do not build a Linear-style local database or full delta-sync engine in this
phase. Reway needs authoritative resync and narrow optimistic state first.

### Phase 8J: mock replacement and release gates

Move one bounded feature path at a time:

1. Authentication and profile identity.
2. Collections and tags.
3. Bookmark reads and view queries.
4. Bookmark writes, Trash, ordering, and bulk actions.
5. Quick add and enrichment.
6. X and browser import.
7. Export and restore.
8. Realtime updates and extension-facing contracts.

Keep the deterministic mock adapter available until the matching Supabase path
passes contract tests, RLS tests, and failure tests. Delete mock-only Demo
controls only after their live replacement passes.

## Job state rules

Use explicit states. Exact database enum names may change during schema design,
but the behavior must remain distinct.

| State | Meaning | User action |
| --- | --- | --- |
| Staging | Input is still uploading or being written to staging | Resume or cancel |
| Awaiting review | Parsing finished and decisions remain | Review and confirm |
| Queued | The server accepted the job but no worker owns it | Wait or cancel when safe |
| Running | A worker owns a live lease | View progress or pause import |
| Paused | No new items may start | Resume or cancel |
| Completed | Every selected item has a durable result | View results |
| Completed with failures | Some selected records failed to commit | Retry failed items |
| Failed | The job cannot continue without a new action | Retry or choose another file |
| Cancelled | The user stopped work that had not committed | Start another job |

Metadata state remains per bookmark. Import and export job state must not reuse
the metadata status field.

## Failure and retry rules

Classify before retrying.

Retryable examples:

- Worker termination before a durable result.
- Queue lease expiry.
- Temporary DNS failure.
- Connection reset.
- Bounded request timeout.
- HTTP 429 with `Retry-After`.
- Selected HTTP 5xx responses.
- A transaction conflict that made no partial external promise.

Permanent examples:

- Invalid or unsupported URL.
- Embedded credentials.
- Local, private, link-local, multicast, reserved, or cloud-metadata address.
- Redirect to an unsafe destination.
- Unsupported or oversized content.
- Malformed import or backup data.
- Ownership, RLS, or authorization failure.
- Unsupported backup schema version.

Use no more than three automatic attempts for enrichment. Record every attempt.
After exhaustion, store a failed result and allow a manual retry. Infrastructure
redelivery must not spend a new attempt if the prior worker never reached the
network request.

## Browser and network edge cases

| Event | Required behavior |
| --- | --- |
| Settings closes | Durable jobs continue and reopen at current state |
| User switches browser tabs | Server work continues; refresh state on focus |
| Browser reloads after job creation | Query active jobs and current bookmark state |
| Browser closes after job creation | Server work continues without the client |
| Connection drops during standard upload | Report interruption and retry the upload |
| Connection drops during resumable upload | Resume from the confirmed offset |
| Connection drops after an uncertain save response | Reconcile by idempotency key before retry |
| Realtime disconnects | Mark updates as delayed, reconnect, then refetch |
| Worker crashes | Let the lease expire and redeliver safely |
| Worker finishes after a newer request | Reject its stale generation |
| Queue message appears twice | Produce the same stored result once |
| One target host rate-limits Reway | Delay that host without blocking unrelated hosts |
| Import contains partial invalid data | Exclude invalid rows, report them, and keep valid rows reviewable |
| Export worker stops | Resume from stored cursor or restart the idempotent export job |
| Restore validation fails | Keep the active library unchanged |

`navigator.onLine` may support a hint. It must not decide whether an operation is
allowed because it does not prove that Supabase is reachable.

## Performance and capacity plan

Design targets:

- 100,000 bookmarks per account.
- Routine large-import benchmark at 10,000 bookmarks.
- Benchmark sets at 100, 1,000, 10,000, and 100,000 bookmarks.
- Initial 50 MB import and restore file limit.
- Resumable upload above 6 MB.
- O(n) parse and staging work for n source records.
- O(batch size) worker memory after upload and review indexing.
- Cursor-paginated export with bounded worker memory.
- Indexed O(log n) user and job lookups.

Do not promise a duration before measurement. Record p50, p95, and p99 for:

- Quick-save local feedback.
- Bookmark persistence acknowledgement.
- Queue wait time by priority.
- Metadata fetch and total enrichment time.
- Upload, parse, review, commit, and completion time by import size.
- Export generation time and output size.
- Reconnect-to-consistent-state time.

Run load tests with duplicates, repeated hosts, slow hosts, rate limits, invalid
HTML, large titles, long folder paths, missing images, Arabic and accented text,
and mixed success. Track queue depth and oldest queued age during every run.

Tune batch size, worker count, visibility timeout, per-host limit, and reserved
bulk capacity from these measurements. Do not copy another product's numeric
settings without measuring Reway on its Supabase plan and deployment region.

## Observability

Record structured metrics and logs without URLs, tokens, file contents, or user
data in labels.

Required metrics:

- Queue depth and oldest age by queue.
- Claimed, completed, retried, exhausted, and stale jobs.
- Attempts and failure codes.
- Queue wait, fetch, parse, commit, and end-to-end duration histograms.
- Import counts by durable result.
- Realtime disconnect and reconciliation counts.
- Restore validation and activation results.

Add an operator view or query for active, old, and failed jobs before launch.
Add alerts only after normal measurements establish useful thresholds.

## Validation gates

Every slice runs the checks that match its risk. Do not run every test after
every file edit.

- Pure model tests for normalization, state transitions, flattening, conflict
  resolution, retry classification, and stale-generation rejection.
- Adapter contract tests against mock and Supabase implementations.
- RLS tests for same-user access and cross-user denial.
- Migration reset and replay from an empty local database.
- Queue tests for duplicate delivery, lease expiry, worker crash, and exhausted
  attempts.
- Import tests at the four benchmark sizes.
- Export and restore round-trip tests.
- SSR and client-bundle checks that prove the secret key cannot cross the server
  boundary.
- Focused UI flow tests for the changed path.
- `pnpm run check`, production build, `git diff --check`, and React Doctor after
  React implementation.
- Browser, keyboard, screen-reader, responsive, and rendered checks only after
  explicit permission.

Before replacing a mock path, run the old and new adapter contract suites with
the same fixtures and compare results. Treat a faster path as a failure if its
records differ.

## Open decisions for the next discussion

Phase 8A has no open product question. Verify its project, key, migration, and
runtime facts from the environment. Before each later slice, use the `grilling`
skill and ask the matching questions below one at a time.

Before Phase 8B:

- Email and password sign-up requires email confirmation before first sign-in.
  Production sign-in includes Google OAuth.
- Password recovery uses a complete in-app request, return, password-change, and
  result flow. The request response never reveals whether an account exists.
- Supabase may link Google to an existing user only when Google returns the same
  verified email. V1 keeps manual identity linking disabled, treats different
  emails as separate accounts, and does not merge libraries.
- Permanent account deletion requires fresh authentication with the current
  sign-in method after the user types `delete`. Failure or cancellation leaves
  the account unchanged. The server revokes active sessions as part of the
  deletion flow.
- Usernames remain non-unique display names. The authenticated user ID owns data
  and authorization. Any future public identity uses a separate normalized,
  unique handle.

Before Phase 8F:

- Decide whether quick save queues locally while the browser is offline, or
  fails with a preserved Retry action. Start with a preserved Retry action so
  the first release does not need a second durable client queue.
- Confirm whether every valid imported bookmark should enter the bulk
  enrichment queue. The researched recommendation is yes, with bounded worker
  capacity and no effect on import completion.
- Decide how Reway delivers favicon and OG-image bytes. The current plan stores
  source metadata URLs, but direct browser hotlinking is not locked. Research a
  bounded proxy or cache before choosing its privacy, storage, and expiry rules.

Before Phase 8G:

- Decide whether a user may run more than one mutating import at a time. Start
  with one active X or browser import per user, while allowing read-only export
  work to continue.
- Lock pause and cancel behavior after an HTML import has committed some rows.
  Start by keeping committed bookmarks, stopping new batches, and letting an
  in-flight transaction finish. Do not attempt a large rollback.
- Decide where root-level browser bookmarks go. Start with Uncollected.

Before Phase 8H:

- Lock initial export scope. Start with the whole library. Browser HTML omits
  Trash, while lossless Reway JSON includes Trash and its restore context.
- Decide what happens if the active library changes after restore validation
  but before activation. Start by blocking activation, rebuilding the preview,
  and asking for confirmation again.
- Decide whether users can restore the pre-restore recovery snapshot without
  operator help. Start with a user-owned recovery action that uses the same
  staged validation and confirmation rules.
- Set retention periods for import staging rows, generated exports, staged
  restores, and pre-restore recovery snapshots.
- Lock the Reway JSON schema and supported backward-migration window.

After the first local and hosted load runs, set latency budgets from measured
p50, p95, and p99 results. This is an evidence gate, not a product question to
answer before Phase 8A.

## Research basis

- [Supabase TanStack Start quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/tanstack)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [Supabase queue API](https://supabase.com/docs/guides/queues/api)
- [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase Realtime troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-postgres-changes-troubleshooting)
- [TanStack Start import protection](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection)
- [Linear delta-sync read path](https://linear.app/now/rebuilding-delta-sync-read-path)
- [Vercel queue concepts](https://vercel.com/docs/queues/concepts)
- [Karakeep import worker](https://github.com/karakeep-app/karakeep/blob/main/apps/workers/workers/importWorker.ts)
- [Karakeep queue definitions](https://github.com/karakeep-app/karakeep/blob/main/packages/shared-server/src/queues.ts)
- [Karakeep 0.33.1 release notes](https://github.com/karakeep-app/karakeep/releases/tag/v0.33.1)
- [Raindrop import behavior](https://help.raindrop.io/import)
- [Chrome bookmark import and export](https://support.google.com/chrome/answer/96816?hl=en)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
