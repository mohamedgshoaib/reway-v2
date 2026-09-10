# Phase 8F capture and enrichment decisions

## Status

- Approved on 2026-09-08.
- The Phase 8F decision pass is complete.
- Implementation started on 2026-09-08.
- Implementation-order steps 1 through 7 are complete. Step 9 started as a
  guarded activation and the live Edge worker missed three approved gates.
  Step 8 is now required before step 9 can resume. Step 10 has not started.
- These decisions replace conflicting Phase 8F notes in the feature contract
  and backend plan.

## Product rule

Judge Phase 8F by whether it makes capture durable, fast, immediate,
optimistic, and predictable. Do not reject useful work only because it adds
more than an early release would need.

Earlier technical choices may change when current evidence or benchmarks show
that they block this rule. Record each replacement in the active decision
files before code relies on it. Keep the private-library, user-ownership,
bounded-work, and explicit-security rules unless the user changes them.

## Phase boundary

Phase 8F implements:

- URL recognition and normalization for quick save.
- A durable browser outbox for quick saves that cannot reach the server.
- Idempotent bookmark creation and uncertain-response reconciliation.
- Interactive and bulk metadata handlers behind the Phase 8E worker interface.
- Bounded page, favicon, and OG-image fetching with SSRF protection.
- Private cached bookmark assets and bounded signed delivery.
- Immediate worker wakes, scheduled recovery, metrics, and performance gates.

Phase 8F does not parse or commit imports, build export or restore behavior,
wire Realtime reconciliation, replace the visible dashboard mock, or start
Phase 8G. Phase 8G will publish imported bookmarks to the bulk enrichment path
that Phase 8F prepares.

## Sources checked

- `spec/integrations/features/feature-contract.md` for product behavior.
- `phase-08-backend-plan.md` for the Phase 8 order and shared performance rules.
- `phase-08c-schema-decisions.md` for ownership, storage tracking, requests,
  generations, retention, and database security.
- `phase-08d-domain-decisions.md` for the library interface and mock boundary.
- `phase-08e-durable-jobs-decisions.md` for queues, leases, attempts, repair,
  wake security, and the framework-free worker interface.
- Current Supabase documentation for Storage delivery, signed URL caching,
  Edge Function limits, and WASM image processing.
- Current browser documentation for IndexedDB transactions, persistent storage,
  eviction, and Background Sync support.
- Public Auorum, Recollect, Alam, Shiori, Karakeep, and Raindrop material for
  capture, import, basic enrichment, and cached preview behavior.
- The user's 50-bookmark tests in Auorum, Recollect, Alam, and Shiori as the
  product experience target. Their private implementations are not known.

## Approved decisions

### 1. Durable offline quick save

Quick save uses a durable client outbox. It does not reduce an offline save to
an in-memory Retry action.

- Parse and normalize the URL without a network request.
- Create one stable client request ID before the first local or server write.
- Write the normalized save to IndexedDB before closing the command.
- Request persistent browser storage. If the browser denies it, keep the
  IndexedDB record but describe it as queued on this device. Do not claim that
  browser-managed storage cannot be cleared.
- Treat `navigator.onLine` only as a wake hint. It never proves that Supabase is
  reachable and never decides whether a save is allowed.
- Drain after enqueue, application start, authenticated session recovery,
  network return, and tab focus. Background Sync may add another wake where the
  browser supports it, but correctness cannot depend on it.
- Keep outbox entries across reload and browser restart until the server
  confirms or reconciles the save.
- Use the same client request ID for every attempt. If the response is
  uncertain, look up that request ID before another create call.
- Remove an outbox entry only after the server returns or reconciles the
  matching durable bookmark, or after the user explicitly dismisses a
  permanent failed entry. A permanent rejection moves the entry to
  `save_failed` and does not disappear by itself.
- Never delete an older queued save to make room for a newer one. If a measured
  item or byte cap is reached, preserve existing entries and reject the new
  local write with clear recovery guidance.

The outbox is scoped to the authenticated subject known when the user saves.
The server still derives ownership from the authenticated session and ignores
the stored subject as authority.

- A matching signed-in subject may drain its entries.
- A missing session pauses delivery and preserves the entries.
- A different signed-in subject cannot view, claim, send, or delete the prior
  subject's entries through the normal outbox interface.
- Account deletion clears the deleted account's browser outbox only after the
  server confirms deletion. Signing out alone does not silently destroy queued
  captures.

Use one client outbox module with a small interface. Keep IndexedDB operations,
schema upgrades, transactional claims, multi-tab leases, retry timing, and
recovery inside it. React and route code consume state and commands from that
interface instead of implementing queue rules.

### 2. Quick-save persistence states

Quick save has four persistence states:

- `queued_offline`: IndexedDB has the save, but Postgres has not confirmed it.
- `saving`: a client owns a bounded delivery attempt.
- `saved`: Postgres returned or reconciled the durable bookmark.
- `save_failed`: a permanent local or server rule rejected the save, or browser
  storage could not preserve it.

Metadata still has its separate `pending`, `enriched`, or `failed` state. Never
show metadata pending as proof that bookmark persistence succeeded.

When the active destination can show the bookmark, render the local candidate
at once. When it cannot, keep the destination and announce the truthful save
state. `Saved to Uncollected. Metadata pending.` applies only after Postgres
confirms the save. Offline feedback names the on-device queue instead.

