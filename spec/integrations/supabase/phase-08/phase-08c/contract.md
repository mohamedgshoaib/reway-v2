# Phase 8C schema and security contract

## Status

- Approved on 2026-09-06.
- The Phase 8C grilling pass is complete.
- These decisions replace conflicting older technical notes in the feature
  contract and backend plan.
- No Phase 8C SQL or generated database type existed when this record was
  approved.
- The approved Phase 8F contract replaces only the favicon and OG-image URL
  storage choice below with tracked private asset references. It keeps the
  Phase 8C ownership, generation, cleanup, and bounded-work rules.

## Design rule

Phase 8C must keep database, network, memory, and browser work bounded at the
100,000-bookmark account target and the routine 10,000-bookmark import target.
Prefer measured costs, short transactions, indexed ownership checks, explicit
failure states, and race-safe writes. Do not add an abstraction, index, cache,
or partition without a query or measured load that needs it.

## Approved questions and answers

### 1. Library ownership

Use one implicit library per authenticated user. Store direct, indexed
`user_id` ownership. Do not add a user-facing `libraries` table.

### 2. Primary keys

Use UUIDs for `auth.users.id`, every `user_id`, client request IDs, idempotency
keys, and portable job references. Use `BIGINT GENERATED ALWAYS AS IDENTITY`
for database-local entities. Use compact composite primary keys on junction
tables where they fit.

### 3. Junction ownership

Store `user_id` directly on user-scoped junction rows. Use composite foreign
keys to prove that both linked records belong to that user.

### 4. Trash membership

Keep bookmark-collection membership rows while a bookmark is in Trash. Treat
them as dormant restore context. Active collection queries must exclude
trashed bookmarks. Deleting a collection removes its membership rows.

### 5. Collection and tag names

Store the display name and a database-generated normalized name. Normalization
trims outer whitespace, collapses repeated inner whitespace, and applies
Unicode-aware lowercase handling. Reject line and control characters. Enforce
`UNIQUE (user_id, normalized_name)` separately for collections and tags.
Collection names remain unique across both hierarchy levels.

### 6. Collection hierarchy

Keep matching application checks, but let Postgres enforce the one-child-tier
limit. Use same-user composite foreign keys, a self-parent check, short row
locks, and a trigger that prevents a child from becoming a parent or a parent
with children from becoming a child.

### 7. Exact URL lookup

Store the normalized URL and a generated SHA-256 fingerprint. Use a non-unique
B-tree index on `(user_id, url_fingerprint)`, then compare the full URL after a
fingerprint match. Duplicate bookmarks remain valid. Use `client_request_id`
for save idempotency. Before migration, confirm the target `digest` function is
valid in a generated expression and benchmark a 10,000-row insert. Fall back to
a maintained fingerprint column if that check fails.

### 8. Search projection

Use a separate, one-row-per-bookmark `bookmark_search` table with direct
`user_id`, combined searchable text, a stored `tsvector`, a full-text GIN
index, and a trigram GIN index. Maintain it in the same transaction as title,
URL, tag membership, and tag-name changes.

### 9. Search language

Use PostgreSQL's `simple` text-search configuration for mixed English, Arabic,
accented names, code terms, and domains. Weight title above tags and tags above
URL text. Use trigram matching for typo tolerance. Add accent or Arabic
diacritic folding only after search fixtures and benchmarks support it.

### 10. Workflow states

Use `TEXT NOT NULL` with named check constraints for workflow states. Do not use
native enums or numeric codes for states that will change as the backend grows.

### 11. Visit retention

Keep raw visit events for 30 days. They are recent history, not a permanent
source of truth. Keep the lifetime total permanently.

### 12. Visit writes

Keep one row per visit. Buffer visits for up to 30 seconds, then send one
multi-row insert. Give every visit a client-generated UUID and use
`ON CONFLICT DO NOTHING` for retry safety. A statement-level trigger with a
transition table groups inserted rows by bookmark and updates each counter once
per statement.

### 13. Visit statistics

Store the permanent count in a narrow `bookmark_stats` row with `bookmark_id`,
direct `user_id`, and `visit_count`. Use
`(user_id, visit_count DESC, bookmark_id)` for Most Visited queries. Do not
update the wide bookmark row for each visit flush.

### 14. Large-list loading

