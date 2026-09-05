# Handoff

## Purpose

- Start Phase 8 from the database upward after the user prepares the Supabase
  environment and MCP connection.

## Current scope

- Phase 8 now covers the Supabase backend, core data, durable jobs, capture,
  enrichment, browser import, export, restore, Realtime, and gated mock
  replacement.
- This session produced research and documentation only. No backend code or
  package installation has started.

## Current state

- Dashboard phases 0 through 7 are complete.
- Session 05 remains open.
- The feature contract and project DNA now use transactional queueing and
  batched consumers instead of one direct enrichment webhook per bookmark.
- Transient enrichment failures receive at most three bounded attempts.
  Permanent failures stop at once. Manual Re-enrich starts a new request.
- Browser import completion is separate from metadata enrichment completion.
- Browser HTML import merges. Browser HTML export is portable. Reway JSON backup
  and staged replacement restore are lossless.
- The capacity target is 100,000 bookmarks per account, with 10,000 as the
  routine large-import benchmark and 50 MB as the initial configurable file
  limit.
- The full work order, job rules, edge cases, security rules, and tests are in
  `spec/integrations/supabase/phase-08-backend-plan.md`.

## What's next

1. Follow the session start sequence and read the Phase 8 backend plan.
2. Confirm that the Supabase MCP target and environment variable names exist
   without printing their values.
3. Verify that `VITE_SUPABASE_KEY` contains a publishable key. Prefer the current
   official name `VITE_SUPABASE_PUBLISHABLE_KEY` or add one validated alias.
4. Start Phase 8A only. Verify the project identity, migration history, client
   and secret-key split, dependencies, and generated-type path before Phase 8B.

## Expected environment names

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`, expected to contain a publishable key
- `VITE_SITE_URL`
- `SUPABASE_SECRET_KEY`, server-only

Never print, copy into documentation, or expose the values. The Supabase secret
key must not appear in `import.meta.env`, a browser module, or a client bundle.

## Suggested skills

- `supabase` for current platform guidance, key safety, migrations, and MCP work.
- `supabase-postgres-best-practices` and `postgresql-table-design` for schema,
  RLS, indexes, constraints, jobs, and queue access.
- `codebase-design` for the domain interfaces and mock or Supabase adapter seams.
- `tanstack-start` and `find-docs` before framework-specific server or auth code.
- `no-use-effect` and `vercel-react-best-practices` when React wiring starts.
- `vitest` for contract, RLS, queue, import, export, and failure tests.
- `react-doctor` after React implementation.
- `unslop` for interface and spec text.

## Established workflow

- Follow `AGENTS.md` and load skills only when their phase begins.
- Build Phase 8A through 8J in order. Stop and verify each slice before the next.
- Keep a mock path until its Supabase adapter passes the same contract tests.
- Run focused risk-based tests during a slice. Run normal lint, format, and type
  checks, then the broader gates at the end of a coherent change.
- Do not use browser or Playwright checks without explicit permission.
- Do not close Session 05 unless the user explicitly ends it.

## Key references

- `spec/integrations/supabase/phase-08-backend-plan.md` for the Phase 8 order and
  acceptance rules.
- `spec/integrations/features/feature-contract.md` for approved product behavior.
- `spec/identity/project-dna.md` for capture, retry, privacy, and queue rules.
- `spec/dashboard-ui/implementation-order.md` for phase routing and UI history.
- `spec/sessions/session-05.md` for verified continuity.

## Open questions

- Phase 8A has no open product question. Start it after the environment and MCP
  checks. Do not carry an unresolved product choice into Phase 8B or later.
- Use the ordered grilling queue in
  `spec/integrations/supabase/phase-08-backend-plan.md`. It covers production
  auth rules, recent authentication for deletion, username uniqueness, offline
  quick save, bulk enrichment coverage, favicon and OG-image delivery, import
  concurrency, pause and cancel behavior, root-folder placement, export scope,
  restore drift and recovery, retention, and JSON compatibility.
- Ask one question at a time and include the recommended answer. Update the
  contract after each confirmed choice.
- Set latency budgets only after local and hosted load runs provide p50, p95,
  and p99 results. This is a later evidence gate, not a preflight question.

## Redaction rule

- Never record environment values, keys, access tokens, project IDs, imported
  URLs, or user file contents in specs, logs, test snapshots, or handoffs.