### 3. Online save and reconciliation

The online path keeps the existing transactional server contract:

1. Normalize locally and persist the outbox entry.
2. Show local feedback at once.
3. Call the checked bookmark-create function with the stable request ID.
4. Insert the bookmark, enrichment request, and interactive queue message in
   one database transaction.
5. Return the bookmark without waiting for metadata.
6. Mark the local entry saved and remove it from the outbox.

An uncertain response first queries by client request ID. Retry creates no
duplicate bookmark, request, or queue message.

### 4. Bulk enrichment coverage

Every valid imported bookmark receives a durable enrichment request and enters
the bulk enrichment queue.

- Import completion waits for durable bookmark and queue publication, not
  metadata fetching.
- Every bookmark keeps its own request generation and result state.
- View mode never changes whether a bookmark receives title, favicon, and
  OG-image enrichment.
- Exact duplicate URLs inside one user-owned import may share one in-flight
  fetch. The worker applies the checked result to each separate bookmark.
- Do not share an in-flight fetch, stored asset, or cache entry across users.
- A metadata failure never changes a successful import into a partial import.
- Interactive and bulk work use separate capacity. Interactive traffic may
  pass bulk work, while bulk work retains measured minimum progress.

Phase 8F implements and verifies both enrichment handlers. Phase 8G owns the
import producer and its durable item results.

### 5. Private cached bookmark assets

Reway fetches and stores bounded favicon and OG-image bytes. The browser never
hotlinks the source metadata URL.

- The worker resolves image URLs against the final page URL and runs them
  through the same SSRF checks as the page request.
- Validate the actual byte signature, declared type, byte count, decoded pixel
  count, and animation frame count before storing an asset.
- Convert accepted input to one bounded static raster derivative and strip
  embedded metadata. Do not serve source SVG, animated content, or unknown
  bytes directly.
- Store the derivative in private Supabase Storage under an opaque,
  user-scoped, immutable path tied to the bookmark generation.
- Track owner, bookmark, generation, kind, object path, checksum, content type,
  dimensions, byte size, state, and timestamps in Postgres.
- Store asset references in bookmark data. Do not store signed URLs in
  Postgres, exports, backups, queue messages, logs, or browser persistence.
- A missing or rejected favicon or OG image produces a valid null field. A
  valid title does not fail because an image failed.
- A failed Re-enrich keeps the last good assets. A successful Re-enrich first
  stores the new assets, atomically switches the checked generation, then
  schedules replaced objects for durable deletion.
- Trash retains bookmark assets. Delete Forever and account deletion remove
  every tracked object through bounded, idempotent Storage cleanup.

Do not add a broad cross-user asset cache. Within-user persistent deduplication
requires measured duplicate storage before it adds another reference-counting
rule. The approved in-flight duplicate fetch remains allowed.

### 6. Signed asset delivery

- Sign only assets owned by the authenticated user.
- Sign favicon URLs for the bounded loaded page. Sign OG-image URLs only when
  the active view needs them.
- Batch signing so one page does not issue one server request per image.
- Reuse the exact signed URL until close to expiry. Generating a new token for
  every render prevents useful CDN cache reuse.
- Keep browser cache duration no longer than the signed access period.
- Use immutable object paths for new generations. Do not overwrite a path and
  wait for distributed cache invalidation.
- Delete the object when access must end. Token expiry alone does not revoke a
  response already held by a cache.
- Paid Supabase image transformations may improve delivery, but Phase 8F does
  not depend on them for correctness or acceptable speed.

### 7. Fetch and SSRF module

Keep every outbound page and image request behind one framework-free fetch
module with an injected network adapter.

- Permit HTTP and HTTPS only.
- Reject embedded credentials and disallowed ports.
- Resolve every hostname and reject local, private, link-local, multicast,
  reserved, and cloud-metadata addresses for IPv4 and IPv6.
- Pin the validated destination for the connection. A DNS check followed by an
  unpinned hostname fetch is not sufficient.
- Disable automatic redirects. Resolve, validate, and pin every redirect target
  before following it.
- Bound DNS, connect, header, body, redirect, decode, and total duration work.
- Stream responses through byte limits. Do not buffer an unbounded body.
- Treat malformed content, unsupported types, limit violations, and unsafe
  destinations as permanent failures.
- Treat temporary DNS, connection, timeout, rate-limit, and selected server
  failures as transient within the Phase 8E three-attempt policy.
- Do not store upstream response bodies, URLs, IP addresses, or raw errors in
  logs or public state.

If the Supabase Edge runtime cannot pin destinations or meet the approved
resource and latency gates, run the same handler on a dedicated worker runtime.
Keep the Phase 8E queues, claims, leases, attempts, repair, and worker interface
unchanged.

### 8. Fast import experience

A user importing 50 bookmarks does not wait for 50 remote sites.

1. Phase 8G parses and commits the 50 selected bookmarks in one current
   500-item import batch.
2. The database stores the bookmarks, enrichment requests, and bulk queue
   messages before it reports import success.
3. The client opens the imported collection with URL-derived titles and domain
   fallbacks as soon as the durable commit returns.
4. A best-effort post-commit wake starts the bulk consumer at once. The
   independent schedule remains the recovery path.
