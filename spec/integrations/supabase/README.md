# Supabase integration

Start here for Reway's Supabase work.

- `phase-08-backend-plan.md` sets the bottom-up implementation order for the
  backend, capture, enrichment, import, export, restore, and Realtime work.
- `phase-08c-schema-decisions.md` records the approved Phase 8C schema,
  security, concurrency, retention, and performance decisions.
- `phase-08d-domain-decisions.md` records the approved Phase 8D route, domain
  interface, adapter, paging, search, mutation, testing, and complexity rules.
- `phase-08e-durable-jobs-decisions.md` records the approved Phase 8E queue,
  worker, lease, retry, repair, security, and operating rules.
- `phase-08f-capture-enrichment-decisions.md` records the approved Phase 8F
  offline capture, enrichment, asset delivery, security, and performance rules.
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

Phase 8A through Phase 8E are complete. The Phase 8F decision pass and its first
seven bounded steps are complete. URL and SSRF safety, destination pinning, the
durable browser outbox, library capture operations, the reviewed bookmark asset
migration, bounded metadata parsing, static image derivatives, and immutable
private Storage uploads are in place. Interactive and bulk handlers now run
through the durable-worker interface with separate limits. Immediate and
scheduled wakes are defined, the wake token is configured without being
recorded, and the hosted publication and runtime gates pass. The production
worker remains dormant until the final activation checks in step 9. The
migration passes its local gate and has been applied once to the hosted project.
The service-only worker uses its private wake-token check with the platform JWT
check disabled. Its guarded live activation completed all 50 items but missed
the queue-wait, first-12, and total-time gates. The worker URL and publishable
key were removed from Vault, so the schedules are no-ops. Step 8 is now required
before Step 9 can resume. A Node worker entrypoint now lives in the existing
Vercel project with a 60-second cap and London placement. It needs a normal
Vercel deployment and the same live measurement before acceptance.

Do not add secrets, copied environment values, access tokens, or project IDs to
these files. Keep migrations and generated database types in their current
source paths.