Use keyset pagination at the database and network layers. Use stable compound
cursors ending in the bookmark ID for every sort. Add TanStack Virtual list and
grid virtualization in the later UI slice. Pagination bounds database,
network, and memory work. Virtualization bounds mounted DOM work.

### 15. Concurrent ordering

Give every ordering scope an `order_version`. A reorder sends the version it
read. One short transaction locks that scope, validates its version and
neighbors, updates the moved item, and increments the version. Reject stale
requests and refetch. Rebalance under the same lock and version check.

### 16. Mutation shape

Allow direct RLS-protected mutations only for simple one-row changes. Use one
short database function for work that must change several rows as one product
action. Prefer `SECURITY INVOKER`. Keep any required privileged helper private,
set `search_path = ''`, revoke default execution, grant only the needed role,
and check ownership inside it. Do not hold a database lock during file, DNS, or
HTTP work.

### 17. Realtime transport

Use one private Broadcast channel per user, keyed by `library:<user_id>`. Do not
use Postgres Changes for library sync. Normal bookmark changes send compact
operation, bookmark ID, and monotonic row-version notices. Visit events,
statistics, search rows, and worker diagnostics do not broadcast. Imports,
restores, cleanup, and large set-based mutations suppress per-row notices and
send one `library_resync_required` notice after commit. Realtime remains a
notice path. Clients refetch after reconnects and known gaps.

### 18. Collection count

Keep a database-managed `collection_count` on `bookmarks`. A statement-level
trigger groups membership changes and updates each affected bookmark once.
Clients cannot write it. Active Uncollected queries use matching partial
indexes.

### 19. Bookmark metadata layout

Keep card fields on `bookmarks`: URL, URL fingerprint, title, normalized title,
favicon and OG-image asset references, metadata state, Trash dates, timestamps,
`collection_count`, and row version. Phase 8F moves source image URLs out of
browser bookmark rows and tracks private Storage objects with typed relational
data. Keep search and visit statistics in their approved narrow tables. Do not
store filter, sort, or constraint fields inside JSONB.

### 20. Profiles and preferences

Use one typed `profiles` row and one typed `dashboard_preferences` row per user.
Use checked columns for stable settings. Do not copy the Auth email. Auth user
metadata may supply display defaults but must never grant access. Do not use a
loose JSONB settings object in V1.

### 21. Fractional order keys

Store fractional keys as `TEXT` with `C` collation and enforce uniqueness in
each ordering scope. Use the item ID as the cursor tie-breaker. Request a
rebalance when a key exceeds 50 characters and keep a larger database limit as
a corruption guard. Apply reorder and rebalance through the versioned ordering
function.

### 22. Trash expiry

Store `trashed_at` and `purge_after`. Reads hide expired rows even before
physical cleanup. A scheduled task claims at most 100 expired bookmarks with
`SKIP LOCKED` and deletes them in one short transaction. Tune that batch from
measurements. Restore and purge lock the same bookmark so only one succeeds.

### 23. Data API access

Expose only user-facing tables, safe security-invoker views, and approved
functions. Keep search internals, jobs, staging data, snapshots, and trigger
helpers in a private schema. Grant `anon` no application-data access. Give
`authenticated` only the required operations and columns. Apply RLS to every
user-owned table. Expose job progress through a narrow read-only status
interface that omits leases, queue data, and internal errors.

### 24. Durable job tables

Use a narrow shared job header for import, export, and restore, with typed
detail tables for each kind. Keep high-volume enrichment requests separate.
Store indexed ownership, state, attempt, time, and version fields as typed
columns. JSONB may hold small versioned data that no query filters or sorts.

### 25. Worker claims

Use bounded claims, queue visibility timeouts, lease tokens, request
generations, and compare-and-set result writes. Commit a claim before external
work. Accept a result only when its job, generation, lease token, and running
state still match. Use `SKIP LOCKED` for repair work and consistent ID order
when locking several rows.

### 26. Enrichment queueing

An exposed security-invoker function inserts the bookmark and enrichment
request under RLS. A tightly granted private helper sends the Supabase Queue
message in the same database transaction. Use a unique request UUID and an
increasing bookmark generation. Retries return the existing result. An old
generation cannot update the bookmark.

### 27. Import staging and commit

