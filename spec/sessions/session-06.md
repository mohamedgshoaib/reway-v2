## Session 06

Write facts only. No plans, no advice, no narration.

**Filename:** `session-06.md`
**Session Status:** Open

---

## Status at start

- **Sprint goal:** Complete Phase 8F implementation-order step 6 only.
- **Last blocker:** The final post-fix series failed when its nineteenth wake
  reached the 15-second `pg_net` timeout. The cold candidate also missed the
  first-12 gate. Hosted asset lifecycle, browser IndexedDB, Vercel Hobby
  resource, and final activation checks remain.
- **Feature state:** Phase 8F steps 1 through 5 are complete; interactive and bulk enrichment handlers have not started.

---

## Completed

- Completed Phase 8F implementation-order step 6 and stopped before wakes.
- Added one framework-free interactive and bulk enrichment handler through `runDurableWorker`.
- Added bounded pinned HTTP fetching, redirect checks, response framing checks, resource byte caps, retry classes, and per-host concurrency limits.
- Added lease-checked Supabase bookmark input, asset registry, and request-finish adapters.
- Added one local service-role-only worker function that returns a checked bookmark ID without returning its URL or owner.
- Wired both handlers into the dormant Edge Function with separate queue settings while keeping every queue disabled.
- The Phase 8F focused run passed 206 tests across 22 files, and the local Phase 8F database gate passed.
- `pnpm run check`, both production builds, `pnpm audit --prod`, Deno Edge Function type checking, and `git diff --check` passed.
- One full 66-file test run passed 65 files and 411 tests but timed out in six unchanged X-import tests under parallel load; the affected file passed all eight tests in isolation.
- React Doctor did not apply because no React file changed.
- Completed Phase 8F implementation-order step 7. Its hosted evidence does not
  indicate the step 8 dedicated runtime, but step 8 remains the fallback until
  step 9 passes the live queue-wait and complete worker-path gates.
- Added immediate and scheduled enrichment wake definitions with one wake per queue per transaction.
- Configured the wake token in Supabase Vault and Edge Function secrets without recording its value.
- Fixed the pinned HTTP writable-stream lifecycle after the hosted runtime reproduced `network_failed`; the focused seven-test suite and hosted network diagnostic pass.
- The hosted 50-item publication benchmark passed 20 samples at 116.98 ms p95 against the 1-second gate.
- The controlled hosted runtime benchmark passed five samples. The first 12 metadata results measured 934.32 ms p95, and 50 metadata results plus 100 private asset writes measured 7,248.59 ms p95.
- Temporary benchmark functions, secrets, objects, and buckets were removed. No branch or paid resource was created.
- The Phase 8F database gate and `pnpm run check` pass. A local Deno CLI check was unavailable, while the hosted bundler and runtime executed the changed module.
- At the Step 7 checkpoint, the production migration, generated types, worker
  deployment, schedules, live queue consumption, UI wiring, and Phase 8G were
  unstarted.
- A fresh decision audit checked the original hosted benchmark code and command
  output. The benchmark used the production fetch, parser, Photon, asset, and
  Storage modules, but it did not exercise the full deployed queue and database
  path. At that checkpoint, the required live queue-wait result remained
  unmeasured.
- Started Phase 8F implementation-order step 9. The reviewed migration replayed
  locally, then was applied once to the hosted project. The private asset table,
  exact private bucket, seven public worker functions, wake trigger, and two
  schedules match the reviewed migration. Browser roles have no wake-function
  grant.
- At that checkpoint, only the wake token existed in Vault, so the hosted
  schedules remained safe no-ops. The enabled worker had not been deployed.
- Current Supabase documentation shows that `verify_jwt` requires a user JWT and
  rejects the reviewed publishable-key service wake before the handler can
  check its private wake token. Worker deployment is paused for a contract
  decision.
- Approved the service-wake authentication correction. The service-only worker
  disables the platform JWT check and keeps the separate high-entropy wake-token
  check before request parsing or privileged work. The publishable key only
  identifies the project. No user JWT, legacy anonymous JWT, secret key, or
  service-role key authorizes the wake.
- Regenerated hosted public types and deployed the enabled worker with the
  approved authentication. Missing and wrong wake tokens returned 401, while
  the valid Vault token returned 200.
- Raised the bulk read batch from 8 to the measured 50-item fixture size while
  keeping concurrency at four. Added queue-wait percentiles to the numeric
  worker result.
- Added and applied a correction migration that raises the asynchronous wake
  timeout from five to 15 seconds so it can observe the approved 10-second gate.
- The live 50-item path completed all requests with no failed, deferred,
  retried, or lost-lease work. It failed the speed gates: queue wait was 1,090
  ms p95, the first 12 completed in 4,011.86 ms, and all 50 completed in
  11,976.03 ms.
