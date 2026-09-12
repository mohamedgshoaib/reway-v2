# Phase 8F results

## Status

- Phase 8F is complete.
- This file records implementation checkpoints and verification evidence.

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
- At this earlier audit checkpoint, the hosted worker remained dormant, the
  Phase 8F migration remained unapplied,
  and the required eligible queue-wait result below 250 ms p95 remains
  unmeasured. Host isolation and separate queue capacity have focused local
  coverage, but no hosted slow-host-under-load result has been recorded.
- At that checkpoint, Step 8 was not indicated before activation because the
  Edge-specific safety,
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
- At the start of this checkpoint, only the wake token existed in Vault. The
  missing worker URL and API key kept both recovery schedules as safe no-ops.
  No enabled worker had been deployed.
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
- The next action at that checkpoint was to set the Vault worker URL and
  publishable key, deploy the enabled worker, prove missing and wrong tokens
  fail, and run the live queue-wait and complete worker-path gates. Hosted
  types, Storage lifecycle verification, advisors, and final Step 9 gates were
  then incomplete.
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
  new Reway V2 app project. A small JavaScript entry imports a worker bundle made
  during the normal build. The database wakes it over HTTP, so it does not depend
  on a browser tab or run inside a TanStack request handler. The separate V1
  account and project stay live and unchanged.
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
- This choice adds no Docker image, no backend-only host, and no paid resource.
  The V2 app and worker share one new Vercel Hobby account and project. The
  tradeoff is shared V2 account usage, so activation still depends on the live
  queue, latency, and resource measurements.
- The focused Node adapter, shared SSRF, pinned fetch, wake, queue-setting, and
  worker run passes 35 tests. `pnpm run check`, the production build, and diff
  hygiene pass. The checkout is linked to the new V2 Vercel project.
- The first linked Vercel build proved the app output, then the Node function
  builder crashed while loading TypeScript 7.0.2. Vercel's builder still uses
  the compiler interface that TypeScript 7 removed. TypeScript 6.0.3 passes the
  repo typecheck, so the project pins it and tests the two compiler members that
  the builder needs.
- The first Windows prebuilt preview omitted pnpm's package links. A normal Linux
  source deployment installed them but preserved `.ts` import suffixes in the
  emitted worker files. The build now bundles the worker implementation and its
  packages before Vercel traces the JavaScript entry. This avoids both runtime
  resolution failures without changing the shared worker interfaces.
- The corrected Vercel build emits one 3.0 MB Node 24 worker with a 60-second
  cap. Preview and production deployments completed. The preview method guard
  returned 405, and missing and wrong wake tokens returned 401. A database wake
  reached production with status 200, proving the Vercel and Vault tokens match.
- One guarded production run published and completed 50 bulk requests with no
  failed, queued, retried, deferred, or lost-lease requests. Queue wait was 459
  ms p95 against 250 ms. The first 12 completed in 3,655.43 ms against two
  seconds. All 50 completed in 11,359.72 ms against 10 seconds. The worker read
  and completed 50 messages and reported 49 terminal deletes; the final request
  state still showed all 50 completed.
- The Vercel runtime therefore fails Step 8 under the approved contract. Removed
  the worker URL and publishable key from Vault, kept the wake token, and deleted
  the fixture user. No fixture bookmark, request, or asset remains. The recovery
  schedules are safe no-ops again.
- The Vercel entrypoint does constant work before the existing worker call. A
  wake retains the worker's `O(N)` bounded item work and `O(C * B)` memory, with
  at most 50 messages read and four active bulk handlers.
- Do not resume Step 9 or reactivate Vault routing. The next decision must either
  approve one bounded Vercel optimization pass under the same gates or accept
  that the current free-plan, no-separate-backend constraint cannot meet them.
  Do not add a paid host or loosen a gate without approval.

## Step 8 completion analysis

The Vercel test proved the runtime and worker contract, but it did not prove the
performance contract. This is a speed failure, not a correctness, durability,
security, build, or deployment failure.

| Measurement | Required | Vercel result | Gap |
| --- | ---: | ---: | ---: |
| Eligible queue wait | Below 250 ms p95 | 459 ms | 209 ms over |
| First 12 completed | Below 2,000 ms p95 | 3,655.43 ms | 1,655.43 ms over |
| All 50 completed | Below 10,000 ms p95 | 11,359.72 ms | 1,359.72 ms over |