5. Queue order follows the imported display order so the first visible page
   receives metadata first.
6. Bounded concurrent fetches let fast hosts finish without waiting for one
   slow or rate-limited host.
7. Each completed bookmark replaces its fallback quietly. Import has no
   metadata progress modal, full-page spinner, or completion gate.

The implementation must match this result rather than copy a competitor's
unknown internal design.

### 9. Initial performance gates

Use a controlled hosted 50-link fixture to separate Reway overhead from remote
site variance. These are internal acceptance gates, not public latency claims.

- Phase 8F's rollback fixture publishes 50 bookmarks, enrichment requests, and
  bulk queue messages within 1 second at p95. Phase 8G must meet the same
  one-second p95 end-to-end response after parsing and review.
- Eligible queue wait below 250 milliseconds at p95 under normal measured load.
- First 12 visible bookmarks enriched within 2 seconds at p95.
- All 50 basic metadata results and cached assets settled within 10 seconds at
  p95.
- A slow host occupies only its bounded work slot and does not delay unrelated
  hosts.
- Interactive work retains its measured latency target while the bulk queue is
  busy, and bulk work keeps its reserved minimum progress.

Record p50, p95, and p99 for local feedback, persistence, queue wait, DNS,
connect, page fetch, image fetch, decode, Storage upload, database commit, and
total enrichment. Run cold and warm asset-delivery checks.

If the Edge Function misses these gates because of its CPU, memory, network, or
connection-control limits, change the enrichment runtime before activating the
producer. Do not loosen SSRF protection, remove asset validation, or make the
user wait for metadata to preserve the chosen runtime.

### 10. Starting safety bounds

Treat these as reviewed starting caps. Benchmarks may lower them. Raising them
requires evidence that security, resource, and latency gates still pass.

- Normal bookmark URL: at most 8,192 characters after normalization.
- Redirects: at most three per page or image request.
- HTML response body: at most 2 MiB.
- Favicon source: at most 512 KiB.
- OG-image source: at most 5 MiB.
- Decoded image: at most 20 megapixels and one stored static frame.
- Stored favicon derivative: at most 64 by 64 pixels and 32 KiB.
- Stored OG derivative: at most 1,200 by 630 pixels and 256 KiB.
- Browser outbox: at most 1,000 queued quick saves and 16 MiB per user on one
  device.

The fetch module must expose all time and concurrency settings as validated
configuration. The first hosted load run sets their production values. Keep a
global concurrency cap, a lower per-host cap, and separate interactive and bulk
budgets.

### 11. Service wake authentication

The database wake calls the worker without a signed-in user. Deploy the
`durable-worker` Edge Function with the platform `verify_jwt` check disabled and
authenticate each request inside the handler with the separate random wake
token.

- Keep the publishable project key in the `apikey` header. It identifies the
  project but does not authorize the worker action.
- Keep the wake token only in Supabase Vault and Edge Function secrets. Compare
  its digest in constant time before parsing the queue request or creating a
  privileged database client.
- Reject a missing or wrong wake token. Accept only the two enabled enrichment
  queue names and a bounded request body.
- Do not use a user JWT for scheduled work. Do not use a secret or service-role
  key as the wake credential. Do not use the legacy anonymous JWT to preserve a
  platform check that does not match this service-to-service call.

This matches current Supabase guidance for functions called without a user JWT.
It avoids an expiring user session, a deprecated legacy key dependency, and an
over-privileged wake credential. The worker still uses its server-only database
secret after the wake token passes, while existing database functions, queue
claims, generations, leases, and grants limit what that client may do.

After this decision, set the Vault worker URL and publishable key, deploy the
enabled worker with `verify_jwt` disabled, prove missing and wrong tokens fail,
then run the live queue-wait and complete worker-path gates. Restore the dormant
worker and perform step 8 if an activation gate fails.

## Complexity contract

- URL parsing and normalization cost `O(U)` time and memory for URL length `U`,
  bounded by 8,192 characters.
- Outbox enqueue, claim, state change, and deletion use indexed keys and bounded
  transactions. One drain loads at most its configured batch.
- Import publication costs `O(N)` for `N` selected records and keeps database
  work bounded by the existing 500-item batch.
- Enrichment performs `O(H)` remote page fetches for `H` unique URLs. Bounded
  concurrency `C` makes ideal wall time approach `O(H / C)` while per-host
  limits protect source sites.
- Worker memory stays `O(C * B)`, where `B` is the largest permitted buffered
  response or image decode budget. It never holds all import responses.
- Signing and mapping assets cost `O(P)` for loaded page size `P`, normally 48
  and never above 96.
- Storage use stays `O(A * S)` for asset count `A` and bounded derivative size
  `S`. Record real storage and cached egress per successful enrichment.

## Verification contract

- Pure URL fixtures cover complete and scheme-less addresses, whitespace,
  credentials, ports, malformed input, local targets, IPv4, IPv6, Unicode
  hosts, and maximum length.
- Outbox tests cover atomic enqueue, reload recovery, storage failure,
  persistence denial, multi-tab claims, lease expiry, account mismatch,
  uncertain response, idempotent reconciliation, capacity, and deletion.
