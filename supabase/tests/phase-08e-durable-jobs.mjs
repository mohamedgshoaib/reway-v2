import assert from "node:assert/strict"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

import {
  applyPhase8Migrations,
  installPhase8ExternalStubs,
} from "./pglite-migrations.mjs"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const INTERACTIVE_QUEUE = "reway_enrichment_interactive"
const EXPORT_QUEUE = "reway_transfer_export"

const database = new PGlite({ extensions: { pg_trgm, pgcrypto } })

const setAuthenticatedUser = async () => {
  await database.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${USER_ID}', false);
  `)
}

const createBookmark = async (requestId, path) => {
  await setAuthenticatedUser()
  const result = await database.query(`
    select (public.create_bookmark(
      '${requestId}',
      'https://example.com/${path}',
      'Bookmark ${path}'
    )).id as bookmark_id;
  `)
  await database.exec("reset role;")
  return result.rows[0].bookmark_id
}

try {
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create schema realtime;
    create table realtime.messages (extension text not null);
    alter table realtime.messages enable row level security;
    create function realtime.topic()
    returns text
    language sql
    stable
    as $$
      select current_setting('realtime.topic', true);
    $$;
    create function realtime.send(
      payload jsonb,
      event text,
      topic text,
      private boolean
    )
    returns void
    language plpgsql
    as $$
    begin
      return;
    end;
    $$;

    grant usage on schema auth, realtime to authenticated;
    grant execute on function auth.uid() to authenticated;
    grant execute on function realtime.topic() to authenticated;
    grant select on table realtime.messages to authenticated;
  `)

  await installPhase8ExternalStubs(database)
  await applyPhase8Migrations(database)

  await database.exec(`
    insert into auth.users (id, email, raw_user_meta_data)
    values ('${USER_ID}', 'worker@example.invalid', '{}');
  `)

  const cronRows = await database.query(`
    select schedule, command
    from cron.job
    where jobname = 'reway-durable-work-repair';
  `)
  assert.deepEqual(cronRows.rows, [
    {
      command: "select private.repair_durable_work(100);",
      schedule: "30 seconds",
    },
  ])

  const bookmarkId = await createBookmark(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "first"
  )
  await createBookmark("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "duplicate")

  const queuedRequestRows = await database.query(`
    select request.id, request.generation, request.queue_message_id
    from private.enrichment_requests as request
    where request.bookmark_id = ${bookmarkId};
  `)
  assert.equal(queuedRequestRows.rows.length, 1)
  const queuedRequest = queuedRequestRows.rows[0]
  const initialQueueRows = await database.query(`
    select count(*)::integer as count
    from pgmq.q_reway_enrichment_interactive;
  `)
  assert.equal(initialQueueRows.rows[0].count, 1)

  await database.exec("set role service_role;")
  const messageRows = await database.query(`
    select * from public.worker_read_queue('${INTERACTIVE_QUEUE}', 90, 1);
  `)
  assert.equal(messageRows.rows.length, 1)
  const message = messageRows.rows[0]
  assert.deepEqual(message.envelope, {
    generation: String(queuedRequest.generation),
    request_id: queuedRequest.id,
    version: 1,
    work_kind: "enrichment",
  })

  const claimRows = await database.query(`
    select public.worker_claim_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${message.message_id}',
      '${queuedRequest.id}',
      '${queuedRequest.generation}',
      60
    ) as claim;
  `)
  const claim = claimRows.rows[0].claim
  assert.equal(claim.status, "claimed")

  const renewedRows = await database.query(`
    select public.worker_renew_enrichment_lease(
      '${INTERACTIVE_QUEUE}',
      '${message.message_id}',
      '${queuedRequest.id}',
      '${queuedRequest.generation}',
      '${claim.lease_token}',
      60,
      90
    ) as renewed;
  `)
  assert.equal(renewedRows.rows[0].renewed, true)

  const startedRows = await database.query(`
    select public.worker_start_enrichment_attempt(
      '${queuedRequest.id}',
      '${queuedRequest.generation}',
      '${claim.lease_token}'
    ) as started;
  `)
  assert.equal(startedRows.rows[0].started, true)

  const retryRows = await database.query(`
    select public.worker_finish_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${message.message_id}',
      '${queuedRequest.id}',
      '${queuedRequest.generation}',
      '${claim.lease_token}',
      false,
      null,
      null,
      null,
      null,
      'transient',
      'temporary_failure',
      null,
      clock_timestamp() + interval '2 minutes'
    ) as state;
  `)
  assert.equal(retryRows.rows[0].state, "queued")
  await database.exec("reset role;")

  const retryStateRows = await database.query(`
    select attempt_count, queue_message_id, next_attempt_at
    from private.enrichment_requests
    where id = '${queuedRequest.id}';
  `)
  assert.equal(retryStateRows.rows[0].attempt_count, 1)
  assert.equal(
    String(retryStateRows.rows[0].queue_message_id),
    message.message_id
  )
  const retryVisibilityRows = await database.query(`
    select vt > clock_timestamp() as delayed
    from pgmq.q_reway_enrichment_interactive
    where msg_id = ${message.message_id};
  `)
  assert.equal(retryVisibilityRows.rows[0].delayed, true)

  await database.exec(`
    update private.enrichment_requests
    set next_attempt_at = clock_timestamp() - interval '1 second'
    where id = '${queuedRequest.id}';
    update pgmq.q_reway_enrichment_interactive
    set vt = clock_timestamp() - interval '1 second'
    where msg_id = ${message.message_id};
    set role service_role;
  `)
  const redeliveryRows = await database.query(`
    select * from public.worker_read_queue('${INTERACTIVE_QUEUE}', 90, 1);
  `)
  assert.equal(redeliveryRows.rows[0].message_id, message.message_id)
  const secondClaimRows = await database.query(`
    select public.worker_claim_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${message.message_id}',
      '${queuedRequest.id}',
      '${queuedRequest.generation}',
      60
    ) as claim;
  `)
  const secondClaim = secondClaimRows.rows[0].claim
  assert.equal(secondClaim.status, "claimed")
  await database.exec("reset role;")

  await database.exec(`
    update private.enrichment_requests
    set lease_expires_at = clock_timestamp() - interval '1 second'
    where id = '${queuedRequest.id}';
  `)
  const repairRows = await database.query(`
    select private.repair_durable_work(10) as result;
  `)
  assert.equal(repairRows.rows[0].result.expired_requeued, 1)
  const repairedRequestRows = await database.query(`
    select state, attempt_count, queue_message_id
    from private.enrichment_requests
    where id = '${queuedRequest.id}';
  `)
  assert.deepEqual(repairedRequestRows.rows[0], {
    attempt_count: 1,
    queue_message_id: Number(message.message_id),
    state: "queued",
  })

  await database.exec(`
    update private.enrichment_requests
    set queue_message_id = null
    where id = '${queuedRequest.id}';
    delete from pgmq.q_reway_enrichment_interactive
    where msg_id = ${message.message_id};
  `)
  const missingRepairRows = await database.query(`
    select private.repair_durable_work(10) as result;
  `)
  assert.equal(missingRepairRows.rows[0].result.missing_messages_replaced, 1)
  const replacementRows = await database.query(`
    select queue_message_id
    from private.enrichment_requests
    where id = '${queuedRequest.id}';
  `)
  assert.notEqual(
    String(replacementRows.rows[0].queue_message_id),
    message.message_id
  )

  const exhaustedBookmarkId = await createBookmark(
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "exhausted"
  )
  const exhaustedRows = await database.query(`
    select id, generation, queue_message_id, max_attempts
    from private.enrichment_requests
    where bookmark_id = ${exhaustedBookmarkId};
  `)
  const exhausted = exhaustedRows.rows[0]
  await database.exec(`
    update private.enrichment_requests
    set state = 'running',
      attempt_count = max_attempts,
      lease_token = gen_random_uuid(),
      lease_expires_at = clock_timestamp() - interval '1 second'
    where id = '${exhausted.id}';
  `)
  const exhaustedRepairRows = await database.query(`
    select private.repair_durable_work(10) as result;
  `)
  assert.equal(exhaustedRepairRows.rows[0].result.exhausted_failed, 1)
  const exhaustedStateRows = await database.query(`
    select request.state, request.queue_message_id, bookmark.metadata_status
    from private.enrichment_requests as request
    join public.bookmarks as bookmark on bookmark.id = request.bookmark_id
    where request.id = '${exhausted.id}';
  `)
  assert.deepEqual(exhaustedStateRows.rows[0], {
    metadata_status: "failed",
    queue_message_id: null,
    state: "failed",
  })

  const transferRows = await database.query(`
    insert into private.transfer_jobs (
      user_id,
      client_request_id,
      kind,
      state,
      next_attempt_at,
      selected_count
    )
    values (
      '${USER_ID}',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'export',
      'queued',
      clock_timestamp(),
      1
    )
    returning id;
  `)
  const transferJobId = transferRows.rows[0].id
  const transferMessageRows = await database.query(`
    select private.send_transfer_message('${transferJobId}') as message_id;
  `)
  const transferMessageId = transferMessageRows.rows[0].message_id
  await database.exec("set role service_role;")
  const transferDeliveryRows = await database.query(`
    select * from public.worker_read_queue('${EXPORT_QUEUE}', 90, 1);
  `)
  assert.equal(
    transferDeliveryRows.rows[0].message_id,
    String(transferMessageId)
  )
  const transferClaimRows = await database.query(`
    select public.worker_claim_transfer_message(
      '${EXPORT_QUEUE}',
      '${transferMessageId}',
      '${transferJobId}',
      'export',
      60
    ) as claim;
  `)
  const transferClaim = transferClaimRows.rows[0].claim
  assert.equal(transferClaim.status, "claimed")
  const transferStartedRows = await database.query(`
    select public.worker_start_transfer_attempt(
      '${transferJobId}',
      '${transferClaim.lease_token}'
    ) as started;
  `)
  assert.equal(transferStartedRows.rows[0].started, true)
  const transferRetryRows = await database.query(`
    select public.worker_finish_transfer_message(
      '${EXPORT_QUEUE}',
      '${transferMessageId}',
      '${transferJobId}',
      '${transferClaim.lease_token}',
      'queued',
      0,
      0,
      0,
      'temporary_failure',
      null,
      clock_timestamp() + interval '2 minutes'
    ) as state;
  `)
  assert.equal(transferRetryRows.rows[0].state, "queued")

  await assert.rejects(
    database.query(
      `select pgmq.send('${EXPORT_QUEUE}', '{"bad":true}'::jsonb, 0);`
    ),
    /permission denied/
  )
  await database.exec("reset role;")
  const poisonMessageRows = await database.query(`
    select pgmq.send('${EXPORT_QUEUE}', '{"bad":true}'::jsonb, 0) as message_id;
  `)
  const poisonMessageId = poisonMessageRows.rows[0].message_id
  await database.exec("set role service_role;")
  const poisonDeliveryRows = await database.query(`
    select * from public.worker_read_queue('${EXPORT_QUEUE}', 90, 10);
  `)
  const poisonDelivery = poisonDeliveryRows.rows.find(
    (row) => row.message_id === String(poisonMessageId)
  )
  assert.ok(poisonDelivery)
  const poisonResultRows = await database.query(`
    select public.worker_reject_poison_message(
      '${EXPORT_QUEUE}',
      '${poisonMessageId}',
      ${poisonDelivery.delivery_count},
      'malformed_envelope'
    ) as deleted;
  `)
  assert.equal(poisonResultRows.rows[0].deleted, true)
  const snapshotRows = await database.query(`
    select public.worker_operator_snapshot() as snapshot;
  `)
  assert.equal(snapshotRows.rows[0].snapshot.poison_messages, 1)
  assert.equal("payload" in snapshotRows.rows[0].snapshot, false)
  await database.exec("reset role;")

  const missingDuringRetryBookmarkId = await createBookmark(
    "ffffffff-ffff-4fff-8fff-ffffffffffff",
    "missing-during-retry"
  )
  const missingDuringRetryRows = await database.query(`
    select id, generation, queue_message_id
    from private.enrichment_requests
    where bookmark_id = ${missingDuringRetryBookmarkId};
  `)
  const missingDuringRetry = missingDuringRetryRows.rows[0]
  await database.exec("set role service_role;")
  const candidateDeliveries = await database.query(`
    select * from public.worker_read_queue('${INTERACTIVE_QUEUE}', 90, 100);
  `)
  const missingDuringRetryDelivery = candidateDeliveries.rows.find(
    (row) => row.message_id === String(missingDuringRetry.queue_message_id)
  )
  assert.ok(missingDuringRetryDelivery)
  const missingDuringRetryClaimRows = await database.query(`
    select public.worker_claim_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${missingDuringRetryDelivery.message_id}',
      '${missingDuringRetry.id}',
      '${missingDuringRetry.generation}',
      60
    ) as claim;
  `)
  const missingDuringRetryClaim = missingDuringRetryClaimRows.rows[0].claim
  assert.equal(missingDuringRetryClaim.status, "claimed")
  await database.query(`
    select public.worker_start_enrichment_attempt(
      '${missingDuringRetry.id}',
      '${missingDuringRetry.generation}',
      '${missingDuringRetryClaim.lease_token}'
    );
  `)
  await database.exec("reset role;")
  await database.exec(`
    delete from pgmq.q_reway_enrichment_interactive
    where msg_id = ${missingDuringRetry.queue_message_id};
    set role service_role;
  `)
  await assert.rejects(
    database.query(`
      select public.worker_finish_enrichment_message(
        '${INTERACTIVE_QUEUE}',
        '${missingDuringRetry.queue_message_id}',
        '${missingDuringRetry.id}',
        '${missingDuringRetry.generation}',
        '${missingDuringRetryClaim.lease_token}',
        false,
        null,
        null,
        null,
        null,
        'transient',
        'temporary_failure',
        null,
        clock_timestamp() + interval '2 minutes'
      );
    `),
    /Queue message missing/
  )
  await database.exec("reset role;")
  const rejectedRetryRows = await database.query(`
    select state, attempt_count
    from private.enrichment_requests
    where id = '${missingDuringRetry.id}';
  `)
  assert.deepEqual(rejectedRetryRows.rows[0], {
    attempt_count: 1,
    state: "running",
  })

  await setAuthenticatedUser()
  await assert.rejects(
    database.query("select public.worker_operator_snapshot();"),
    /permission denied/
  )
  await database.exec("reset role;")

  const grantRows = await database.query(`
    select
      count(*) filter (where grantee = 'service_role')::integer
        as service_role_worker_grants,
      count(*) filter (where grantee in ('PUBLIC', 'anon', 'authenticated'))::integer
        as browser_worker_grants
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name like 'worker_%';
  `)
  assert.equal(grantRows.rows[0].browser_worker_grants, 0)
  assert.ok(grantRows.rows[0].service_role_worker_grants >= 12)

  console.log(
    JSON.stringify({
      checks: "passed",
      cronJobs: cronRows.rows.length,
      queueMessages: 4,
      workerFunctions: grantRows.rows[0].service_role_worker_grants,
    })
  )
} finally {
  await database.close()
}
