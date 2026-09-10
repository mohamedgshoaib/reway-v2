# Handoff

## Purpose

- Continue the approved Phase 8F capture and enrichment contract from the
  hosted apply and activation step.

## Current scope

- Phase 8E is complete. The Phase 8F decision pass and implementation-order
  steps 1 through 7 are complete. The guarded Step 9 Edge activation failed, so
  Step 8 is required. Do not redo URL safety, SSRF, destination
  pinning, the browser outbox, library capture operations, the reviewed bookmark
  asset migration, metadata parsing, image validation, derivative creation, or
  private Storage upload, pinned HTTP fetching, or enrichment handlers.
- Start implementation-order step 8. The guarded Edge activation missed the
  queue-wait, first-12, and total-time gates. Preserve the worker interface and
  deploy the completed Node worker as a separate function in the existing
  Vercel Hobby project. Do not add Docker, a second backend host, or a paid
  resource. Resume the remaining step 9 gates only after that function passes
  the same live measurements.
- Do not start Phase 8G import work.

## Current state

- Dashboard phases 0 through 7 and backend phases 8A through 8E are complete.
- `/library` is the live dashboard mock route. `/dashboard-ui` has no alias or
  redirect.
- `src/lib/library/` contains the framework-free library contract and matching
  in-memory and Supabase adapters. The dashboard still uses its visible mock
  controller until Phase 8J.
- The hosted `phase_08d_library_interface` migration adds grouped search,
  atomic bookmark-tag replacement, and the measured collection search index.
- Hosted public types are current. The local and hosted Phase 8E database checks
  passed and left no fixture data.
- `spec/integrations/supabase/phase-08e-durable-jobs-decisions.md` contains the
  approved Phase 8E contract and implementation order.
- `spec/integrations/supabase/phase-08f-capture-enrichment-decisions.md`
  contains the approved Phase 8F outbox, enrichment, private asset, security,
  performance, and implementation contract.
- The hosted project has four logged PGMQ queues, bounded worker RPCs, one active
  repair schedule, and no worker grants for browser roles.
- The deployed `durable-worker` Edge Function runs the enabled version with the
  platform JWT check disabled.
  The handler checks its separate private wake token before parsing or running
  work. The worker URL and publishable key were removed from Vault after the
  failed gate, so the database trigger and schedules cannot invoke it.
- `src/lib/network-safety/` owns pure URL normalization, IP classification, and
  the SSRF policy. `supabase/functions/_shared/deno-pinned-network.ts` owns the
  Deno DNS and pinned-connection adapters.
- `src/lib/quick-save-outbox/` owns the two-method outbox interface, matching
  in-memory and IndexedDB adapters, account isolation, capacity totals, claims,
  leases, retry timing, and uncertain-response recovery.
- `LibraryAdapter` now exposes idempotent quick save, client request
  reconciliation, and manual Re-enrich. The in-memory and Supabase adapters
  match that contract. `src/lib/library/supabase-library-capture.ts` keeps the
  Supabase calls behind the adapter seam and uses existing atomic functions.
- `supabase/migrations/20260908181025_phase_08f_bookmark_assets.sql` is the
  reviewed migration. It adds the URL bound, private derivative bucket, tracked
  assets, bookmark references, exact worker and signing-path access, atomic
  replacement, and durable cleanup state. It has been applied once to the
  hosted project.
- `supabase/tests/phase-08f-bookmark-assets.mjs` covers exact bounds, request and
  owner checks, stale generations, replacement, failed Re-enrich preservation,
  signing paths, grants, deletion, and cleanup recovery.
- `src/lib/bookmark-enrichment/` owns bounded HTML parsing and the framework-free
  asset processor. The processor injects the rasterizer, checked asset registry,
  and private Storage adapter.
- `supabase/functions/_shared/photon-image-rasterizer.ts` creates bounded static
  WebP derivatives from checked PNG, JPEG, and WebP bytes.
- `supabase/functions/_shared/supabase-private-asset-storage.ts` uploads to the
  private bucket without overwrite and reconciles uncertain duplicates by exact
  byte comparison.
- `src/lib/network-safety/pinned-http-fetch.ts` owns bounded identity-encoded
  HTTP/1.1 reads over the checked pinned connection. It validates framing,
  content type, byte limits, retry status, and each redirect. A hosted
  diagnostic found and the implementation fixed a premature writable-stream
  close before the response read.
- `src/lib/network-safety/host-limited-fetch.ts` limits concurrent work per
  normalized host without sharing capacity between queues.
- `src/lib/bookmark-enrichment/enrichment-handler.ts` owns the shared metadata
  and private-asset handler. `enrichment-queue-settings.ts` keeps separate
  interactive and bulk limits.
- `supabase/functions/_shared/supabase-enrichment-adapter.ts` owns lease-checked
  input, asset registry, and completion calls. The local migration exposes the
  checked bookmark ID only to `service_role`.
- `supabase/functions/_shared/enrichment-queue-runner.ts` composes the handler
  through `runDurableWorker`. The local Edge Function source enables only the
  interactive and bulk queues.
- The applied migration defines one private Vault-backed `pg_net` wake, one
  coalesced immediate wake per queue per transaction, and separate 30-second
  recovery schedules.
- The reviewed Phase 8F migration and the bounded 15-second wake-timeout
  correction have been applied. Hosted public types include the Phase 8F
  functions.
- The hosted publication benchmark passed 20 samples at 116.98 ms p95. The
  controlled hosted runtime benchmark passed five samples at 934.32 ms p95 for
  the first 12 metadata results and 7,248.59 ms p95 for 50 metadata results plus
  100 private asset writes.