- Fetch tests cover every blocked address class, DNS rebinding, pinned
  connections, redirects, header and body limits, compression expansion,
  content types, timeouts, aborts, rate limits, and retry classes.
- Parser tests cover titles, relative metadata URLs, base URLs, malformed HTML,
  missing fields, duplicate fields, large fields, and supported encodings.
- Asset tests cover byte signatures, rasterization, metadata stripping,
  decompression bombs, animated files, invalid images, exact size caps,
  immutable replacement, signed delivery, expiry, and cleanup.
- Worker tests cover interactive and bulk queues, duplicate messages, stale
  generations, crashes, heartbeat failure, retry exhaustion, host isolation,
  and guaranteed bulk progress.
- The hosted 50-link benchmark uses rollback-only bulk publication fixtures in
  Phase 8F and must pass the applicable p95 targets before the first handler is
  enabled. Phase 8G reruns the one-second gate through its real import path.
- Run one hosted rollback smoke for checked database and queue behavior, one
  private Storage lifecycle smoke, and one final security and performance
  advisor pass.
- Run focused tests after each implementation slice. At the checkpoint run
  `pnpm run check`, the relevant database gates, both production builds, the
  client secret-name scan, and `git diff --check`.
- Run React Doctor only if React files change. Browser, keyboard, touch,
  screen-reader, contrast, and screenshot checks still need explicit
  permission.

## Implementation order

1. Add the pure URL and SSRF policy modules with injected DNS and connection
   adapters. Prove destination pinning in the intended runtime before any live
   fetch.
2. Add the browser outbox interface, in-memory adapter, IndexedDB adapter,
   transactional multi-tab claims, recovery, and focused tests.
3. Extend the library domain commands and both adapters for idempotent quick
   save, request-ID reconciliation, and manual Re-enrich.
4. Add one reviewed migration for URL bounds, tracked bookmark assets, checked
   asset replacement and cleanup state, signing access, and any missing quick
   save or worker functions. Replay and test it locally before hosted apply.
5. Add bounded page parsing, metadata URL resolution, image validation, static
   derivative creation, and private Storage upload behind injected interfaces.
6. Add interactive and bulk enrichment handlers through the existing
   `runDurableWorker` interface. Keep queue settings separate.
7. Add immediate and scheduled wakes, configure the wake token without
   recording it, and run the hosted 50-link and resource benchmarks.
8. If Edge Functions miss the gates, move the handler implementation to a
   measured dedicated runtime without changing the durable worker interface.
9. Apply the reviewed migration once, regenerate hosted public types, run the
   hosted rollback, Storage, advisor, build, test, and secret-scan gates, then
   record the implementation result.
10. Stop before Phase 8G and before visible mock replacement.

## First implementation checkpoint

- Added pure HTTP URL normalization with the 8,192-character bound,
  scheme-less HTTPS prefixing, ASCII host normalization, protocol-default port
  checks, and rejection of credentials, local names, malformed hosts, and
  unsafe literal IP addresses.
- Added one SSRF policy module with injected DNS and connection adapters. It
  rejects invalid, non-public, mixed-safe DNS results, limits one resolution to
  16 addresses, passes only a checked IP to the connection adapter, and checks
  the connected peer address.
- Added a Deno adapter that resolves both IP families, opens TCP to the checked
  IP, and then starts TLS with the original host name and HTTP/1.1 ALPN. The
  dormant worker now fails during boot if the hosted runtime lacks any required
  low-level operation.
- Deployed the still-dormant worker with JWT verification on. Its hosted boot
  check passed without enabling a queue, setting a wake token, opening an
  outbound connection, or fetching a page.
- The focused URL, IP, SSRF, Deno adapter, and worker-wake run passes 93 tests
  across five files. `pnpm run check`, both production builds, the client
  secret-name scan, and `git diff --check` pass.
- URL parsing costs `O(U)` time and memory for bounded input length `U`. DNS
  checks and connection fallback cost `O(A)` time and memory for at most 16
  addresses. IP range and peer checks use fixed-size address data.
- No outbox, library command, adapter change, migration, metadata parser, asset
  work, queue handler, wake schedule, live fetch, or Phase 8G work started.

## Second implementation checkpoint

- Added one framework-free quick-save outbox interface with `read` and `mutate`
  methods. Its command union owns enqueue, claim, settle, failed-entry dismissal,
  and confirmed-account-deletion cleanup.
- Added matching in-memory and IndexedDB adapters. IndexedDB version 1 stores
  entries and per-subject capacity totals in one database and uses indexed,
  read-write transactions for multi-tab claims and expired-lease recovery.
- Kept the approved `queued_offline`, `saving`, `saved`, and `save_failed`
  states separate from metadata state. A confirmed save returns `saved` and
  removes the stored entry in the same transaction.
- Preserved one client request ID across every attempt. An uncertain response
  changes the next action to `reconcile`, and reload recovery keeps that action.
- Missing identity returns no readable or claimable work. Every other operation
  uses the authenticated subject key, so another subject cannot read, claim,
  settle, dismiss, or clear the entry through the normal interface.
- Enforced the approved per-subject limits of 1,000 entries and 16 MiB with
  atomic totals. Existing entries remain when a new write exceeds either cap.
- The starting claim batch is 10, the starting lease is 30 seconds, and local
  retry delay starts at one second with stable jitter and a five-minute cap.
  These values remain internal settings for later measurement.
