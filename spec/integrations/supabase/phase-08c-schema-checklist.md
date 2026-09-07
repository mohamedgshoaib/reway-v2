# Phase 8C schema checklist

## Status

- Derived from the approved Phase 8C decisions on 2026-09-06.
- Phase 8C implementation completed on 2026-09-06.
- The user declined Docker. The repeatable local gate uses PGlite with
  `pgcrypto`, `pg_trgm`, Auth stubs, and Realtime stubs.
- Hosted checks use rollback-only fixtures and never retain test users or
  benchmark rows.

## Verified outcome

- Four hosted migrations created the core schema, added advisor-requested
  foreign-key indexes, added rebalance and retention functions, and corrected
  rebalance constraint lookup under a fixed function search path.
- The Docker-free check replays every migration, checks core constraints, RLS,
  grants, counters, search, Trash, and worker leases, then loads 100,000
  bookmarks and checks the hot-query plans. A separate fast test covers all
  three rebalance functions and stale-version rejection.
- The hosted rollback suite passed the same high-risk account, bookmark,
  hierarchy, visit, search, Trash, rebalance, worker, RLS, and anonymous-access
  paths.
- The hosted 10,000-row generated fingerprint benchmark completed in about
  1.97 seconds, then rolled back all rows.
- Supabase's performance advisor reports no unindexed foreign keys and no
  warning or error. Security findings are limited to intentional default-deny
  private tables and Supabase's pre-existing `rls_auto_enable` helper.
- Generated public database types live in
  `src/types/database.generated.ts`.

## Tables

### Public user data

- [ ] `profiles`: one row per Auth user, typed username and avatar source,
  account write state, timestamps, and row version. Do not copy Auth email.
- [ ] `dashboard_preferences`: one row per user with checked theme, view, sort,
  and navigation disclosure columns. Do not use a settings JSON object.
- [ ] `bookmarks`: database-local identity key, direct owner, request UUID,
  normalized URL, generated URL fingerprint, card metadata, Trash dates,
  collection count, enrichment generation, timestamps, and row version.
- [ ] `collections`: database-local identity key, direct owner, optional
  same-user parent, display and normalized names, checked icon and color,
  fractional order key, child and bookmark order versions, timestamps, and row
  version.
- [ ] `tags`: database-local identity key, direct owner, display and normalized
  names, checked color, fractional order key, timestamps, and row version.
- [ ] `bookmark_collections`: direct owner, compact composite key, same-user
  links, and collection-local fractional order key. Keep rows while a bookmark
  is in Trash.
- [ ] `bookmark_tags`: direct owner, compact composite key, and same-user links.
- [ ] `bookmark_events`: one row per visit with a database identity key, retry
  UUID, direct owner, bookmark link, and event time.
- [ ] `bookmark_stats`: one narrow row per bookmark with direct owner and the
  permanent visit count.

### Private data

- [ ] `bookmark_search`: one row per bookmark with direct owner, weighted
  searchable text, and a stored `simple` search vector.
- [ ] `enrichment_requests`: separate high-volume request records with stable
  request UUID, idempotency UUID, bookmark generation, state, attempts, lease,
  safe error fields, expiry, timestamps, and row version.
- [ ] `transfer_jobs`: shared import, export, and restore header with a portable
  UUID, owner, checked kind and state, request UUID, attempt and lease fields,
  progress counts, expiry, timestamps, and row version.
- [ ] `import_job_details`, `export_job_details`, and `restore_job_details`:
  typed one-to-one job detail rows.
- [ ] Typed import staging tables for collections, bookmarks, collection
  memberships, and tag memberships, keyed by job and stable source item.
- [ ] `stored_files`: tracked private Storage objects with owner, job, purpose,
  object path, format version, checksum, byte size, state, and expiry.
- [ ] `restore_snapshots`: recovery-file metadata with at most two retained rows
  per user after cleanup.

## Constraints

- [ ] Use UUIDs only for Auth ownership, client requests, idempotency, portable
  jobs, event retry IDs, generations where needed, and lease tokens.
- [ ] Use `BIGINT GENERATED ALWAYS AS IDENTITY` for database-local entities.
- [ ] Add `NOT NULL` to every required value and use `TIMESTAMPTZ` for time.
- [ ] Add `(user_id, id)` unique keys to every entity referenced by a same-user
  composite foreign key.
- [ ] Prove junction ownership with composite foreign keys to both linked rows.
- [ ] Cascade Auth user deletion through all relational user data.
- [ ] Keep collection membership on Trash. Cascade membership only when its
  bookmark or collection is deleted.