- The temporary benchmark functions, token, objects, and bucket were removed.
  No branch or paid resource was created.
- The focused Phase 8F run passes 206 tests across 22 files. The local Phase 8F
  database gate, static checks, both builds, production dependency audit, Deno
  Edge Function type check, and diff hygiene pass.
- One full 66-file Vitest run passed 65 files and 411 tests but timed out in six
  tests from the unchanged dashboard X-import file under parallel load. That
  file passes all eight tests in an isolated one-worker run.
- Browser-backed IndexedDB, persistence, and multi-tab checks remain unverified.
- The latest full-scope React Doctor remains the Phase 8D run with no skipped
  checks or findings and a 100/100 score. Phase 8F has changed no React.
- Session 05 ended. Session 06 remains open.

## What's next

1. Follow the required session start sequence and read the key references below.
2. Deploy `api/durable-worker.ts` through the existing Vercel project with its
   private `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and
   `REWAY_WORKER_WAKE_TOKEN` environment values.
3. Point the Vault wake URL at that function only after its missing-token and
   wrong-token checks pass, then rerun the 50-item live gates.
4. Resume the remaining hosted rollback, private Storage lifecycle, advisor,
   build, focused test, secret-scan, and diff gates only after Step 8 passes.
5. Record Step 9, then stop at Step 10 before Phase 8G.

## Suggested skills

- `codebase-design` - keep capture and enrichment behind the completed worker
  seam and the new outbox and fetch interfaces.
- `supabase` - verify current Edge Function and client behavior.
- `vitest` - cover URL normalization, SSRF classes, stale generations, retries,
  outbox recovery, asset lifecycle, and metadata results.
- `unslop` - keep changed project records direct and factual.
- `grilling` - use only if current evidence requires a product-level contract
  change.

## Established workflow

- Preserve the dirty worktree and the completed Phase 8A through 8E changes.
- Use current docs through the repo's `ctx7` workflow before framework, client,
  CLI, or cloud-service code.
- Keep secrets, environment values, project IDs, URLs, and private file paths
  out of output and records.
- Use focused risk-based checks after each bounded step. Do not hide skipped or
  incomplete validation.

## Key references

- `spec/integrations/features/feature-contract.md` - product behavior source.
- `spec/integrations/supabase/phase-08-backend-plan.md` - Phase 8F scope and
  work order.
- `spec/integrations/supabase/phase-08c-schema-decisions.md` - locked durable
  job, claim, retry, retention, and queue rules.
- `spec/integrations/supabase/phase-08d-domain-decisions.md` - completed
  adapter seam and Phase 8E boundary.
- `spec/integrations/supabase/phase-08e-durable-jobs-decisions.md` - approved
  and completed queue and worker contract.
- `spec/integrations/supabase/phase-08f-capture-enrichment-decisions.md` -
  approved Phase 8F contract and exact implementation order.
- `supabase/migrations/20260906072738_phase_08c_core_schema.sql` - existing job,
  enrichment, claim, result, and cleanup functions.
- `src/lib/durable-worker/` - completed worker, retry, in-memory, and Supabase
  adapters.
- `src/lib/network-safety/` - completed Phase 8F URL and SSRF policy modules.
- `src/lib/quick-save-outbox/` - completed Phase 8F outbox interface and
  in-memory and IndexedDB adapters.
- `src/lib/bookmark-enrichment/` - completed bounded parser and framework-free
  asset processor.
- `src/lib/library/supabase-library-capture.ts` - completed Supabase quick-save,
  request reconciliation, and manual Re-enrich adapter calls.
- `supabase/migrations/20260908181025_phase_08f_bookmark_assets.sql` - reviewed
  asset schema, worker function, and wake changes. It has been applied once.
- `supabase/tests/phase-08f-bookmark-assets.mjs` - local migration and asset
  lifecycle gate.
- `supabase/functions/_shared/deno-pinned-network.ts` - completed Deno DNS and
  pinned-connection adapters.
- `supabase/functions/_shared/photon-image-rasterizer.ts` - completed static
  derivative adapter.
- `supabase/functions/_shared/supabase-private-asset-storage.ts` - completed
  immutable private Storage adapter.
- `src/lib/network-safety/pinned-http-fetch.ts` - completed bounded fetch over
  pinned connections.
- `src/lib/network-safety/host-limited-fetch.ts` - completed per-host capacity
  limiter.
- `src/lib/bookmark-enrichment/enrichment-handler.ts` - completed interactive
  and bulk handler.
- `supabase/functions/_shared/supabase-enrichment-adapter.ts` - completed
  handler database adapters.
- `supabase/functions/_shared/enrichment-queue-runner.ts` - completed queue
  composition with separate settings.
- `supabase/functions/durable-worker/` - enabled Edge implementation retained
  for comparison. Vault wake routing is absent after its live gate failure.
- `api/durable-worker.ts` - Vercel Node worker entrypoint with the existing wake
  and queue interfaces.
- `src/lib/network-safety/node-pinned-network.server.ts` - Vercel Node DNS and
  pinned-connection adapters.
- `vercel.json` - 60-second cap and London placement for the worker function.

## Open questions

- This checkout has no Vercel login or project link. Deploy through the user's
  existing Vercel project, then run the live gates. If Hobby misses a gate, stop
  instead of adding a paid runtime.

## Redaction rule

- Do not include secrets, credentials, tokens, environment values, project
  IDs, imported URLs, user file contents, or private Storage paths.