- The browser adapter requests persistent storage once per adapter. A denial
  keeps the IndexedDB entry and reports `best_effort`. An IndexedDB failure
  reports `storage_unavailable` and never claims that the save is durable.
- Added pinned `fake-indexeddb` 6.2.5 as a test-only dependency. It does not
  enter the client or server production bundle.
- The focused URL, IP, SSRF, outbox, Deno adapter, and worker-wake run passes
  112 tests across seven files. `pnpm run check`, both production builds, the
  client secret-name scan, and `git diff --check` pass.
- Browser-backed IndexedDB, persistence, and multi-tab checks remain unrun
  because browser verification still needs explicit permission.
- Enqueue, exact state changes, and deletion use constant-count indexed work.
  One claim loads at most twice its batch and costs `O(B log B)` time and
  `O(B)` memory for batch size `B`, capped at 50. A subject read or clear costs
  `O(N log N)` or `O(N)` for at most 1,000 entries.
- No library command, Supabase adapter change, migration, metadata parser,
  asset work, queue handler, wake schedule, live fetch, UI wiring, or Phase 8G
  work started.

## Third implementation checkpoint

- Extended `LibraryAdapter` with quick save, client request reconciliation, and
  manual Re-enrich operations. The existing bookmark result shape remains the
  only mutation result for these commands.
- Added matching in-memory behavior. One client request ID creates at most one
  bookmark, different request IDs may save the same URL, and reconciliation
  returns the matching bookmark or `null`.
- Quick save uses the Phase 8F URL policy, keeps the original creation time,
  creates an Uncollected bookmark with pending metadata, and rejects invalid
  request IDs, unsafe URLs, and timestamps outside the JavaScript date range.
- Manual Re-enrich keeps the last good metadata while it marks the bookmark
  pending. Repeating one key does not advance the in-memory generation twice,
  and Trash returns the existing stable not-found error.
- Added one Supabase capture module behind the library adapter. It uses the
  existing atomic `create_bookmark` and `request_bookmark_reenrichment`
  functions, selects the authoritative bookmark with stats, and reconciles by
  the user-scoped `client_request_id` index under RLS.
- No migration or hosted mutation was needed for this step. Step 4 remains the
  first reviewed migration for asset tracking, URL bounds, cleanup state, and
  any database gaps found in that review.
- The focused library contract and adapter run passes 29 tests across three
  files. The Phase 8F focused run passes 141 tests across ten files. The Phase
  8D and 8E database checks, `pnpm run check`, both production builds, the
  client secret-name scan, and `git diff --check` pass.
- React Doctor does not apply because this step changes no React file. The
  browser checks from step 2 remain unrun because browser verification still
  needs explicit permission.
- In-memory request lookup and Re-enrich replay use average `O(1)` map access.
  New mock bookmark IDs use the existing `O(N)` scan over the bounded in-memory
  fixture. Supabase lookups and inserts use indexed `O(log N)` database work
  with a constant number of network calls.
- No migration, metadata parser, asset work, queue handler, wake schedule, live
  fetch, UI wiring, or Phase 8G work started.

## Fourth implementation checkpoint

- Added the reviewed `phase_08f_bookmark_assets` migration. It remains local
  and has not changed the hosted project.
- Added the 8,192-character database bound for normalized bookmark URLs. The
  exact bound passes and the next character fails.
- Added one private `bookmark-assets` Storage bucket for JPEG, PNG, and WebP
  derivatives. It is private and rejects objects above the 256 KiB OG-image
  derivative cap.
- Added `private.bookmark_assets` with opaque IDs, owner, request, bookmark,
  generation, attempt, kind, immutable object path, content type, checksum,
  dimensions, byte size, state, cleanup lease, and timestamps.
- Added current favicon and OG-image asset IDs to bookmarks. The old URL fields
  stay present and forced to `NULL` until the library adapter moves to signed
  asset delivery. Source and signed image URLs cannot enter bookmark rows.
- A worker reserves one deterministic private path from a stable asset ID, then
  records the checked derivative. Each request attempt may reserve at most one
  favicon and one OG image. The three-attempt request cap limits one request to
  six tracked assets.
- Worker writes require the exact live request generation and lease. A shared
  private helper locks the bookmark before the request, matching bookmark
  deletion order and avoiding the prior reverse lock order.
- Successful enrichment atomically checks and activates the chosen asset IDs,
  switches bookmark references, and queues replaced or unused objects for
  deletion. A failed Re-enrich keeps the last good title, domain, favicon, and
  OG image. A stale generation cannot reserve or activate an asset.
- Added one authenticated, owner-checked signing-path read for at most 96 unique
  bookmarks. It returns only active assets tied to each requested bookmark.
  The function does not mint or store signed URLs.
- Added bounded cleanup claim and finish functions. They recover expired upload
  and cleanup leases, retry failed Storage deletion, and retain deleted rows for
  seven days before bounded row cleanup. Bookmark deletion queues its tracked
  objects before the bookmark row disappears.
- Hardened manual Re-enrich idempotency. A same-user profile lock makes repeated
  keys race-safe, and reusing one key for another bookmark returns a conflict.
