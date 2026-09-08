# Phase 8E durable jobs and queues decisions

## Status

- Approved on 2026-09-07.
- The decision pass is complete.
- Implementation completed on 2026-09-07.
- Phase 8E stops before quick save and enrichment delivery in Phase 8F.

## Phase boundary

Phase 8E adds the durable queue and worker control system that later phases use.
It covers physical queues, message envelopes, claims, leases, retries, repair,
worker access, and private operating data.

Phase 8E does not fetch bookmark metadata, parse imports, create exports, activate
restores, replace dashboard mocks, or add user-facing job controls. Those remain
in their assigned later phases.

## Sources used

- `spec/integrations/features/feature-contract.md` owns product behavior.
- `phase-08-backend-plan.md` owns the Phase 8 order and shared job rules.
- `phase-08c-schema-decisions.md` owns the approved schema, claim, retention,
  security, and concurrency rules.
- `phase-08d-domain-decisions.md` owns the completed library interface and the
  Phase 8E boundary.
- Current Supabase Queues, Cron, Edge Functions, and PGMQ documentation was
  checked before this decision pass.
- Before implementation, the hosted project was healthy and had the five Phase
  8A through Phase 8D migrations. `pgmq`, `pg_cron`, and `pg_net` were
  available but not installed, and no Edge Function was deployed.

## Durable state and queue ownership

- Application tables own user-visible and recoverable state. Queue messages
  only transport work.
- Use logged PGMQ queues. Do not use unlogged queues for durable work.
- Use four physical queues:
  - Interactive enrichment for quick saves and manual Re-enrich.
  - Bulk enrichment for imports.
  - Import and restore transfer work.
  - Export work.
- Each durable request or job generation has one bound queue message ID.
- A queue message contains only a versioned work kind, request or job ID, and
  generation when that work uses generations. It contains no URL, user content,
  token, file path, or fetched metadata.

## Activation and capacity

- Use a hybrid activation model. A best-effort wake starts eligible work after
  commit, while scheduled consumers provide the durable fallback.
- A lost wake cannot lose work. The application row and PGMQ message remain
  authoritative.
- Run each physical queue through an independent consumer schedule and capacity
  limit. Interactive traffic cannot consume the bulk queue's minimum capacity.
- Keep one shared worker module for envelope validation, claim, heartbeat,
  attempt start, completion, retry, and message cleanup.
- Queue-specific handlers own only the work for that queue.
- Batch size, concurrency, lease length, visibility timeout, and schedule
  interval remain measured settings. Do not copy values from another product.

Phase 8E prepares this activation path. Phase 8F enables the first external
enrichment handler and its wake schedule. The approved Phase 8F contract keeps
the framework-free worker interface and moves the handler to a dedicated
runtime if the Edge Function cannot pin destinations or meet its hosted gates.

## Message lifecycle

- Send the application row and its first queue message in one database
  transaction.
- Keep one message for the full automatic retry cycle of one request or job
  generation.
- On a transient failure, update the application state and the same message's
  visibility time in one database transaction.
- Repair creates a replacement message only when the bound message is missing.
- After an application row reaches a terminal state, delete its queue message.
  Application rows remain the audit source.
- If a worker commits a terminal result but crashes before message deletion, the
  next delivery reads the terminal row, skips the work, and deletes the message.
- Do not archive normal terminal messages.

## Claims, leases, and attempts

- A queue delivery may claim only the request or job named by its validated
  envelope. Do not scan and claim an unrelated application row.
- Claims use a lease token, request generation when present, running state, and
  bounded compare-and-set update.
- Queue visibility lasts longer than the application lease.
- Workers renew both values before either expires. Every renewal checks the row
  ID, generation when present, lease token, and running state.
- A worker that cannot renew must stop and cannot commit a result.
- Long transfer work processes a bounded chunk and stores a cursor. It does not
  hold one lease for the full job.
- Reading a message or claiming a row does not spend an attempt. Start an
  attempt immediately before external or irreversible work.
- A crash before attempt start does not spend an attempt. A crash after attempt
  start does.
- Enrichment keeps its approved maximum of three external attempts.

## Retry policy

- One framework-free retry module accepts typed success, transient failure, and
  permanent failure results.
- A failure result contains a safe reason code and may contain a parsed
  `Retry-After` value. It never contains product copy or raw upstream text.
- The retry module applies bounded exponential backoff.
- Stable jitter derives from the request ID and attempt number. It spreads due
  work without random test results.
- A valid `Retry-After` value takes priority within the configured maximum.
- Queue handlers cannot bypass attempt or delay bounds.
- Initial values stay configurable and must pass focused timing and load tests.

## Repair

- Run repair as a bounded database function through Supabase Cron. Repair does
  not call an Edge Function.
- Use `FOR UPDATE SKIP LOCKED` and a stable ID order so concurrent repair runs do
  not block each other or deadlock.