- Removed the worker URL and publishable key from Vault so the schedules are
  no-ops. Kept the wake token and removed every fixture user, bookmark, request,
  and asset row.
- Completed the Vercel Step 8 build and runtime proof with a 3.0 MB Node 24
  worker, a 60-second cap, successful Preview and Production deploys, 405 method
  rejection, 401 missing and wrong token rejection, and a 200 Vault-token wake.
- Completed one guarded Vercel 50-item run. All requests completed, but queue
  wait was 459 ms p95, first-12 was 3,655.43 ms, and all-50 was 11,359.72 ms.
- Removed Vercel wake routing from Vault and removed every Vercel benchmark
  fixture. The V2 deployment remains dormant and V1 remains unchanged.
- Documented the measured failure, working performance hypotheses, required
  instrumentation, bounded optimization order, 20-sample acceptance method,
  and full Phase 8F completion definition.
- Audited the Phase 8F plan, feature contract, Supabase integration router,
  handoff, and Session 06 records. Clarified historical checkpoints, corrected
  current runtime status wording, and linked the required phase reads from the
  handoff.
- Verified that `AGENTS.md` remained unchanged, all checked internal Markdown
  links resolve, and `git diff --check` passes.
- Added numeric worker stage timings without recording user data, URLs, paths,
  tokens, or raw errors.
- Reproduced overlapping terminal cleanup. The worker now reports an
  already-deleted terminal message separately. A hosted run completed all 50
  requests and reported 49 deleted plus one already deleted, which resolves the
  prior unexplained count.
- Moved Photon behind the image-processing call and into a separate build
  chunk. Minification reduced the initial worker module to 360,994 bytes. A
  clean build script removes only prior `dist/worker` output before emission.
- Measured bulk concurrency 6 with per-host concurrency 2, then 8 with 3. The
  higher setting regressed, so the candidate remains at 6 and 2. Interactive
  limits remain unchanged.
- The best trigger-driven candidate measured 435 ms queue wait, 2,641.13 ms for
  the first 12, and 8,146.69 ms for all 50. Two later minified samples measured
  606 and 662 ms queue wait, 2,665.83 and 2,824.98 ms for the first 12, and
  8,769.35 and 8,762.54 ms for all 50.
- Every bounded sample completed 50 requests. The 10-second total gate now
  passes, while queue wait and first-12 still fail. The 20-sample acceptance
  run did not start because a hard gate already fails.
- Preview and Production deployments and method and failed-token checks passed.
  The latest V2 Production worker is dormant. Vault retains only the wake token,
  the bulk queue is empty, fixture counts are zero, and V1 remains unchanged.
- The final focused run passed 83 tests across 16 files. `pnpm run check`, the
  local Phase 8F database gate, the full production build, `pnpm audit --prod`,
  the client secret-name scan, and `git diff --check` passed.
- Deno remained unavailable. The changed shared Photon module has no fresh local
  Deno check. The rejected candidate did not proceed to the 20-sample series,
  slow-host load, hosted asset lifecycle, browser IndexedDB checks, advisors,
  or final activation checks.
- Diagnosed the remaining delay as repeated worker-to-Supabase HTTP calls rather
  than slow SQL or a region mismatch. The worker and database are both in
  London. Paid hosting is ruled out.
- Approved an enrichment-only batched work split on the existing free plans.
  One active window contains two interactive items or six bulk items. Results
  commit in matching progressive batches, while each item keeps independent
  leases, retries, idempotency, and failure isolation. Transfer queues keep the
  per-item path.
- Corrected queue wait is a diagnostic metric. Durable save, first-12, and
  all-50 remain hard gates. No batch implementation had started when the prior
  conversation hit its usage limit.
- Documented the approved contract in the feature contract, backend plan, Phase
  8F decision record, handoff, and this session record.
- Added the local enrichment batch migration, optional shared-worker batch
  adapter, Supabase batch adapter, prepared handler input, and progressive
  two-item interactive and six-item bulk windows. Transfer queues retain their
  per-item path.
- Added batch orchestration, adapter, migration, bounds, terminal deletion, and
  per-item database failure-isolation coverage. The focused run passes 69 tests
  across 12 files. Phase 8E and Phase 8F database replays pass.
- `pnpm run check`, the full production build, `pnpm audit --prod`, the client
  secret-name scan, and diff hygiene pass. No hosted migration, type generation,
  deployment, Vault change, or live benchmark ran. Deno remains unavailable.
- Found a progressive-commit bug during the first hosted slow-host run: the
  worker waited for all six handlers before committing the window. Added a
  20 ms result flush and a regression test. The focused run now passes 70 tests
  across 12 files; Phase 8E and Phase 8F database replays, static checks, and
  the full build pass.