- [ ] Normalize collection and tag names in generated columns by trimming outer
  whitespace, collapsing inner whitespace, and lowercasing with the database's
  Unicode rules.
- [ ] Reject empty names, names over 24 characters, and names containing line or
  control characters.
- [ ] Enforce separate `(user_id, normalized_name)` uniqueness for collections
  and tags.
- [ ] Enforce collection self-parent rejection and same-user parentage.
- [ ] Enforce the two-tier hierarchy with a race-safe trigger and short locks.
- [ ] Use named text-state checks for metadata, account, job, request, file, and
  avatar states.
- [ ] Require `purge_after > trashed_at` when a bookmark is in Trash and require
  both values to be null for active rows.
- [ ] Protect `collection_count`, visit totals, generations, versions, leases,
  and internal error details from direct client writes.
- [ ] Store fractional keys with `COLLATE "C"`, a database corruption limit,
  and per-scope uniqueness. The client requests rebalance after 50 characters.
- [ ] Keep duplicate bookmark URLs valid. Enforce save retry safety with
  `(user_id, client_request_id)` uniqueness.
- [ ] Enforce one enrichment request per bookmark generation and one durable
  result per stable job item.
- [ ] Keep detail rows consistent with their transfer job kind.
- [ ] Validate small versioned JSON only where no query filters or sorts it.

## Indexes

- [ ] Install `pg_trgm` in the `extensions` schema. Use the existing `pgcrypto`
  extension for SHA-256.
- [ ] Start each user-scoped access index with `user_id`.
- [ ] Index every foreign key used for joins or cascades.
- [ ] Add stable keyset indexes ending in bookmark ID for date, title, and visit
  sorts.
- [ ] Add active bookmark partial indexes that exclude Trash and expired Trash.
- [ ] Add the Uncollected partial index on active rows with
  `collection_count = 0`.
- [ ] Add the Trash cleanup index on `(purge_after, id)` for expired rows.
- [ ] Add `(user_id, url_fingerprint)` and compare the full normalized URL after
  a fingerprint match.
- [ ] Add `(user_id, tag_id, bookmark_id)` for OR tag filtering.
- [ ] Add collection-local order, collection sibling order, and tag order
  indexes with stable ID tie-breakers.
- [ ] Add `(user_id, visit_count DESC, bookmark_id)` for Most Visited.
- [ ] Add recent visit and retention cleanup indexes by owner, bookmark, time,
  and stable ID.
- [ ] Add GIN indexes only for the stored search vector and trigram text.
- [ ] Add partial claim and expiry indexes for pending jobs, requests, staging,
  files, snapshots, and terminal history.
- [ ] Do not partition any table until measured event volume, cleanup, or vacuum
  cost needs it.

## Functions

- [ ] Keep public callable functions small. Prefer `SECURITY INVOKER`.
- [ ] Put any required `SECURITY DEFINER` helper in the private schema, set
  `search_path = ''`, check the caller's Auth user inside it, revoke default
  execution, and grant only the required wrapper or role.
- [ ] Add race-safe collection create and parent-change functions with ordered
  row locks and hierarchy validation.
- [ ] Add version-checked reorder and rebalance functions for root collections,
  child collections, tags, and bookmarks in one collection.
- [ ] Add atomic set-based Add, Move, Remove, Trash, Restore, and Delete Forever
  functions. Do not set a selection limit without measured evidence and product
  approval.
- [ ] Add bookmark creation with request idempotency, one enrichment generation,
  and the matching enrichment request in one transaction. Queue transport work
  stays behind a tightly granted private helper.
- [ ] Add compare-and-set worker claim and result functions that check state,
  generation, and lease token.
- [ ] Add bounded cleanup functions for at most 100 expired Trash rows and
  bounded batches of expired visits, requests, staging rows, files, snapshots,
  and job history.
- [ ] Add a narrow read-only transfer status function or view that omits leases,
  queue data, private paths, and internal errors.
- [ ] Add one private custom Broadcast helper for compact bookmark notices and
  one resync notice for bulk work.

## Triggers

- [ ] Create the profile and preference rows when an Auth user is created, or
  document the idempotent first-use function if Auth trigger ownership blocks a
  safe implementation.
- [ ] Increment row versions and update timestamps without trusting client
  input.
- [ ] Enforce the collection depth rule under concurrent parent changes.
- [ ] Maintain `bookmarks.collection_count` with separate statement-level insert
  and delete triggers using transition tables.
- [ ] Maintain `bookmark_stats` with one statement-level insert trigger over new
  visit rows. Duplicate `event_id` rows must not increase the count.
- [ ] Maintain `bookmark_search` in the same transaction as bookmark title and
  URL changes, tag membership changes, and tag-name changes.
