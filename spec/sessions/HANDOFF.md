# Handoff

## Purpose

- Continue from completed Phase 8F without rerunning its hosted acceptance work.

## Current boundary

- Session 06 remains open.
- Phase 8F and implementation-order Step 9 are complete.
- Phase 8G has not started. It is next and may enter its required product and
  system-design gate. Implementation starts only after that gate approves scope.
- Keep the dashboard mock-backed until Phase 8J.

## Required reads before edits

- [Feature contract](../integrations/features/feature-contract.md)
- [Phase 8 roadmap](../integrations/supabase/phase-08/roadmap.md)
- [Phase 8E contract](../integrations/supabase/phase-08/phase-08e/contract.md)
- [Phase 8F](../integrations/supabase/phase-08/phase-08f/README.md)

## Completed Phase 8F state

- Postgres owns durable state. Logged queues own pending work. Realtime remains a
  user-scoped notification path followed by refetch.
- Quick save uses a durable, user-scoped IndexedDB outbox with stable client
  request IDs, account isolation, leases, retry timing, and uncertain-response
  reconciliation.
- The reviewed asset migration and enrichment batch migration are applied to the
  hosted project. Hosted public types are current.
- Enrichment uses two-item interactive or six-item bulk windows with progressive
  commits. Each item keeps its lease, retry, idempotency, and failure isolation.
  Transfer queues keep the per-item worker path.
- The accepted worker is the Reway V2 Vercel Node 24 function with a 60-second
  cap and London placement. The Edge Function remains only as a comparison
  runtime. V1 remains unchanged.
- Vault routing is active with a private wake token. A database-driven empty wake
  returned 200 without timeout or transport error.
- Decision 13 keeps one cold run as a separate diagnostic. The worker is
  prewarmed before producers start, and the hard p95 gates use 20 warm samples.
- The accepted series completed 20 samples and all 1,000 items. Publication p95
  was 262 ms, first-12 p95 was 1,830.58 ms, and all-50 p95 was 7,103.04 ms.
  Cleanup passed after every sample.
- The prior 49-of-50 deletion result is explained and covered as 49 deleted plus
  one already-deleted terminal message.
- The hosted slow-host check passed after progressive result flushing was fixed.
- Hosted private Storage passed reserve, upload, activation, owner-scoped
  signing-path access, signed delivery, download, object removal, row cleanup,
  and queue cleanup.
- Chrome passed native IndexedDB storage, reload recovery, one-winner claiming
  across two same-origin contexts, and cleanup. No app source change was needed.
- The linked Vercel project is on Hobby. No paid plan or separate runtime was
  added.

## Verification

- Full serialized Vitest run: 69 files and 433 tests passed.
- The default parallel run passed 68 files and 427 tests before the unchanged
  X-import file timed out and caused five follow-on failures. That file passed
  all eight tests alone.
- `pnpm run check` passed.
- Full production app and worker build passed.
- `pnpm audit --prod` found no known vulnerabilities.
- The client secret-name scan found no matches.
- `git diff --check` passed.
- Supabase advisors reported informational findings only: private tables with
  RLS and no policies, and unused indexes in the development database. They
  reported no warning or error.
- Deno remains unavailable. The unchanged Edge comparison path has no fresh
  local Deno check. The accepted worker runs on Vercel Node 24.
- React Doctor remains the Phase 8D full-scope 100/100 run. Phase 8F changed no
  React.

## Key implementation paths

- `src/lib/quick-save-outbox/`
- `src/lib/network-safety/`
- `src/lib/bookmark-enrichment/`
- `src/lib/durable-worker/`
- `src/lib/library/supabase-library-capture.ts`
- `supabase/functions/_shared/enrichment-queue-runner.ts`
- `supabase/functions/_shared/supabase-enrichment-adapter.ts`
- `supabase/functions/_shared/photon-image-rasterizer.ts`
- `supabase/functions/_shared/supabase-private-asset-storage.ts`
- `supabase/migrations/20260908181025_phase_08f_bookmark_assets.sql`
- `supabase/migrations/20260911030425_phase_08f_enrichment_batch_worker.sql`
- `server/vercel-durable-worker.ts`
- `api/durable-worker.js`

## What's next

1. Follow the session start sequence.
2. Treat Phase 8F as complete. Do not rerun its hosted series or activation
   checks without evidence of a regression.
3. Gate Phase 8G decisions before implementation. Do not replace the visible
   mock before Phase 8J.

## Redaction rule

- Do not include secrets, credentials, tokens, environment values, project IDs,
  imported URLs, user file contents, or private Storage paths in output or
  project records.