Upload the source to a private Storage path and parse it into typed private
staging tables. Use bulk inserts or `COPY`. Commit collections first, then
bookmarks and memberships in idempotent batches. Start with 500 items per
import batch and tune through benchmarks. Import may use chunks because its
contract records one durable result per item and retries failed items.

### 28. File storage

Keep import, export, restore, recovery, and bookmark asset files in private
Supabase Storage. Postgres stores the owner, object path, format or generation,
checksum, byte size, state, and expiry or lifecycle link. Use user-prefixed
opaque paths and short-lived signed URLs. Track server-created objects even
when Storage does not assign a user owner. Do not store large files in Postgres.

### 29. Restore activation

Parse and validate outside the activation transaction. Create the pre-restore
recovery file first. Activation takes a user-scoped transaction lock and uses
set-based SQL to replace active rows, then sends one resync notice. Accept this
shape only after the 100,000-bookmark restore benchmark meets the lock and
write budget. If it fails, stop and review an internal generation model before
adding a generation key to normal queries.

### 30. Temporary-data retention

Use these initial limits:

- Raw visits and Trash: 30 days.
- Completed enrichment requests: 7 days.
- Import files and staging rows: 7 days after terminal state.
- Generated exports: 24 hours.
- Pre-restore recovery snapshots: 7 days, with at most two per user.
- Compact import, export, and restore job history: 30 days.
- Active or retryable work: until terminal.

Store indexed expiry times and clean each type in bounded transactions.

### 31. Normal bulk mutations

Add, move, remove, Trash, Restore, and Delete Forever use one set-based database
transaction so failure can roll back the full selected result. Benchmark
realistic selection sizes before setting a maximum. If a maximum is needed,
return for a product decision. Do not switch normal bulk work to partial
background chunks. Import remains separate because it has per-item results.

### 32. Index rules

Build indexes from real queries. Put `user_id` first for user-scoped paths,
equality columns before range and sort columns, and row ID last for stable
keyset pagination. Index every foreign key used by joins or cascades. Use
partial indexes for active, Trash, Uncollected, and pending-work paths. Use GIN
only for full-text and trigram search. Use a composite B-tree such as
`(user_id, tag_id, bookmark_id)` for normalized OR tag filtering. Do not
partition until measured event volume, cleanup, or vacuum cost requires it.

### 33. Phase 8C verification

Require local reset and migration replay; constraint, trigger, and function
tests; same-user success; cross-user and anonymous denial; exact grant tests;
race and retry tests; hot-query plans at 100,000 bookmarks; a 10,000-item import
benchmark; restore and cleanup failure tests; Broadcast suppression tests;
Supabase security and performance advisors; generated database types; static
checks; production builds; focused integration tests; and `git diff --check`.
Apply the remote migration only after the local database gates pass.

### 34. Account deletion with Storage

After fresh authentication and final confirmation, mark deletion pending and
block new writes. Revoke sessions. Remove every tracked Storage object through
the Storage API in batches of at most 1,000. Delete the Auth user last and let
foreign-key cascades remove relational rows. Make the flow idempotent and retry
until it finishes. Failure or cancellation before confirmed deletion changes
nothing. Once deletion starts, show pending status instead of promising a
rollback that Storage and Auth cannot provide together.

## Replaced proposals

- Do not keep raw visit events for 90 days. The approved period is 30 days.
- Do not aggregate repeated visits into one `visit_delta` event. Keep one row
  per visit and batch the insert.
- Do not store `visit_count` on `bookmarks`. Use `bookmark_stats`.
- Do not use Postgres Changes for library sync. Use private Broadcast.
- Do not add a scalar `tag_id` GIN index. Use the normalized junction's
  composite B-tree index.
- Do not split normal bulk mutations into partially committed background
  chunks. Keep them atomic or return for a product limit.

## Implementation gates

- Confirm `digest` can back the generated URL fingerprint in the target
  database and benchmark the 10,000-row write path before migration review.
- Benchmark restore activation with 100,000 bookmarks before accepting the
  set-based replacement design.
- Derive any normal bulk-selection limit from measurements and return for
  approval before changing the product contract.
- Keep Phase 8C limited to schema, RLS, grants, database functions, migrations,
  generated types, and their focused tests. Do not begin Phase 8D.