- Added a PGlite Phase 8F migration gate. All Phase 8C through 8F database gates
  pass, including the 100,000-bookmark capacity run, all three rebalance checks,
  library search, queues, asset replacement, stale generations, owner checks,
  exact grants, and cleanup recovery.
- `pnpm run check`, both production builds, the Phase 8F focused tests, the
  client secret-name scan, and `git diff --check` pass. React Doctor does not
  apply because no React file changed.
- Asset reserve and readiness checks use indexed `O(log A)` work for asset count
  `A`. Completion touches at most six candidates and two old references.
  Signing costs `O(P)` for at most 96 bookmarks. Cleanup claims at most 100 rows
  from three partial indexes and costs `O(B log B)` time and `O(B)` memory.
- No metadata parser, derivative implementation, Storage object upload, queue
  handler, wake schedule, hosted migration, generated type update, live fetch,
  UI wiring, or Phase 8G work started.

## Fifth implementation checkpoint

- Added a bounded callback-based HTML parser. It accepts HTML and XHTML up to
  2 MiB, decodes UTF-8, UTF-16, and Windows-1252 input, normalizes a title to at
  most 512 code points, and ignores metadata after the body starts.
- The parser resolves favicon and OG-image candidates against the first safe
  base URL and the final page URL. It rejects unsafe schemes, credentials,
  local hosts, disallowed ports, malformed URLs, and candidates above the
  existing 8,192-character bound.
- Added one framework-free bookmark asset processor. It checks source byte
  limits, declared MIME type, PNG, JPEG, and WebP signatures, dimensions, the
  20-megapixel decode cap, APNG, animated WebP, GIF, and static derivative facts
  before it reserves or uploads an object.
- The processor injects the rasterizer, checked asset registry, and private
  Storage adapter. It hashes the derivative, reserves the database-backed path,
  uploads without overwrite, then marks the checked asset ready. A stale lease
  or generation cannot report a ready asset.
- Added a Photon WebAssembly rasterizer. It decodes checked PNG, JPEG, and WebP
  bytes, keeps the source aspect ratio, never upscales, emits one static WebP,
  strips source metadata through decode and re-encode, and makes at most eight
  bounded attempts to meet the 32 KiB favicon or 256 KiB OG-image cap.
- Added a Supabase private Storage adapter with an explicit content type,
  one-hour cache value, and `upsert: false`. An uncertain duplicate upload reads
  the bounded private object and succeeds only when every stored byte matches.
  A different object at the immutable path returns a non-retryable conflict.
- Pinned `htmlparser2` 12.0.0 and `@cf-wasm/photon` 0.4.0 after checking their
  current callback, Deno, decode, resize, encode, and memory rules.
- The new parser, processor, rasterizer, and Storage adapter pass 36 tests across
  four files. The full Phase 8F focused run passes 177 tests across 14 files,
  and the local Phase 8F asset-schema gate passes.
- `pnpm run check`, both production builds, `pnpm audit --prod`, the client
  secret-name scan, and `git diff --check` pass. React Doctor does not apply
  because no React file changed.
- Parsing costs `O(H)` time and memory for at most 2 MiB of HTML. Image header
  inspection costs `O(B)` time and constant extra memory for bounded bytes `B`.
  Decode, resize, and at most eight encode passes cost `O(P)` time and memory for
  at most 20 million decoded pixels `P`. Duplicate upload checks cost `O(S)`
  time and memory for a derivative `S` capped at 256 KiB.
- No queue handler, wake schedule, hosted migration, generated type update,
  live fetch, UI wiring, or Phase 8G work started.

## Sixth implementation checkpoint

- Added one framework-free enrichment handler for both enrichment queues. It
  reads only a lease-checked bookmark, fetches and parses page metadata, stores
  valid private asset derivatives, and returns title, normalized final domain,
  and checked asset IDs through `runDurableWorker`.
- Extended the worker handler context with the current attempt number and lease
  token. The asset processor uses both values for request-generation checks and
  never trusts them as ownership input.
- Added a bounded HTTP/1.1 fetcher on the existing pinned DNS and connection
  adapters. It rechecks each of at most three redirects, requests identity
  encoding, limits headers to 32 KiB, limits decoded body bytes by resource
  kind, rejects ambiguous framing and compressed bodies, and classifies safe
  retry timing without storing an upstream URL or response body.
- Added a per-host fetch limiter. Interactive work runs with two total slots and
  one slot per host. Bulk work runs with four total slots and two slots per
  host. The queues keep separate batches and cannot consume each other's slots.
- Added Supabase adapters for the lease-checked bookmark lookup, asset reserve
  and ready calls, and asset-aware request completion. The local Phase 8F
  migration now exposes one service-role-only function that returns the checked
  bookmark ID, not its URL or owner.
- Moved the shared Supabase durable-worker adapter behind a framework-free
  module. TanStack server code keeps the `.server.ts` guard, while the Edge
  Function imports the same implementation.
- Wired the two handlers into the dormant Edge Function. Its enabled-queue set
  remains empty, so no wake can consume work before step 7.
- The Phase 8F focused run passes 206 tests across 22 files. The local Phase 8F
  database gate passes with seven exact asset and handler functions.
- `pnpm run check`, both production builds, `pnpm audit --prod`, Deno 2.9.6
  type checking of the Edge Function, and `git diff --check` pass. React Doctor
  does not apply because no React file changed.