- Applied `20260911030425_phase_08f_enrichment_batch_worker.sql` to the hosted
  project and refreshed generated public types. The two public batch functions
  exist and grant execution only to `service_role`. Supabase security and
  performance advisors report no warnings or errors.
- Deployed the corrected worker from source to Preview and Production. The
  method guard returned 405 and the wrong-token guard returned 401. No project
  URL, ID, key, or token was recorded.
- Ran 20 complete pre-fix 50-item samples. Every request completed and every
  fixture was removed. The series measured 216 ms publication p95, 1,721.39 ms
  first-12 p95, and 5,612.84 ms all-50 p95. The worker changed afterward, so
  this series is diagnostic and cannot serve as final acceptance evidence.
- The post-fix slow-host check completed ten fast items and failed two delayed
  JSON responses as expected. The fourth fast result committed 2,734.79 ms
  before the first delayed item reached a terminal state, which proves a slow
  peer no longer holds completed results in its window.
- The post-fix 50-item sample measured 80.40 ms publication, 1,662.17 ms for
  the first 12, and 6,098.42 ms for all 50. All 50 completed with no failures.
  This sample passes the one-second publication, two-second first-12, and
  10-second all-50 hard gates.
- Removed both temporary routing values and the fixture account. Both
  enrichment queues and all fixture rows are empty. The wake token remains;
  V2 is dormant and V1 is unchanged.
- The user approved the final post-fix acceptance series. The harness attempted
  19 samples and stopped on its first bad run to limit hosted use. The cold
  candidate and 17 warm samples each completed 50 items with no failed result.
- The cold candidate measured 462.03 ms publication, 1,587.97 ms corrected
  queue wait, 3,932.41 ms for the first 12, and 8,156.65 ms for all 50. Its
  first-12 result misses the two-second gate.
- The 17 successful warm samples measured publication p50, p95, and p99 of
  162.88, 209.07, and 209.07 ms; corrected queue-wait values of 128.93, 227.05,
  and 227.05 ms; first-12 values of 1,520.12, 1,770.20, and 1,770.20 ms; and
  all-50 values of 5,769.11, 6,708.40, and 6,708.40 ms.
- The nineteenth wake reached the `pg_net` 15-second timeout before a 50-item
  response arrived. The harness cleaned its fixture and routing values, then
  skipped sample 20. The partial warm percentiles are diagnostic only. The
  failed series cannot serve as acceptance evidence.
- Final cleanup confirmed no routing values, fixture users, or messages in
  either enrichment queue. The wake token remains, V2 is dormant, and V1 is
  unchanged.
- Added one numeric Vercel summary log for non-empty wakes. It records the queue
  name and existing numeric worker totals only. A one-item Production check
  completed, logged the safe shape, and cleaned its fixture and routing.
- Corrected the acceptance collector so a sample over 10.5 seconds keeps its
  fixture until terminal evidence or a 60-second ceiling. The corrected series
  completed 20 samples and 1,000 items with no failed work or cleanup gap.
- The corrected series measured publication p50, p95, and p99 of 159, 186, and
  208 ms; first-12 values of 1,516.96, 2,011.99, and 4,709.59 ms; and all-50
  values of 5,741.66, 8,088.29, and 9,011.24 ms. First-12 p95 misses its gate by
  11.99 ms. Publication and all-50 pass.
- The numeric logs show that the slow warm sample kept normal queue-read,
  claim, and completion costs. Its aggregate page-fetch time rose to 21,784.94
  ms from the usual 18,000 to 19,000 ms range. Remote fetch variance caused the
  first-12 tail.
- Removed the fixed 20 ms wait before a final batch commit when every handler
  in that window has settled. The new regression test failed before the change
  and passed afterward. The focused run passes 27 tests across five files.
  `pnpm run check` and the worker build pass.
- Deployed the timing fix and numeric summary log to Preview and Production.
  The method guard returned 405 and the wrong-token guard returned 401.
- One post-deploy cold 50-item proof completed all work with no failures. It
  measured 311 ms publication, 1,074 ms corrected queue wait, 2,673.89 ms for
  the first 12, and 6,784.35 ms for all 50. The first queue read took 418.19 ms.
  Cleanup passed, routing is absent, both queues are empty, V2 is dormant, and
  V1 is unchanged.

---

## Decisions

- Scheduled database wakes authenticate with the handler's private wake token.
  The worker disables `verify_jwt` because no signed-in user exists for this
  call. This follows current Supabase behavior, avoids legacy and privileged
  wake credentials, and preserves the worker, queue, lease, and database seams.
  The later guarded activation configured the remaining values, deployed the
  worker, proved failed token cases, and ran the activation gates.
- The live Edge worker missed three approved gates, so the Phase 8F runtime exit
  rule now requires Step 8. Preserve the worker interface, use no paid resource,
  and rerun the same live measurements before resuming Step 9.
