# Handoff

## Purpose

- Start the Phase 8E durable jobs and queues decision pass.

## Current scope

- Phase 8D is complete. Phase 8E is next and has not started.
- Do not start Phase 8F quick save or enrichment delivery.

## Current state

- Dashboard phases 0 through 7 and backend phases 8A through 8D are complete.
- `/library` is the live dashboard mock route. `/dashboard-ui` has no alias or
  redirect.
- `src/lib/library/` contains the framework-free library contract and matching
  in-memory and Supabase adapters. The dashboard still uses its visible mock
  controller until Phase 8J.
- The hosted `phase_08d_library_interface` migration adds grouped search,
  atomic bookmark-tag replacement, and the measured collection search index.
- Hosted public types are current. The local and hosted Phase 8D database
  checks passed and left no fixture data.
- The full test suite passes all 223 tests. Full-scope React Doctor 0.9.13
  completes with no skipped checks or findings and scores 100/100.
- Session 05 remains open.

## What's next

1. Follow the required session start sequence and read the key references below.
2. Invoke `grilling` and audit which Phase 8E queue, lease, retry, and repair
   choices still need approval. Do not repeat settled Phase 8 decisions.
3. Record the approved Phase 8E contract before writing code.
4. Implement and verify Phase 8E only, then stop before Phase 8F.

## Suggested skills

- `grilling` - close only the Phase 8E choices that can change the contract.
- `codebase-design` - keep durable job state behind a small worker seam.
- `supabase` - verify current Queues, Cron, function, and migration behavior.
- `supabase-postgres-best-practices` - check claims, leases, indexes, locks, and
  query plans.
- `vitest` - cover idempotency, duplicate delivery, lease expiry, and retries.

## Established workflow

- Preserve the dirty worktree and the completed Phase 8A through 8D changes.
- Use current docs through the repo's `ctx7` workflow before framework, client,
  CLI, or cloud-service code.
- Keep secrets, environment values, project IDs, URLs, and private file paths
  out of output and records.
- Use focused risk-based checks after each bounded step. Do not hide skipped or
  incomplete validation.

## Key references

- `spec/integrations/features/feature-contract.md` - product behavior source.
- `spec/integrations/supabase/phase-08-backend-plan.md` - Phase 8E scope and
  work order.
- `spec/integrations/supabase/phase-08c-schema-decisions.md` - locked durable
  job, claim, retry, retention, and queue rules.
- `spec/integrations/supabase/phase-08d-domain-decisions.md` - completed
  adapter seam and Phase 8E boundary.
- `supabase/migrations/20260906072738_phase_08c_core_schema.sql` - existing job,
  enrichment, claim, result, and cleanup functions.
- `src/lib/library/` - completed library contract and adapters.

## Open questions

- The detailed Phase 8E grilling pass has not run. Audit the existing schema
  and backend plan first, then ask only questions whose answers change the
  worker or queue contract.

## Redaction rule

- Do not include secrets, credentials, tokens, environment values, project
  IDs, imported URLs, user file contents, or private Storage paths.