- One full 66-file Vitest run passed 65 files and 411 tests but timed out in six
  tests from the unchanged dashboard X-import file under parallel load. That
  file then passed all eight tests in an isolated one-worker run.
- One fetch costs `O(B)` time and memory for bounded wire bytes `B`. A handler
  keeps one bounded page and at most one image source at a time. Host scheduling
  uses `O(W)` memory for at most the bounded worker batch `W`.
- No wake token, immediate wake, scheduled wake, hosted benchmark, hosted
  migration, generated type update, live queue consumption, UI wiring, or
  Phase 8G work started.

## Seventh implementation checkpoint

- Added one private best-effort wake function backed by Supabase Vault and
  `pg_net`. It accepts only the interactive and bulk enrichment queues and
  sends no user data, URL, or database credential.
- Added a queue-binding trigger for immediate post-commit delivery and separate
  30-second recovery schedules for both enrichment queues. A transaction
  requests at most one wake per queue, so a 50-item publication does not create
  50 HTTP calls.
- Configured one random wake token in Supabase Vault and the Edge Function
  secret store without writing its value to output, source, or project records.
- Enabled only the interactive and bulk enrichment handlers in the local Edge
  Function source. The deployed production function still runs its earlier
  dormant version until the step 9 migration and activation gates pass.
- Fixed the pinned HTTP request lifecycle after a hosted diagnostic proved DNS,
  TCP, and TLS succeeded but closing the writable stream ended the connection
  before the response read. A coupled-stream regression test now covers the
  hosted failure.
- The rollback-only hosted publication benchmark passed 20 samples. Publishing
  50 bookmarks, requests, and bulk messages measured 105.06 ms at p50,
  116.98 ms at p95, and 122.75 ms at p99 against the 1-second p95 gate.
- The controlled hosted runtime benchmark passed five mixed-host samples with
  the approved four global and two per-host bulk limits. The first 12 metadata
  results measured 934.32 ms at p95, and all 50 metadata results plus 100 basic
  private asset writes measured 7,248.59 ms at p95.
- The benchmark used temporary token-protected code and an empty private bucket
  on the existing Free project. The function, token, objects, and bucket were
  removed after the run. No branch, second project, paid resource, user row, or
  queue message remains.
- The focused pinned-fetch suite passes 7 tests. The Phase 8F database gate and
  `pnpm run check` pass. The local Deno CLI check was unavailable, while the
  hosted bundler and runtime executed the changed fetch module successfully.
- The eligible live queue-wait measurement remains part of step 9 activation,
  because production still has no applied asset functions or enabled handler.
- No hosted migration, generated type update, production worker deployment,
  live queue consumption, UI wiring, or Phase 8G work started.

## Step 8 decision audit

- Rechecked the original hosted command output instead of relying on copied
  checkpoint values. The 20-sample publication run passed at 116.98 ms p95.
- Rechecked the temporary benchmark implementation and its original five-run
  output. It used the production pinned fetch, parser, Photon rasterizer, asset
  processor, and private Storage adapter. It passed the first-12 and 50-item
  time gates without an Edge resource-limit response.
- The runtime benchmark split 50 real mixed-host page operations from 100 basic
  image and Storage operations. It did not exercise the deployed queue wake,
  claim, database completion, and asset tracking path as one production flow.
- The hosted worker remains dormant, the Phase 8F migration remains unapplied,
  and the required eligible queue-wait result below 250 ms p95 remains
  unmeasured. Host isolation and separate queue capacity have focused local
  coverage, but no hosted slow-host-under-load result has been recorded.
- Step 8 is not indicated before activation because the Edge-specific safety,
  fetch, WASM, Storage, and measured time checks passed. It is not ruled out.
  Step 9 is a guarded activation. If the live queue wait or complete worker path
  misses an approved gate, restore the dormant worker and perform step 8 before
  accepting Phase 8F activation.

## Partial ninth implementation checkpoint

- Replayed the reviewed Phase 8F migration locally, then applied it once to the
  hosted project through the same migration operation used by the prior hosted
  phases. The hosted private asset table, exact private bucket, seven public
  worker functions, wake trigger, and two recovery schedules exist. Browser
  roles have no wake-function grant.
- Only the wake token exists in Vault. The missing worker URL and API key keep
  both recovery schedules as safe no-ops. No enabled worker has been deployed.
- Current Supabase documentation proves an authentication mismatch in the
  reviewed wake design. With `verify_jwt` enabled, the Edge gateway requires a
  user JWT in the `Authorization` header and does not accept a publishable key.
  The database wake sends a publishable key through `apikey` and authenticates
  the handler with its separate random wake token, so the gateway would reject
  the request before the handler checks that token.
- The approved replacement deploys this service-only worker with `verify_jwt`
  disabled and keeps the handler's separate high-entropy wake-token check. This
  matches the caller, avoids legacy or privileged wake credentials, and lets the
  handler reject unauthorized work before it parses a queue request.
- Next, set the Vault worker URL and publishable key, deploy the enabled worker,
  prove missing and wrong tokens fail, and run the live queue-wait and complete
  worker-path gates. Hosted types, Storage lifecycle verification, advisors,
  and final Step 9 gates remain incomplete.
