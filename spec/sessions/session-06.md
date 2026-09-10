## Session 06

Write facts only. No plans, no advice, no narration.

**Filename:** `session-06.md`
**Session Status:** Open

---

## Status at start

- **Sprint goal:** Complete Phase 8F implementation-order step 6 only.
- **Last blocker:** None
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

---

## Blockers

1. No accepted runtime remains under the current free-plan and
   no-separate-backend constraint. The bounded Vercel optimization pass still
   misses the queue-wait and first-12 gates. Further work needs an explicit
   product decision. Do not touch V1, loosen a gate, change the worker contract,
   or create a paid or separate runtime without approval.

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
