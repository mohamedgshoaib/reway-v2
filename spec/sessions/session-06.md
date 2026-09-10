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
- The production migration, generated types, worker deployment, schedules, live queue consumption, UI wiring, and Phase 8G remain unstarted.
- A fresh decision audit checked the original hosted benchmark code and command
  output. The benchmark used the production fetch, parser, Photon, asset, and
  Storage modules, but it did not exercise the full deployed queue and database
  path. The required live queue-wait result remains unmeasured.
- Started Phase 8F implementation-order step 9. The reviewed migration replayed
  locally, then was applied once to the hosted project. The private asset table,
  exact private bucket, seven public worker functions, wake trigger, and two
  schedules match the reviewed migration. Browser roles have no wake-function
  grant.
- Only the wake token exists in Vault, so the hosted schedules remain safe
  no-ops. The enabled worker has not been deployed.
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

---

## Decisions

- Scheduled database wakes authenticate with the handler's private wake token.
  The worker disables `verify_jwt` because no signed-in user exists for this
  call. This follows current Supabase behavior, avoids legacy and privileged
  wake credentials, and preserves the worker, queue, lease, and database seams.
  Next, configure the remaining Vault values, deploy the worker, prove failed
  token cases, and run the guarded activation gates.
- The live Edge worker missed three approved gates, so the Phase 8F runtime exit
  rule now requires Step 8. Preserve the worker interface, use no paid resource,
  and rerun the same live measurements before resuming Step 9.
- The first Step 8 host search lacked the existing deployment constraint. Koyeb
  and a standalone Deno process were candidates only. Nothing was deployed or
  purchased, and that code has been removed.
- Step 8 now targets one Node.js Function in the existing Vercel Hobby project.
  It reuses the wake and durable worker interfaces and adds Node DNS and pinned
  connection adapters behind the shared SSRF policy. The worker has a 60-second
  cap and London placement. No Docker image or second backend is part of the
  plan.
- The focused Node adapter, SSRF, pinned fetch, wake, queue-setting, and worker
  run passes 35 tests. Static checks, the production build, and diff hygiene
  pass. The checkout has no Vercel login or project link, so the Vercel bundle,
  deployment, and live measurements remain open.

---

## Blockers

1. Deploying and measuring the worker requires the user's existing Vercel
   project connection and private environment values. Do not create a paid
   runtime.

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