The test used one authenticated transaction that created 50 bookmarks, 50
enrichment requests, and 50 bulk queue messages. The URLs were split across
`example.com`, `example.org`, and `example.net`. One post-commit wake ran the
production Vercel function through the wake-token check, queue read, request
claim, pinned DNS and HTTP fetch, metadata parsing, asset work when present,
checked completion, and terminal queue deletion. Bulk work used a batch of 50,
global concurrency 4, and per-host concurrency 2.

Queue wait is the worker read time minus each message's enqueue time. Its p95
came from the 50 messages in this run. First-12 and all-50 are single-run elapsed
times from the earliest request creation. They are not a multi-run p95 series.
One failed run is enough to reject activation, but it is not enough to claim
that Vercel can never pass. A valid final p95 needs at least 20 full samples.

The following causes remain working hypotheses until stage timings prove them:

- Queue wait includes post-commit `pg_net` dispatch, network setup, Vercel
  startup, module evaluation, client creation, and the first queue read.
- The worker loads a 3.0 MB bundle that includes Photon WASM before queue work.
  Moving Photon behind the image-processing call may reduce startup and queue
  wait without weakening the asset contract.
- Global concurrency 4 requires at least 13 processing waves for 50 messages.
  Per-host concurrency 2 also limits the three-host fixture. Bulk concurrency
  may need measured tuning while the interactive queue keeps its smaller limits.
- A worker summary reported 49 terminal deletes after 50 completions. The final
  database state had 50 completed requests, so this does not prove data loss.
  It may indicate another wake, an already-deleted message, or a delete result
  that needs a separate outcome. Do not choose among those explanations without
  a reproduction.

### Required next implementation slice

1. Add numeric stage timings for wake entry, queue read, claim, fetch, asset
   processing, completion, and terminal deletion. Do not log URLs, user data,
   object paths, tokens, or database values.
2. Reproduce the 49-of-50 terminal deletion result with overlapping-wake tests.
   Add a same-queue single-flight control or a distinct already-deleted outcome
   only if the evidence requires it.
3. Load Photon only when static image work begins and keep it out of the initial
   Vercel worker path. Confirm the main worker bundle and cold start shrink.
4. Tune only the bulk global and per-host concurrency. Keep the batch at 50 and
   keep interactive queue limits independent. Measure CPU, memory, duration,
   host fairness, and free-plan usage before accepting a larger value.
5. Run focused worker, wake, SSRF, fetch, asset, retry, and build tests. Then
   deploy Preview and Production, repeat method and token checks, and keep Vault
   routing absent until those checks pass.
6. Run 20 complete 50-item samples. Report cold and warm results separately and
   calculate p50, p95, and p99 for queue wait, first 12, and all 50. Remove every
   fixture after each bounded run.
7. Pass the slow-host isolation check, Vercel Hobby resource check, hosted
   private Storage lifecycle, browser IndexedDB persistence and multi-tab
   recovery, Supabase advisors, full tests, production build, secret scan, and
   diff hygiene.
8. Activate Vault routing only after every hard gate passes. Then complete the
   remaining Step 9 record and stop at Step 10 before Phase 8G.

Phase 8F is complete only when the accepted runtime passes the original gates,
the terminal deletion count is explained and covered, all hosted and browser
checks pass, fixtures are gone, Vault routing is active, and the final records
contain no skipped or deferred item. If Vercel still fails after the bounded
optimization, return for an explicit product decision. Do not silently weaken
the gates or add a paid or separate backend runtime.

## Bounded Vercel optimization checkpoint

- Added numeric wake-entry, queue-read, claim, fetch, asset-processing,
  completion, terminal-deletion, and total worker timings. Metrics contain no
  URL, user value, object path, token, or raw error.
- A concurrent worker regression test reproduced a terminal message removed by
  another cleanup. The adapter now reports `terminalAlreadyDeleted` separately
  from `terminalDeleted`. A hosted run then reported 49 deleted and one already
  deleted while all 50 requests completed. This explains the prior 49-of-50
  count without adding a same-queue lock or changing PGMQ visibility.
- Photon now loads only when static image work starts. Esbuild emits it as a
  separate chunk. The initial worker module fell from 3,146,544 bytes to
  1,025,764 bytes after splitting and to 360,994 bytes after minification.
  The lazy Photon chunk is 2,119,575 bytes.
- The worker build now deletes only `dist/worker` before emitting files. This
  prevents old hashed chunks from entering Vercel through `includeFiles`.
- Bulk concurrency 6 with per-host concurrency 2 beat the original setting.
  One trigger-driven run measured 435 ms queue wait, 2,641.13 ms for the first
  12, and 8,146.69 ms for all 50. It completed all work and reported 49 deleted
  plus one already deleted terminal message.
