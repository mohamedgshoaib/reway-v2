# Phase 8E results

## Status

- Complete.

## Implementation result

- Four hosted migrations add the durable queue system, opaque worker RPC IDs,
  locked grants for the extension event-trigger helper, and strict rollback when
  a retry message is missing.
- PGMQ, Cron, and pg_net are installed. Four logged queues exist for interactive
  enrichment, bulk enrichment, import or restore, and export work.
- Bookmark creation and manual Re-enrich now write the application request and
  its queue message in one database transaction.
- Worker RPCs cover bounded reads, exact message claims, attempt start, lease
  renewal, retry visibility, completion, terminal deletion, poison rejection,
  and the private operator snapshot.
- Public worker RPCs use security-invoker behavior. Browser roles have no worker
  grant, and PGMQ remains unavailable through browser clients.
- The database repair function runs every 30 seconds through Cron. It repairs
  expired leases and missing messages, closes exhausted work, removes terminal
  messages, and clears expired private diagnostics in bounded batches.
- `src/lib/durable-worker/` contains the framework-free worker, envelope parser,
  retry policy, in-memory adapter, and server-only Supabase adapter.
- The deployed `durable-worker` Edge Function requires JWT verification and the
  separate wake token. It has no enabled queue handler in Phase 8E, so it cannot
  consume work before Phase 8F.
- Hosted public types use strings for worker message IDs and enrichment
  generations. Database storage remains `bigint`.

## Verification result

- The Phase 8E PGLite suite passes transactional enqueue, duplicate save,
  message reuse, retry visibility, lease repair, missing-message replacement,
  attempt exhaustion, transfer claims, poison handling, Cron, and grant checks.
- The applied-schema hosted rollback smoke passes and leaves no fixture data.
- Supabase security and performance advisors report no warning or error. The
  remaining information notices cover private RLS tables and new unused indexes.
- The focused worker and wake run passes 22 tests across five files.
- The full run passes 245 tests across 51 files with four workers.
- `pnpm run check`, both production builds, the client secret-name scan, and
  `git diff --check` pass.
- React Doctor and browser checks do not apply because Phase 8E changes no React
  or rendered UI.
