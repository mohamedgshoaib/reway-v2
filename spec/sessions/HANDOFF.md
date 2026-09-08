# Handoff

## Purpose

- Implement the approved Phase 8F capture and enrichment contract.

## Current scope

- Phase 8E is complete. The Phase 8F decision pass is complete, and Phase 8F
  implementation has not started.
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
- The deployed `durable-worker` Edge Function keeps JWT verification on but has
  no wake token or enabled handler. Phase 8F may activate it only after it can
  pin validated destinations and pass the approved hosted gates.
- The full test suite passes all 245 tests. The latest full-scope React Doctor
  remains the Phase 8D run with no skipped checks or findings and a 100/100
  score. Phase 8E changed no React.
- Session 05 remains open.

## What's next

1. Follow the required session start sequence and read the key references below.
2. Follow the implementation order in the Phase 8F decision record. Start with
   the pure URL and SSRF modules and prove destination pinning in the intended
   runtime before live fetching.
3. Add the outbox, library commands and adapters, reviewed migration, metadata
   and asset modules, queue handlers, wakes, and hosted benchmarks in their
   recorded order.
4. If the Edge Function misses a security, resource, or latency gate, move the
   handler behind the same framework-free worker interface. Do not loosen the
   gate.
5. Implement and verify Phase 8F only, then stop before Phase 8G.

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
- `supabase/functions/durable-worker/` - dormant Edge Function entry that Phase
  8F may activate after approval.

## Open questions

- None. Return for approval only if current evidence requires changing the
  approved product behavior, safety bounds, private asset model, or performance
  gates.

## Redaction rule

- Do not include secrets, credentials, tokens, environment values, project
  IDs, imported URLs, user file contents, or private Storage paths.