- Bulk concurrency 8 with per-host concurrency 3 regressed to 567 ms queue
  wait, 3,750.64 ms for the first 12, and 9,500.43 ms for all 50. The accepted
  local candidate returned to 6 and 2. Interactive settings did not change.
- Two minified concurrency-6 runs measured 606 and 662 ms queue wait,
  2,665.83 and 2,824.98 ms for the first 12, and 8,769.35 and 8,762.54 ms for
  all 50. Both completed 50 requests with no failed result. Minification did
  not close the remaining dispatch and first-visible gaps.
- The bounded pass passes the 10-second total gate but fails the 250 ms
  queue-wait and two-second first-12 gates. A 20-sample acceptance run did not
  start because the candidate already fails hard gates.
- Preview and Production builds and method and failed-token checks passed. The
  latest V2 Production deployment remains dormant. Vault keeps only the wake
  token, the bulk queue is empty, fixture counts are zero, and V1 was not
  changed.
- The final focused run passes 83 tests across 16 files. `pnpm run check`, the
  local Phase 8F database gate, the full production build, `pnpm audit --prod`,
  the client secret-name scan, and `git diff --check` pass.
- Deno is unavailable on this host, so the changed shared Photon module has no
  fresh local Deno check. The rejected candidate did not proceed to the
  20-sample acceptance series, slow-host load, hosted asset lifecycle, browser
  IndexedDB checks, advisors, or final activation checks.
- At that checkpoint, the 2026-09-11 product decision kept the free plans and
  approved the enrichment-only batched work split in decision 12. Step 9
  remained paused until that correction passed its focused tests and live
  user-visible gates. Paid runtime and Phase 8G work remained out of scope.

## Enrichment batch implementation checkpoint

- Added local migration
  `20260911030425_phase_08f_enrichment_batch_worker.sql`. It adds one bounded
  preparation function and one bounded completion function for enrichment
  queues. Both public functions and their private helpers grant execution only
  to `service_role`.
- One preparation call claims, starts, and returns checked bookmark input for
  at most two interactive or six bulk items. It locks bookmark rows in stable
  ID order and finishes before any network work starts.
- One completion call applies a progressive result window and deletes terminal
  messages. Each item runs in its own database subtransaction, so one rejected
  result does not roll back accepted results in the same window.
- `runDurableWorker` keeps its existing call shape and accepts an optional batch
  adapter. Enrichment supplies it. Transfer queues do not, so they retain the
  per-item claim, start, finish, and delete path.
- The enrichment handler accepts checked prepared input and skips its old
  bookmark-read RPC on the batch path. Its old source adapter remains available
  for the per-item path and tests.
- The worker reads up to 50 bulk messages, then prepares, runs, and commits one
  six-item window before starting the next. Interactive windows contain at most
  two items. Heartbeats and asset calls remain per item when needed.
- The worker summary now labels the transaction-start measure `enqueueAgeP50Ms`,
  `enqueueAgeP95Ms`, and `enqueueAgeP99Ms`. The hosted harness still needs to
  calculate corrected queue wait from the publisher's commit point.
- For `N` items and window `W`, the normal no-asset path now uses one queue read
  plus about `2 * ceil(N / W)` worker-to-Supabase calls instead of about six
  calls per item. Database work stays `O(N)` and batch memory stays `O(W)`.
- The focused enrichment and durable-worker run passes 70 tests across 12
  files. Phase 8E and Phase 8F database replays, `pnpm run check`, the full
  production build, `pnpm audit --prod`, the client secret-name scan, and diff
  hygiene pass.
- The batch migration is applied hosted, generated public types are current,
  and both public batch functions grant execution only to `service_role`.
  Supabase security and performance advisors report no warnings or errors.
- A hosted slow-host run exposed a progressive-commit bug: one window waited
  for every handler before committing any result. The worker now flushes ready
  results after a 20 ms linger. The post-fix run committed the fourth fast
  result 2,734.79 ms before the first delayed item reached a terminal state.
- A pre-fix 20-sample series measured 216 ms publication p95, 1,721.39 ms
  first-12 p95, and 5,612.84 ms all-50 p95. It is diagnostic only because the
  progressive-flush fix changed the worker afterward.
- The post-fix 50-item sample completed all 50 requests with no failures. It
  measured 80.40 ms publication, 1,662.17 ms for the first 12, and 6,098.42 ms
  for all 50. This sample passes the one-second publication, two-second
  first-12, and 10-second all-50 hard gates.
- The approved final post-fix series attempted 19 samples and stopped on its
  first bad run. The cold candidate and 17 warm samples completed 50 items with
  no failed result. The cold candidate measured 462.03 ms publication,
  1,587.97 ms corrected queue wait, 3,932.41 ms for the first 12, and 8,156.65
  ms for all 50. It misses the first-12 gate.
