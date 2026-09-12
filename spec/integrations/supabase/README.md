# Supabase integration

Start here for Reway's Supabase work.

- [`phase-08/`](phase-08/README.md) contains the Phase 8 roadmap and subphase
  folders.
- [`phase-08/roadmap.md`](phase-08/roadmap.md) defines the Phase 8A through Phase
  8J sequence.
- Each subphase folder separates its contract, implementation plan, checks, and
  results when more than one document is needed.
- `supabase/config.toml` owns local Supabase and migration settings.
- `supabase/migrations/` owns reviewed schema changes.
- `src/types/database.generated.ts` holds the generated hosted public database
  types.
- `src/lib/supabase/browser-client.ts` owns browser access with the publishable
  key.
- `src/lib/supabase/server-client.server.ts` owns request-scoped cookie access.
- `src/lib/supabase/worker-client.server.ts` owns privileged server-only access.
- `src/lib/supabase/auth-identity.server.ts` verifies the signed-in subject for
  server callers.

Use `VITE_SUPABASE_PUBLISHABLE_KEY` for browser access. The environment reader
accepts `VITE_SUPABASE_KEY` only as a checked alias for the current local file.
Keep `SUPABASE_SECRET_KEY` in server-only modules and read it from `process.env`.

The feature contract remains authoritative for product behavior. This folder
owns the technical plan that implements that behavior.

Phase 8A through Phase 8F are complete. See the
[Phase 8F folder](phase-08/phase-08f/README.md) for its contract, implementation
plan, and results. Phase 8F added URL and SSRF safety,
destination pinning, the durable browser outbox, library capture operations,
private bookmark assets, bounded metadata parsing, and the enrichment workers.
Interactive work uses two-item windows and bulk work uses six-item windows with
progressive commits. The accepted Node 24 worker runs in the Reway V2 Vercel
Hobby project with a 60-second cap and London placement. Vault routing is active.
The accepted 20-sample warm series completed all 1,000 items at 262 ms
publication p95, 1,830.58 ms first-12 p95, and 7,103.04 ms all-50 p95. Hosted
Storage, browser IndexedDB, advisor, build, test, audit, secret-scan, and
activation checks passed. The separate V1 account and project stay unchanged.
Phase 8G and visible mock replacement have not started.

Do not add secrets, copied environment values, access tokens, or project IDs to
these files. Keep migrations and generated database types in their current
source paths.
