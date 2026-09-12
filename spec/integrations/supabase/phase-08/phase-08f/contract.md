# Phase 8F contract

## Status

- Approved on 2026-09-08.
- The Phase 8F decision pass is complete.
- Implementation started on 2026-09-08.
- Phase 8F and implementation-order Step 9 are complete. The accepted Vercel
  Hobby worker uses the enrichment-only batched work split from decision 12 and
  the warm-sample acceptance method from decision 13. Vault routing is active.
- Phase 8G and visible mock replacement have not started.
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
- `../roadmap.md` for the Phase 8 order and shared performance rules.
- `../phase-08c/contract.md` for ownership, storage tracking, requests,
  generations, retention, and database security.
- `../phase-08d/contract.md` for the library interface and mock boundary.
- `../phase-08e/contract.md` for queues, leases, attempts, repair,
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

The numbered sections below are approved product and engineering decisions, not
implementation steps. The separate
[implementation plan](implementation-plan.md) lists the ten execution steps.

### Decision 1: Durable offline quick save

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

### Decision 2: Quick-save persistence states

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

### Decision 3: Online save and reconciliation

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

### Decision 4: Bulk enrichment coverage

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

### Decision 5: Private cached bookmark assets

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

### Decision 6: Signed asset delivery

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

### Decision 7: Fetch and SSRF module

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

### Decision 8: Fast import experience

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

### Decision 9: Initial performance gates

Use a controlled hosted 50-link fixture to separate Reway overhead from remote
site variance. These are internal acceptance gates, not public latency claims.

- Phase 8F's rollback fixture publishes 50 bookmarks, enrichment requests, and
  bulk queue messages within 1 second at p95. Phase 8G must meet the same
  one-second p95 end-to-end response after parsing and review.
- Record corrected eligible queue wait at p50, p95, and p99 as a diagnostic.
  Do not count time before the publishing transaction commits, and do not make
  queue wait alone a Phase 8F acceptance gate.
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
connection-control limits, change the enrichment runtime or work split before
activating the producer. Do not loosen SSRF protection, remove asset validation,
or make the user wait for metadata to preserve the chosen runtime.

### Decision 10: Starting safety bounds

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

### Decision 11: Service wake authentication

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

### Decision 12: Enrichment-only batched worker protocol

Approved on 2026-09-11 after the bounded Vercel pass. Paid hosting remains out
of scope. The current Vercel and Supabase free plans remain the target.

The measured Postgres functions averaged about 0.8 to 7.4 milliseconds inside
the database, while each complete worker-to-Supabase RPC took about 140 to 165
milliseconds. A successful item used about six Supabase HTTP calls before any
asset registry or Storage work. The approved correction removes that per-item
network pattern without weakening the Phase 8E worker rules.

- Apply batching only to interactive and bulk enrichment queues. Transfer
  queues keep the existing per-item path.
- Prepare one active concurrency window at a time: two interactive items or six
  bulk items. Do not claim all 50 items at once.
- One short database call may claim, start, and return the checked bookmark
  input for that window. It must not hold locks during DNS, HTTP, parsing, image,
  or Storage work.
- Commit completed results progressively in batches no larger than the matching
  active window. Do not wait for all 50 items before publishing early results.
- Keep each item's lease token, attempt number, retry state, idempotency check,
  completion result, and terminal deletion independent. One failed or stale
  item cannot roll back another item.
- Preserve the existing `runDurableWorker` interface and the URL, SSRF, pinned
  connection, asset, wake-token, queue, repair, and private Storage rules.
- Keep durable save below one second p95, first-12 enrichment below two seconds
  p95, and all-50 completion below 10 seconds p95 as hard gates.
- Record corrected queue wait as a diagnostic from the first time a message can
  be read after commit. The existing `enqueued_at = now()` value starts at the
  publishing transaction's start and must not be labeled eligible queue wait.
  The worker summary calls that value enqueue age. The hosted acceptance harness
  must calculate corrected queue wait from the publisher's commit point.
- Run only the current free Vercel and Supabase plans. Do not start Phase 8G.

### Decision 13: Cold and warm acceptance samples

Approved on 2026-09-11 after the corrected mixed cold and warm series.

- Run one cold 50-item candidate after deployment and report its publication,
  corrected queue wait, first-12, all-50, and worker-run times separately. Cold
  latency does not enter the hard p95 calculation, but the run must complete
  without an authentication, resource, lease, or cleanup failure.
- Before enabling producers or starting the warm series, send one authenticated
  empty wake to initialize the deployed worker and its database connection.
- Run 20 complete warm 50-item samples. Calculate p50, p95, and p99 over those
  20 samples for publication, corrected queue wait, first-12, all-50, and total
  worker time.
- Keep publication below one second p95, first-12 below two seconds p95, and
  all-50 below 10 seconds p95. Corrected queue wait remains diagnostic.
- Keep the slow-host isolation check separate from the warm percentile series.
- Remove routing and fixture data after each sample. Do not combine samples from
  different worker builds or collector versions.

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
- For `N` enrichment items and active window `W`, batched database preparation
  and result commits use `O(N / W)` remote calls instead of `O(N)` per-item
  calls. Database work remains `O(N)`, and one batch holds `O(W)` item records.
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
