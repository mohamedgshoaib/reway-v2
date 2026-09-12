# Phase 8F implementation plan

## Status

- Complete through Step 9.
- Phase 8G has not started.

## Execution steps

1. Add the pure URL and SSRF policy modules with injected DNS and connection
   adapters. Prove destination pinning in the intended runtime before any live
   fetch.
2. Add the browser outbox interface, in-memory adapter, IndexedDB adapter,
   transactional multi-tab claims, recovery, and focused tests.
3. Extend the library domain commands and both adapters for idempotent quick
   save, request-ID reconciliation, and manual Re-enrich.
4. Add one reviewed migration for URL bounds, tracked bookmark assets, checked
   asset replacement and cleanup state, signing access, and any missing quick
   save or worker functions. Replay and test it locally before hosted apply.
5. Add bounded page parsing, metadata URL resolution, image validation, static
   derivative creation, and private Storage upload behind injected interfaces.
6. Add interactive and bulk enrichment handlers through the existing
   `runDurableWorker` interface. Keep queue settings separate.
7. Add immediate and scheduled wakes, configure the wake token without
   recording it, and run the hosted 50-link and resource benchmarks.
8. If Edge Functions miss the gates, move the handler implementation to a
   measured runtime without changing the durable worker interface. If that
   runtime still misses the user-visible gates, diagnose and record an approved
   runtime, gate, or work-split correction before Step 9 resumes.
9. Apply the reviewed migration once, regenerate hosted public types, run the
   hosted rollback, Storage, advisor, build, test, and secret-scan gates, then
   record the implementation result.
10. Stop before Phase 8G and before visible mock replacement.