- The first Step 8 host search lacked the existing deployment constraint. Koyeb
  and a standalone Deno process were candidates only. Nothing was deployed or
  purchased, and that code has been removed.
- Step 8 measured one Node.js Function in the new Reway V2 Vercel Hobby project.
  It reuses the wake and durable worker interfaces and adds Node DNS and pinned
  connection adapters behind the shared SSRF policy. The worker has a 60-second
  cap and London placement. No Docker image or backend-only host is part of the
  plan. The V1 account and project stay live and unchanged.
- The focused Node adapter, SSRF, pinned fetch, wake, queue-setting, and worker
  run passes 35 tests. Static checks, the production build, and diff hygiene
  pass.
- The checkout is authenticated and linked to the new V2 Vercel project. The
  worker reuses the existing `VITE_SUPABASE_URL`; its database key and wake token
  remain private server environment values. The bundle, deployment, auth proof,
  one live measurement, and rollback are complete.
- The first Vercel build completed both app bundles, then its Node function
  builder crashed against TypeScript 7.0.2 because that release removed the
  compiler interface Vercel still calls. TypeScript 6.0.3 passes the repo
  typecheck. Pin it and keep a focused compatibility test before retrying the
  Vercel build.
- The Windows prebuilt preview then lacked pnpm package links. The normal Linux
  source build fixed that but left `.ts` suffixes in emitted imports. The worker
  now builds as one JavaScript bundle behind a small Vercel entry, so runtime
  package and TypeScript path resolution do not apply.
- The corrected Vercel build emits a 3.0 MB Node 24 worker. Preview and production
  deploys completed. The method guard and missing and wrong token checks passed.
  A database wake returned 200 and proved the Vercel and Vault tokens match.
- The guarded Vercel run completed all 50 requests without failed, queued,
  retried, deferred, or lost-lease work. It still failed all three speed gates:
  queue wait was 459 ms p95, the first 12 completed in 3,655.43 ms, and all 50
  completed in 11,359.72 ms. Removed Vault routing and every fixture row. Kept
  the wake token. V1 was not changed.
- Keep Vercel as the only in-scope runtime. Do not add Docker, a paid runtime,
  or a separate backend.
- Keep the original Phase 8F performance gates for the bounded optimization
  pass. Do not resume Step 9 until the accepted runtime passes them.
- Phase 8F cannot be called complete while Vault routing is disabled, a hard
  gate fails, or a required hosted or browser check remains unverified.
- Keep bulk concurrency at 6 and per-host concurrency at 2. The measured 8 and 3
  setting was slower. Keep interactive limits unchanged.
- The bounded Vercel optimization pass is complete. It does not justify further
  tuning under the current contract. Resume only after an explicit product
  decision changes an allowed runtime, a gate, or the worker work split.
- The user approved batching only for interactive and bulk enrichment queues.
  The worker prepares one active concurrency window at a time and commits
  results progressively in the same bound. This keeps database transactions
  short, preserves the shared `runDurableWorker` interface, and keeps item
  outcomes independent.
- Queue wait no longer blocks Phase 8F by itself. The diagnostic starts when a
  message can be read after commit, not from the transaction-start
  `enqueued_at` timestamp. The worker summary now labels the old value enqueue
  age. The one-second durable-save, two-second first-12, and 10-second all-50
  gates remain hard.
- The user approved decision 13: keep one cold run as a diagnostic, prewarm the
  worker, and calculate the hard p95 gates over 20 warm samples.
- The accepted series completed 20 samples and 1,000 items. Publication p95 was
  262 ms, first-12 p95 was 1,830.58 ms, and all-50 p95 was 7,103.04 ms. Cleanup
  passed after every sample.
- Hosted private Storage lifecycle checks passed. A real Chrome run passed
  native IndexedDB, reload recovery, cross-context one-winner claiming, and
  cleanup. The linked Vercel project remains on Hobby with no purchase.
- The production worker received a fresh private wake token. Vault routing is
  active. A database-driven empty wake returned 200 without timeout or transport
  error. Both enrichment queues were empty before activation.
- Supabase advisors reported informational findings only. The full serialized
  run passed 69 files and 433 tests. The unchanged X-import file passed all eight
  tests alone after the default parallel run reproduced its known timeout.
- `pnpm run check`, the production build, `pnpm audit --prod`, the client
  secret-name scan, and `git diff --check` pass. Deno remains unavailable.
- Phase 8F and Step 9 are complete. Phase 8G and visible mock replacement have
  not started.
- Reorganized the Phase 8 Supabase documents under `phase-08/`. Phase 8C through
  Phase 8F now have subphase folders and short routers. Contracts, implementation
  plans, checklists, and results no longer share ambiguous filenames. Phase 8F's
  13 decisions and ten execution steps remain intact in separate files.

---

## Blockers

- None for Phase 8F.

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
