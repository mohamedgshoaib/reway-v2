# Handoff

## Purpose

- Prepare and implement Phase 8C core schema and security only.

## Current scope

- Phase 8A and Phase 8B are complete.
- No schema, migration, generated database type, or feature backend code exists
  yet.

## Current state

- Dashboard phases 0 through 7 are complete.
- Session 05 remains open.
- The connected Supabase project was healthy during Phase 8A. Its remote
  migration history and `public` schema were empty at that check.
- Local migration setup lives in `supabase/config.toml` and
  `supabase/migrations/`. Local Data API setup requires explicit grants for new
  tables.
- Public and secret environment checks are in place. The runtime packages and
  CLI remain pinned.
- Browser, request-scoped server, privileged worker, and verified identity
  modules live under `src/lib/supabase/`.
- The server client maps request cookies and every response cookie and cache
  header required by `@supabase/ssr`.
- The worker client is server-only and has no persisted auth state. The identity
  server function uses `getClaims()` and returns only `userId`.
- The working tree contains the uncommitted Phase 8A and Phase 8B work. Preserve
  it.
- The Phase 8B focused run passed 11 tests across five files. `pnpm run check`,
  both production builds, the client bundle secret scan, and
  `git diff --check` passed.
- Hosted Confirm Email and Google OAuth settings and live authentication remain
  unverified.
- The full work order, schema rules, security rules, and tests are in
  `spec/integrations/supabase/phase-08-backend-plan.md`.

## What's next

1. Follow the session start sequence, then read the Phase 8 backend plan and
   feature contract.
2. Run the required `grilling` pass for Phase 8C and confirm the schema slice
   before writing SQL.
3. Load `codebase-design`, `supabase`, `postgresql-table-design`,
   `supabase-postgres-best-practices`, and `find-docs`. Check current Supabase
   and Postgres docs before choosing schema or RLS syntax.
4. Recheck the remote migration history and `public` schema without recording a
   project ID or secret.
5. Build the core schema in the order set by the backend plan. Use the CLI
   migration workflow, explicit Data API grants, RLS, ownership checks, and
   indexed user-scoped access paths.
6. Generate `src/types/database.generated.ts` only after the first schema passes
   review.
7. Add focused migration, same-user, cross-user denial, and replay tests. Stop
   after Phase 8C verification. Do not start Phase 8D.

## Expected environment names

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

## Redaction rule

- Never record environment values, keys, access tokens, project IDs, imported
  URLs, or user file contents in specs, logs, test snapshots, or handoffs.
