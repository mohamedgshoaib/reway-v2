# Phase 8E implementation plan

## Status

- Complete.

## Execution steps

1. Add one reviewed Phase 8E migration for extensions, logged queues, message
   binding, worker RPCs, heartbeat, retry visibility, repair, diagnostics,
   grants, and the private operator snapshot.
2. Extend the Docker-free database check with local stubs where PGMQ or Cron is
   unavailable, then add one hosted rollback smoke for their real behavior.
3. Add the framework-free worker module, typed retry policy, in-memory adapters,
   and focused tests.
4. Add the server-only Supabase worker adapters and narrow error mapping.
5. Add the shared Edge Function entry path and its two-layer request check, but
   do not enable an external work handler before Phase 8F.
6. Apply the reviewed migration once, regenerate public types, run the final
   checks, update the phase records, and stop before Phase 8F.