- [ ] Broadcast only normal bookmark insert, update, and delete notices. Suppress
  per-row notices for bulk work and emit one `library_resync_required` notice.

## Grants and RLS

- [ ] Grant `anon` no application table, sequence, view, or function access.
- [ ] Enable and force RLS on every public user-owned table before granting
  access.
- [ ] Use separate authenticated policies by operation. Wrap `auth.uid()` in a
  scalar subquery, include indexed owner checks, and put owner checks in both
  `USING` and `WITH CHECK` for updates.
- [ ] Block new writes when the owner's account state is deletion pending.
- [ ] Grant authenticated users only the table operations and columns required
  for direct one-row actions.
- [ ] Grant sequence usage only where direct inserts need identity values.
- [ ] Keep private search, job, staging, file, snapshot, and trigger tables out
  of the Data API. Revoke direct access from `PUBLIC`, `anon`, and
  `authenticated`.
- [ ] Revoke default function execution from `PUBLIC`, then grant each approved
  public function by exact signature.
- [ ] Add one `realtime.messages` select policy for authenticated users where
  `realtime.topic() = 'library:' || auth.uid()` and the extension is Broadcast.
- [ ] Do not grant clients permission to send on the library Broadcast channel.
- [ ] Do not alter objects in the locked `realtime` schema apart from the
  supported `realtime.messages` RLS policy.

## Retention

- [ ] Raw bookmark events and Trash rows: 30 days.
- [ ] Completed enrichment requests: 7 days.
- [ ] Import files and staging rows: 7 days after terminal state.
- [ ] Generated exports: 24 hours.
- [ ] Pre-restore snapshots: 7 days and at most two per user.
- [ ] Compact terminal transfer history: 30 days.
- [ ] Active and retryable work: no expiry until terminal.
- [ ] Keep each cleanup transaction bounded and use `FOR UPDATE SKIP LOCKED` in
  stable ID order.

## Tests and measurements

- [ ] Reset the local database and replay all migrations from empty state.
- [ ] Verify generated name normalization with English, Arabic, accents,
  repeated whitespace, line breaks, control characters, and length edges.
- [ ] Verify same-user access and anonymous and cross-user denial for every
  exposed table and function.
- [ ] Verify exact table, column, sequence, view, schema, and function grants.
- [ ] Verify composite ownership foreign keys reject mixed-user junction rows.
- [ ] Verify hierarchy depth, self-parent, concurrent parent changes, and
  create or rename races.
- [ ] Verify request idempotency, duplicate URLs, retry results, stale versions,
  stale worker generations, lease mismatches, and terminal compare-and-set
  behavior.
- [ ] Verify collection-count updates for multi-row insert and delete statements.
- [ ] Verify repeated visit UUIDs do not increment totals and one batch updates
  each bookmark statistic once.
- [ ] Verify search rows update for bookmark, membership, and tag-name changes.
- [ ] Verify Trash restore versus purge and cleanup versus worker races.
- [ ] Verify normal bulk work is atomic and bulk Broadcast suppression emits one
  resync notice.
- [ ] Verify private tables and private paths never appear in the narrow job
  status interface.
- [ ] Prove the hosted `extensions.digest` overload used by the generated URL
  fingerprint is immutable. Then benchmark the generated column with a
  10,000-row insert before accepting it.
- [ ] Run hot-query plans with one 100,000-bookmark user. Cover active list,
  Trash, Uncollected, collection membership, OR tags, exact URL, search, Most
  Visited, jobs, and cleanup claims.
- [ ] Run the routine 10,000-item import benchmark with the first 500-item batch
  size and record query plans and timings.
- [ ] Run Supabase security and performance advisors.
- [ ] Generate `src/types/database.generated.ts` only after the schema and local
  database tests pass.
- [ ] Run focused integration tests, `pnpm run check`, both production builds,
  a client-bundle secret scan, and `git diff --check`.
- [ ] Apply the hosted migration only after all local database gates pass, then
  recheck migration history, tables, RLS, grants, and advisors.

## Cost bounds

- Name normalization, row checks, and one-row edits are constant-time per row.
- Batched membership, visit, search, cleanup, and bulk mutation work is linear
  in the rows in that request, with grouped writes per affected bookmark.
- Indexed user, bookmark, membership, job, and cursor lookups are logarithmic
  in the matching table size plus the returned rows.
- Reorder changes one item and one scope version in the normal path. Rebalance
  is linear in that scope and runs only after the client sees a key over 50
  characters.
- Cleanup memory and lock cost stay bounded by the claim size. Network and
  browser work stay bounded by keyset page size.