- Regenerated hosted public types and deployed the exact enabled worker with
  `verify_jwt` disabled. Missing and wrong wake tokens returned 401. The valid
  Vault token reached the worker and returned 200.
- Found that the eight-message bulk batch could not meet the 50-item contract
  after one coalesced wake. Raised the measured bulk batch to 50 while keeping
  concurrency at four, so message memory is bounded and one wake can claim the
  controlled fixture. Added queue-wait p50, p95, and p99 to the numeric worker
  result.
- The first live 50-item run completed all requests but exceeded the five-second
  `pg_net` request timeout, so its worker metrics were not retained. Added and
  applied one correction migration that raises the wake timeout to 15 seconds,
  above the 10-second product gate and below the 150-second Edge request limit.
- The guarded rerun exercised one authenticated 50-item publication through the
  database trigger, `pg_net`, Edge gateway, wake-token check, PGMQ read, claims,
  pinned fetches, checked database completion, and terminal message deletion.
  All 50 requests completed with no failed, deferred, retried, or lost-lease
  work.
- The live run failed the performance gates. Queue wait measured 1,090 ms at
  p95 against 250 ms. The first 12 completed in 4,011.86 ms against two seconds.
  All 50 completed in 11,976.03 ms against 10 seconds.
- Removed the worker URL and publishable key from Vault after the failure, so
  both schedules are safe no-ops again. The wake token remains stored. Deleted
  the fixture user and confirmed that no fixture bookmark, request, or asset row
  remains.
- Step 8 is required by the approved exit rule. Do not accept the deployed Edge
  worker or resume the remaining Step 9 gates until a no-cost dedicated runtime
  preserves the worker interface and passes the same live measurements.

## Eighth implementation checkpoint

- The first host search started without the deployment constraint that Reway
  already uses Vercel and has no separate backend. Koyeb and a standalone Deno
  process were candidates only. Nothing was deployed or purchased. That path is
  removed from the implementation and is no longer an open option.
- Step 8 now uses one Node.js Vercel Function at `/api/durable-worker` inside the
  existing project. The database wakes it over HTTP, so it does not depend on a
  browser tab or run inside a TanStack request handler.
- The function keeps the same bounded body, exact queue allowlist, private wake
  token, durable claims, leases, retries, and result contract. The queue runner
  now receives generic DNS and connection adapters. Supabase Edge supplies the
  Deno adapters and Vercel supplies Node adapters.
- The Node connection adapter resolves both IP families, connects to the checked
  IP address, keeps the original hostname for TLS verification and SNI, reports
  the peer address for the existing mismatch check, and closes on abort. This
  preserves the shared SSRF policy instead of falling back to automatic fetch.
- The Vercel config caps only this function at 60 seconds and places it in London
  near the hosted database. Sixty seconds fits both legacy Hobby projects and
  projects with Fluid Compute. The accepted path must still meet the stricter
  Phase 8F ten-second gate.
- This choice adds no Docker image, no second host, and no paid resource. It uses
  the current Vercel project and Hobby allowance. The tradeoff is shared account
  usage, so activation still depends on the live queue, latency, and resource
  measurements.
- The focused Node adapter, shared SSRF, pinned fetch, wake, queue-setting, and
  worker run passes 35 tests. `pnpm run check`, the production build, and diff
  hygiene pass. The Vercel bundle, deployment, and hosted measurements remain
  unverified because this checkout has no Vercel login or project link.
- The Vercel entrypoint does constant work before the existing worker call. A
  wake retains the worker's `O(N)` bounded item work and `O(C * B)` memory, with
  at most 50 messages read and four active bulk handlers.
- After deployment, add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and
  `REWAY_WORKER_WAKE_TOKEN` as private Vercel environment values. Prove missing
  and wrong tokens fail, point Vault at the Vercel function, and rerun the
  50-item live gates. Resume the remaining Step 9 checks only if all gates pass.
  If Hobby cannot pass them, stop instead of adding a paid host.

## Rejected alternatives

- Do not reduce offline capture to an in-memory Retry action.
- Do not treat a local outbox entry as a server-saved bookmark.
- Do not depend on Background Sync, `navigator.onLine`, or one open tab for
  delivery.
- Do not let one account drain another account's local entries.
- Do not skip imported bookmarks based on the current view.
- Do not let metadata work change import success.
- Do not hotlink source favicon or OG-image URLs.
- Do not use a public asset bucket for private bookmark assets.
- Do not mint a new signed URL on every render.
- Do not keep the chosen runtime when it fails the security or performance
  gates.
- Do not start Phase 8G or replace the visible dashboard mock in Phase 8F.

## Research links

- [IndexedDB guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [Persistent browser storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Background Sync support](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Supabase private Storage delivery](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- [Supabase image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase WASM image processing](https://supabase.com/docs/guides/functions/examples/image-manipulation)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Auorum extension](https://chromewebstore.google.com/detail/auorum/ijbacinkpcbemefbjmgfdjcdmekjpoki)
- [Recollect](https://recollect.so/)
- [Alam](https://alam.sh/)
- [Shiori](https://www.shiori.sh/)
- [Karakeep asset settings](https://github.com/karakeep-app/karakeep/blob/main/docs/docs/03-configuration/01-environment-variables.md)
- [Raindrop import behavior](https://help.raindrop.io/import)