- The 17 successful warm samples measured publication p50, p95, and p99 of
  162.88, 209.07, and 209.07 ms; corrected queue-wait values of 128.93, 227.05,
  and 227.05 ms; first-12 values of 1,520.12, 1,770.20, and 1,770.20 ms; and
  all-50 values of 5,769.11, 6,708.40, and 6,708.40 ms. These values are
  diagnostic because the series did not complete.
- The nineteenth wake reached the `pg_net` 15-second timeout before a 50-item
  response arrived. The harness cleaned the fixture and routing values, then
  skipped sample 20. No routing values, fixture users, or enrichment messages
  remain. The wake token remains, V2 is dormant, and V1 is unchanged.
- A corrected collector removes routing after 10.5 seconds but keeps each
  fixture until terminal evidence or a 60-second ceiling. Its 20-sample run
  completed 1,000 items without failure or cleanup gaps. Publication p50, p95,
  and p99 were 159, 186, and 208 ms. Corrected queue-wait values were 121, 414,
  and 531 ms. First-12 values were 1,516.96, 2,011.99, and 4,709.59 ms. All-50
  values were 5,741.66, 8,088.29, and 9,011.24 ms. Worker-run values were
  5,503.97, 7,903.72, and 8,844.42 ms.
- The first-12 p95 misses the hard gate by 11.99 ms. Numeric Vercel summaries
  show normal queue-read, claim, and completion costs in the slow warm sample.
  Aggregate fetch time rose to 21,784.94 ms, so remote page variance caused the
  tail.
- The worker now skips the 20 ms result linger when every handler in the active
  window has settled. This removes delay without changing batch size, RPC count,
  concurrency, leases, retries, or result isolation. A regression test failed
  before the fix and passes afterward. The focused run passes 27 tests across
  five files. Static checks and the worker build pass.
- Preview and Production include the timing fix and a numeric summary log for
  non-empty wakes. The method and wrong-token guards pass. One post-deploy cold
  proof completed 50 items but reached first-12 in 2,673.89 ms. Publication,
  corrected queue wait, and queue read used 311, 1,074, and 418.19 ms. Cold
  delivery remains the main cold cost.
- No routing values, fixture users, assets, or queue messages remain. The wake
  token remains, V2 is dormant, and V1 is unchanged.
- Preview and Production source deployments passed the method and wrong-token
  guards. Guarded Vault routing and every fixture row were removed after the
  checks. Both enrichment queues are empty, V2 is dormant, and V1 is unchanged.
- At that checkpoint, Deno was unavailable and the Edge build had no fresh Deno
  check. Hosted asset lifecycle, browser IndexedDB, Vercel Hobby resource, and
  final activation checks remained.

## Final ninth implementation checkpoint

- Decision 13 treats one cold run as a separate diagnostic. The worker is
  prewarmed before producers start, and the hard p95 gates use 20 warm samples.
- The accepted series completed 20 samples and all 1,000 items. Publication p95
  was 262 ms, first-12 p95 was 1,830.58 ms, and all-50 p95 was 7,103.04 ms. Each
  sample cleaned its fixture.
- The hosted private Storage lifecycle passed reserve, upload, activation,
  owner-scoped signing-path access, signed delivery, download, object removal,
  row cleanup, and queue cleanup.
- A real Chrome run passed native IndexedDB storage, reload recovery, one-winner
  claiming across two same-origin contexts, and cleanup. The first temporary
  check passed a raw string instead of the adapter's normalized URL type.
  Correcting the check required no app source change.
- The linked Vercel project is on Hobby. No paid plan or separate runtime was
  added.
- Vault contains the worker route, publishable key, and a fresh private wake
  token. A database-driven empty wake returned 200 without a timeout or
  transport error. Both enrichment queues were empty before activation.
- Supabase advisors reported only informational findings: private tables with
  RLS and no policies, and unused indexes in the development database. They
  reported no warning or error.
- The full single-worker run passed 69 files and 433 tests. The default parallel
  run passed 68 files and 427 tests before the unchanged X-import file timed out;
  that file passed all eight tests alone. `pnpm run check`, the production build,
  `pnpm audit --prod`, the client secret-name scan, and `git diff --check` pass.
- Deno remains unavailable, so the unchanged Edge comparison path has no fresh
  local Deno check. The accepted worker runs on Vercel Node 24.
- Phase 8F Step 9 is complete. Phase 8G and visible mock replacement have not
  started.