- Each run handles a limited number of rows, commits, and leaves excess work for
  the next run.
- Repair requeues expired leases that retain an attempt budget.
- Repair marks exhausted work terminal without starting another attempt.
- Repair replaces missing bound messages and deletes messages left behind by
  terminal or stale rows.
- Repair records bounded counts and safe reason codes. It records no user data.

## Poison messages

- Validate the envelope before claiming application work.
- Treat malformed envelopes, unknown work kinds, unsupported payload versions,
  and invalid identifiers as poison messages.
- A poison message fails once. Do not let it cycle through visibility timeouts.
- If a linked application row can be identified safely, mark it failed with a
  stable public code.
- Store only the queue kind, message ID, delivery count, safe reason code, and
  observed time in a private diagnostic row with indexed expiry.
- Start with seven-day diagnostic retention and bounded cleanup.
- Delete the poison message after the diagnostic and linked state commit.
- Never store or archive the poison payload.
- Deploy a compatible consumer before a producer may send a new payload
  version.

## Worker access

- Keep PGMQ tables and `pgmq_public` unavailable to browser and authenticated
  clients.
- The Edge Function requires Supabase JWT verification and a separate
  worker-wake token.
- Store wake values in Supabase Vault or server-only function configuration.
  Do not commit them.
- Cron and immediate wake calls may trigger only a bounded consumer run. The
  wake token grants no database rights.
- The Edge Function creates its privileged client from its own server
  environment. It never trusts a credential from the request body.
- Keep private worker implementations in the private schema.
- Add the smallest public RPC wrappers needed by the server-only worker client.
  Revoke execution from `PUBLIC`, `anon`, and `authenticated`, then grant the
  exact functions to `service_role`.
- Worker RPCs return envelopes and bounded counts only. They return no URLs,
  user data, raw database errors, or queue payloads beyond the checked envelope.

## Private operator snapshot

Add one `service_role`-only snapshot that reports:

- Queue depth and oldest message age by queue.
- Counts by request and job state.
- Expired and nearly expired leases.
- Retry, exhaustion, stale-generation, and poison-message counts.
- Durable rows with a missing bound message.
- Terminal rows that still have a bound message.
- Counts from recent bounded repair runs.

The snapshot excludes payloads, URLs, user IDs, file paths, tokens, and raw
errors. Alert thresholds wait until measured runs establish normal values.

## Worker module interface

Use one deep module with one external function:

```ts
runDurableWorker(request, dependencies): Promise<WorkerRunSummary>
```

- `request` selects one allowed queue and carries bounded run limits.
- `dependencies` supplies the queue adapter, application-state adapter, clock,
  retry policy, and queue-specific handler.
- Production uses Supabase adapters. Tests use in-memory adapters through the
  same interface.
- Tests assert returned summaries and durable outcomes through this interface.
  They do not depend on private helper layout.

## Verification

- Test message and application-row creation as one transaction.
- Test exact message-to-row binding, duplicate delivery, terminal redelivery,
  retry visibility, and missing-message replacement.
- Test crashes before and after attempt start, lease renewal failure, lease
  expiry, stale tokens, stale generations, attempt exhaustion, and poison
  messages.
- Test independent queue limits and guaranteed bulk progress.
- Test exact worker grants and denial for `PUBLIC`, `anon`, and
  `authenticated`.
- Use PGLite or pure tests for state and worker behavior that does not require a
  real extension.
- Use one rollback-only hosted smoke check for PGMQ, Cron, grants, atomic queue
  writes, and repair behavior that local tests cannot prove.
- Run security and performance advisors once after the final migration.
- Regenerate hosted public database types after the migration.
- Run focused Vitest suites, `pnpm run check`, both production builds, the
  client secret-name scan, and `git diff --check`.
- React Doctor and browser checks do not apply unless Phase 8E changes React.

## Complexity contract

- Envelope parsing and validation use constant time and bounded memory.
- A worker run uses `O(B)` time plus handler work and `O(B)` memory, where `B`
  is the configured batch limit.
- Indexed claim and repair queries cost `O(log N + B)` for `N` durable rows.
- Retry calculation uses constant time and memory.
- Queue and operator snapshots return a fixed set of queue and state groups.
  They never scan or return user records.
- No Phase 8E loop or query processes an unbounded result.

## Implementation order

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

## Rejected alternatives

- Do not use the queue as the only job record.
- Do not use unlogged queues for durable work.
- Do not rely only on immediate wake or only on client follow-up.
- Do not use one shared capacity pool that can starve bulk enrichment.
- Do not create a new message for every automatic retry.
- Do not use one long lease for a complete transfer job.
- Do not let handlers choose arbitrary retry times or attempt counts.
- Do not archive normal terminal messages or poison payloads.
- Do not expose the PGMQ schema, private job tables, or worker diagnostics to
  browser clients.
- Do not start Phase 8F metadata fetching or Phase 8G transfer behavior.
