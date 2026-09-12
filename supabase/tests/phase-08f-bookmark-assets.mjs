import assert from "node:assert/strict"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

import {
  applyPhase8Migrations,
  installPhase8ExternalStubs,
} from "./pglite-migrations.mjs"

const USER_ONE = "11111111-1111-4111-8111-111111111111"
const USER_TWO = "22222222-2222-4222-8222-222222222222"
const INTERACTIVE_QUEUE = "reway_enrichment_interactive"
const FIRST_ASSET = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
const OVERSIZED_ASSET = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"
const EXCESS_ASSET = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"
const REPLACEMENT_FAVICON = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
const REPLACEMENT_OG_IMAGE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"
const FAILED_ASSET = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1"
const STALE_ASSET = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1"
const STALE_EXTRA_ASSET = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2"
const SHA_256_HEX = "ab".repeat(32)

const database = new PGlite({ extensions: { pg_trgm, pgcrypto } })

const setAuthenticatedUser = async (userId) => {
  await database.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `)
}

const createBookmark = async (userId, requestId, path) => {
  await setAuthenticatedUser(userId)
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

const readRequest = async (bookmarkId) => {
  const result = await database.query(`
    select id, generation, queue_message_id
    from private.enrichment_requests
    where bookmark_id = ${bookmarkId}
    order by generation desc
    limit 1;
  `)
  return result.rows[0]
}

const claimRequest = async (request) => {
  await database.exec("set role service_role;")
  const result = await database.query(`
    select public.worker_claim_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${request.queue_message_id}',
      '${request.id}',
      '${request.generation}',
      60
    ) as claim;
  `)
  const claim = result.rows[0].claim
  assert.equal(claim.status, "claimed")
  const started = await database.query(`
    select public.worker_start_enrichment_attempt(
      '${request.id}',
      '${request.generation}',
      '${claim.lease_token}'
    ) as started;
  `)
  assert.equal(started.rows[0].started, true)
  return claim
}

const reserveAsset = async (request, claim, assetId, kind, contentType) => {
  const result = await database.query(`
    select public.worker_reserve_bookmark_asset(
      '${request.id}',
      '${request.generation}',
      '${claim.lease_token}',
      '${assetId}',
      '${kind}',
      '${contentType}'
    ) as object_path;
  `)
  return result.rows[0].object_path
}

const markAssetReady = async (
  request,
  claim,
  assetId,
  byteSize,
  width,
  height
) => {
  const result = await database.query(`
    select public.worker_mark_bookmark_asset_ready(
      '${request.id}',
      '${request.generation}',
      '${claim.lease_token}',
      '${assetId}',
      '${SHA_256_HEX}',
      ${byteSize},
      ${width},
      ${height}
    ) as ready;
  `)
  return result.rows[0].ready
}

const finishSuccess = async (
  request,
  claim,
  title,
  faviconAssetId,
  ogImageAssetId
) => {
  const result = await database.query(`
    select public.worker_finish_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${request.queue_message_id}',
      '${request.id}',
      '${request.generation}',
      '${claim.lease_token}',
      true,
      '${title}',
      'example.com',
      ${faviconAssetId === null ? "null" : `'${faviconAssetId}'`},
      ${ogImageAssetId === null ? "null" : `'${ogImageAssetId}'`},
      null,
      null,
      null,
      null
    ) as state;
  `)
  assert.equal(result.rows[0].state, "completed")
  await database.exec("reset role;")
}

const requestReenrichment = async (bookmarkId, key) => {
  await setAuthenticatedUser(USER_ONE)
  await database.query(`
    select public.request_bookmark_reenrichment(
      ${bookmarkId},
      '${key}'
    );
  `)
  await database.exec("reset role;")
  return readRequest(bookmarkId)
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
    values
      ('${USER_ONE}', 'one@example.invalid', '{}'),
      ('${USER_TWO}', 'two@example.invalid', '{}');
  `)

  const wakeSchedules = await database.query(`
    select jobname, schedule
    from cron.job
    where jobname in (
      'reway-enrichment-interactive-wake',
      'reway-enrichment-bulk-wake'
    )
    order by jobname;
  `)
  assert.deepEqual(wakeSchedules.rows, [
    {
      jobname: "reway-enrichment-bulk-wake",
      schedule: "30 seconds",
    },
    {
      jobname: "reway-enrichment-interactive-wake",
      schedule: "30 seconds",
    },
  ])

  const unconfiguredWake = await database.query(`
    select private.request_enrichment_worker_wake(
      '${INTERACTIVE_QUEUE}'
    ) as request_id;
  `)
  assert.equal(unconfiguredWake.rows[0].request_id, null)

  await database.exec(`
    insert into vault.secrets (name, secret)
    values
      ('reway_worker_api_key', 'test-api-key'),
      ('reway_worker_url', 'https://worker.example.invalid'),
      ('reway_worker_wake_token', 'test-wake-token');
  `)
  await createBookmark(USER_ONE, "dddddddd-dddd-4ddd-8ddd-dddddddddd01", "wake")
  const wakeRequests = await database.query(`
    select body, timeout_milliseconds
    from net.http_request_queue
    order by id;
  `)
  assert.deepEqual(wakeRequests.rows, [
    {
      body: { queue_name: INTERACTIVE_QUEUE },
      timeout_milliseconds: 15000,
    },
  ])
  await database.exec("truncate table net.http_request_queue; begin;")
  await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
    "wake-batch-one"
  )
  await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd03",
    "wake-batch-two"
  )
  await database.exec("commit;")
  const coalescedWakeRequests = await database.query(`
    select count(*)::integer as count
    from net.http_request_queue;
  `)
  assert.equal(coalescedWakeRequests.rows[0].count, 1)
  await assert.rejects(
    database.query(
      "select private.request_enrichment_worker_wake('reway_transfer_export');"
    ),
    /Invalid wake queue/
  )

  const bucket = await database.query(`
    select public, file_size_limit, allowed_mime_types
    from storage.buckets
    where id = 'bookmark-assets';
  `)
  assert.deepEqual(bucket.rows, [
    {
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
      file_size_limit: 262144,
      public: false,
    },
  ])
  const assetTableSecurity = await database.query(`
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'private.bookmark_assets'::regclass;
  `)
  assert.deepEqual(assetTableSecurity.rows, [
    { relforcerowsecurity: true, relrowsecurity: true },
  ])
  const assetTableGrants = await database.query(`
    select grantee, privilege_type
    from information_schema.table_privileges
    where table_schema = 'private'
      and table_name = 'bookmark_assets'
      and grantee in ('anon', 'authenticated', 'service_role');
  `)
  assert.deepEqual(assetTableGrants.rows, [])

  await setAuthenticatedUser(USER_ONE)
  await assert.rejects(
    database.query(
      `select public.create_bookmark(
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        $1,
        'Too long'
      );`,
      ["https://example.com/" + "a".repeat(8192)]
    ),
    /bookmarks_url_length_check/
  )
  const urlPrefix = "https://example.com/"
  const maximumUrl = urlPrefix + "b".repeat(8192 - urlPrefix.length)
  const maximumUrlBookmark = await database.query(
    `select (public.create_bookmark(
      'dddddddd-dddd-4ddd-8ddd-ddddddddddde',
      $1,
      'At the URL limit'
    )).id as bookmark_id;`,
    [maximumUrl]
  )
  assert.ok(maximumUrlBookmark.rows[0].bookmark_id)
  await database.exec("reset role;")

  const firstBatchBookmarkId = await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd11",
    "batch-one"
  )
  const secondBatchBookmarkId = await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd12",
    "batch-two"
  )
  const firstBatchRequest = await readRequest(firstBatchBookmarkId)
  const secondBatchRequest = await readRequest(secondBatchBookmarkId)
  const batchMessages = [firstBatchRequest, secondBatchRequest].map(
    (request) => ({
      generation: String(request.generation),
      message_id: String(request.queue_message_id),
      request_id: request.id,
    })
  )
  await database.exec("set role service_role;")
  const preparedBatch = await database.query(
    `select public.worker_prepare_enrichment_batch(
      '${INTERACTIVE_QUEUE}',
      $1::jsonb,
      60
    ) as prepared;`,
    [JSON.stringify(batchMessages)]
  )
  assert.deepEqual(
    preparedBatch.rows[0].prepared.map((prepared) => ({
      attempt_count: prepared.attempt_count,
      fallback_title: prepared.fallback_title,
      message_id: prepared.message_id,
      status: prepared.status,
      url: prepared.url,
    })),
    [
      {
        attempt_count: 1,
        fallback_title: "Bookmark batch-one",
        message_id: String(firstBatchRequest.queue_message_id),
        status: "claimed",
        url: "https://example.com/batch-one",
      },
      {
        attempt_count: 1,
        fallback_title: "Bookmark batch-two",
        message_id: String(secondBatchRequest.queue_message_id),
        status: "claimed",
        url: "https://example.com/batch-two",
      },
    ]
  )
  const batchResults = preparedBatch.rows[0].prepared.map(
    (prepared, index) => ({
      generation: batchMessages[index].generation,
      lease_token: prepared.lease_token,
      message_id: prepared.message_id,
      request_id: batchMessages[index].request_id,
      result_domain: "example.com",
      result_failure_class: null,
      result_favicon_asset_id: null,
      result_internal_error: null,
      result_og_image_asset_id: null,
      result_public_error_code: null,
      result_title: `Batch title ${index + 1}`,
      retry_at: null,
      succeeded: true,
    })
  )
  const finishedBatch = await database.query(
    `select public.worker_finish_enrichment_batch(
      '${INTERACTIVE_QUEUE}',
      $1::jsonb
    ) as finished;`,
    [JSON.stringify(batchResults)]
  )
  assert.deepEqual(finishedBatch.rows[0].finished, [
    {
      finish_state: "completed",
      message_id: String(firstBatchRequest.queue_message_id),
      terminal_delete_outcome: "deleted",
    },
    {
      finish_state: "completed",
      message_id: String(secondBatchRequest.queue_message_id),
      terminal_delete_outcome: "deleted",
    },
  ])
  await assert.rejects(
    database.query(
      `select public.worker_prepare_enrichment_batch(
        '${INTERACTIVE_QUEUE}',
        $1::jsonb,
        60
      );`,
      [
        JSON.stringify([
          ...batchMessages,
          {
            generation: "1",
            message_id: "999999",
            request_id: "dddddddd-dddd-4ddd-8ddd-dddddddddd99",
          },
        ]),
      ]
    ),
    /Invalid batch preparation/
  )
  await database.exec("reset role;")

  const batchedBookmarks = await database.query(`
    select id, metadata_status, title
    from public.bookmarks
    where id in (${firstBatchBookmarkId}, ${secondBatchBookmarkId})
    order by id;
  `)
  assert.deepEqual(batchedBookmarks.rows, [
    {
      id: firstBatchBookmarkId,
      metadata_status: "enriched",
      title: "Batch title 1",
    },
    {
      id: secondBatchBookmarkId,
      metadata_status: "enriched",
      title: "Batch title 2",
    },
  ])

  const rejectedBatchBookmarkId = await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd13",
    "batch-rejected"
  )
  const acceptedBatchBookmarkId = await createBookmark(
    USER_ONE,
    "dddddddd-dddd-4ddd-8ddd-dddddddddd14",
    "batch-accepted"
  )
  const rejectedBatchRequest = await readRequest(rejectedBatchBookmarkId)
  const acceptedBatchRequest = await readRequest(acceptedBatchBookmarkId)
  const isolatedBatchMessages = [
    rejectedBatchRequest,
    acceptedBatchRequest,
  ].map((request) => ({
    generation: String(request.generation),
    message_id: String(request.queue_message_id),
    request_id: request.id,
  }))
  await database.exec("set role service_role;")
  const isolatedPreparedBatch = await database.query(
    `select public.worker_prepare_enrichment_batch(
      '${INTERACTIVE_QUEUE}',
      $1::jsonb,
      60
    ) as prepared;`,
    [JSON.stringify(isolatedBatchMessages)]
  )
  const isolatedResults = isolatedPreparedBatch.rows[0].prepared.map(
    (prepared, index) => ({
      generation: isolatedBatchMessages[index].generation,
      lease_token: prepared.lease_token,
      message_id: prepared.message_id,
      request_id: isolatedBatchMessages[index].request_id,
      result_domain: "example.com",
      result_failure_class: null,
      result_favicon_asset_id: null,
      result_internal_error: null,
      result_og_image_asset_id: null,
      result_public_error_code: null,
      result_title: index === 0 ? "" : "Isolated success",
      retry_at: null,
      succeeded: true,
    })
  )
  const isolatedFinishedBatch = await database.query(
    `select public.worker_finish_enrichment_batch(
      '${INTERACTIVE_QUEUE}',
      $1::jsonb
    ) as finished;`,
    [JSON.stringify(isolatedResults)]
  )
  assert.deepEqual(isolatedFinishedBatch.rows[0].finished, [
    {
      finish_state: "rejected",
      message_id: String(rejectedBatchRequest.queue_message_id),
      terminal_delete_outcome: null,
    },
    {
      finish_state: "completed",
      message_id: String(acceptedBatchRequest.queue_message_id),
      terminal_delete_outcome: "deleted",
    },
  ])
  await database.exec("reset role;")
  const isolatedRequestStates = await database.query(`
    select id, state
    from private.enrichment_requests
    where id in (
      '${rejectedBatchRequest.id}',
      '${acceptedBatchRequest.id}'
    )
    order by id;
  `)
  assert.deepEqual(
    new Map(isolatedRequestStates.rows.map((row) => [row.id, row.state])),
    new Map([
      [rejectedBatchRequest.id, "running"],
      [acceptedBatchRequest.id, "completed"],
    ])
  )

  const bookmarkId = await createBookmark(
    USER_ONE,
    "10000000-0000-4000-8000-000000000001",
    "first"
  )
  const secondBookmarkId = await createBookmark(
    USER_ONE,
    "10000000-0000-4000-8000-000000000002",
    "second"
  )
  await createBookmark(
    USER_TWO,
    "20000000-0000-4000-8000-000000000001",
    "other-user"
  )

  const firstRequest = await readRequest(bookmarkId)
  const firstClaim = await claimRequest(firstRequest)
  const enrichmentBookmark = await database.query(`
    select public.worker_read_enrichment_bookmark_id(
      '${firstRequest.id}',
      '${firstRequest.generation}',
      '${firstClaim.lease_token}'
    ) as bookmark_id;
  `)
  assert.equal(enrichmentBookmark.rows[0].bookmark_id, String(bookmarkId))
  const staleEnrichmentBookmark = await database.query(`
    select public.worker_read_enrichment_bookmark_id(
      '${firstRequest.id}',
      '${firstRequest.generation}',
      '99999999-9999-4999-8999-999999999999'
    ) as bookmark_id;
  `)
  assert.equal(staleEnrichmentBookmark.rows[0].bookmark_id, null)
  const firstPath = await reserveAsset(
    firstRequest,
    firstClaim,
    FIRST_ASSET,
    "favicon",
    "image/png"
  )
  assert.equal(firstPath, `${USER_ONE}/bookmark-assets/${FIRST_ASSET}.png`)
  assert.equal(
    await reserveAsset(
      firstRequest,
      firstClaim,
      FIRST_ASSET,
      "favicon",
      "image/png"
    ),
    firstPath
  )
  await assert.rejects(
    reserveAsset(
      firstRequest,
      firstClaim,
      EXCESS_ASSET,
      "favicon",
      "image/png"
    ),
    /bookmark_assets_request_attempt_kind_key/
  )
  await assert.rejects(
    database.query(`
      select public.worker_reserve_bookmark_asset(
        '${firstRequest.id}',
        '${firstRequest.generation}',
        '99999999-9999-4999-8999-999999999999',
        '99999999-9999-4999-8999-999999999998',
        'favicon',
        'image/png'
      );
    `),
    /Asset reservation rejected/
  )
  assert.equal(
    await markAssetReady(firstRequest, firstClaim, FIRST_ASSET, 32768, 64, 64),
    true
  )
  assert.equal(
    await markAssetReady(firstRequest, firstClaim, FIRST_ASSET, 32768, 64, 64),
    true
  )

  await reserveAsset(
    firstRequest,
    firstClaim,
    OVERSIZED_ASSET,
    "og_image",
    "image/webp"
  )
  await assert.rejects(
    markAssetReady(
      firstRequest,
      firstClaim,
      OVERSIZED_ASSET,
      262145,
      1200,
      630
    ),
    /bookmark_assets_size_check/
  )

  await finishSuccess(
    firstRequest,
    firstClaim,
    "First enriched",
    FIRST_ASSET,
    null
  )
  const firstBookmark = await database.query(`
    select title, domain, metadata_status, favicon_url, og_image_url,
      favicon_asset_id, og_image_asset_id
    from public.bookmarks
    where id = ${bookmarkId};
  `)
  assert.deepEqual(firstBookmark.rows, [
    {
      domain: "example.com",
      favicon_asset_id: FIRST_ASSET,
      favicon_url: null,
      metadata_status: "enriched",
      og_image_asset_id: null,
      og_image_url: null,
      title: "First enriched",
    },
  ])
  const unusedFirstAttempt = await database.query(`
    select state
    from private.bookmark_assets
    where id = '${OVERSIZED_ASSET}';
  `)
  assert.equal(unusedFirstAttempt.rows[0].state, "delete_pending")

  await setAuthenticatedUser(USER_ONE)
  const faviconPaths = await database.query(`
    select *
    from public.read_bookmark_asset_signing_paths(
      array[${bookmarkId}]::bigint[]
    );
  `)
  assert.equal(faviconPaths.rows.length, 1)
  assert.deepEqual(faviconPaths.rows[0], {
    asset_id: FIRST_ASSET,
    asset_kind: "favicon",
    bookmark_id: bookmarkId,
    byte_size: 32768,
    content_type: "image/png",
    height: 64,
    object_path: firstPath,
    width: 64,
  })
  await assert.rejects(
    database.query(`select * from private.bookmark_assets;`),
    /permission denied/
  )
  await assert.rejects(
    database.query(`
      select *
      from public.read_bookmark_asset_signing_paths(
        array[${bookmarkId}, ${bookmarkId}]::bigint[]
      );
    `),
    /Invalid asset request/
  )
  await assert.rejects(
    database.query(`
      select *
      from public.read_bookmark_asset_signing_paths(
        array(select generate_series(1, 97)::bigint)
      );
    `),
    /Invalid asset request/
  )

  await setAuthenticatedUser(USER_TWO)
  const crossUserPaths = await database.query(`
    select *
    from public.read_bookmark_asset_signing_paths(
      array[${bookmarkId}]::bigint[],
      true
    );
  `)
  assert.equal(crossUserPaths.rows.length, 0)
  await database.exec("reset role;")

  const staleRequest = await readRequest(secondBookmarkId)
  const staleClaim = await claimRequest(staleRequest)
  await reserveAsset(
    staleRequest,
    staleClaim,
    STALE_ASSET,
    "favicon",
    "image/png"
  )
  assert.equal(
    await markAssetReady(staleRequest, staleClaim, STALE_ASSET, 1000, 32, 32),
    true
  )
  await requestReenrichment(
    secondBookmarkId,
    "30000000-0000-4000-8000-000000000003"
  )
  await database.exec("set role service_role;")
  await assert.rejects(
    reserveAsset(
      staleRequest,
      staleClaim,
      STALE_EXTRA_ASSET,
      "favicon",
      "image/png"
    ),
    /Asset reservation rejected/
  )
  const staleFinish = await database.query(`
    select public.worker_finish_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${staleRequest.queue_message_id}',
      '${staleRequest.id}',
      '${staleRequest.generation}',
      '${staleClaim.lease_token}',
      true,
      'Stale result',
      'example.com',
      '${STALE_ASSET}',
      null,
      null,
      null,
      null,
      null
    ) as state;
  `)
  assert.equal(staleFinish.rows[0].state, "cancelled")
  await database.exec("reset role;")
  const staleState = await database.query(`
    select request.state as request_state, asset.state as asset_state
    from private.enrichment_requests as request
    join private.bookmark_assets as asset on asset.request_id = request.id
    where request.id = '${staleRequest.id}'
      and asset.id = '${STALE_ASSET}';
  `)
  assert.deepEqual(staleState.rows, [
    { asset_state: "delete_pending", request_state: "cancelled" },
  ])

  const replacementRequest = await requestReenrichment(
    bookmarkId,
    "30000000-0000-4000-8000-000000000001"
  )
  const replacementClaim = await claimRequest(replacementRequest)
  await reserveAsset(
    replacementRequest,
    replacementClaim,
    REPLACEMENT_FAVICON,
    "favicon",
    "image/webp"
  )
  await reserveAsset(
    replacementRequest,
    replacementClaim,
    REPLACEMENT_OG_IMAGE,
    "og_image",
    "image/jpeg"
  )
  assert.equal(
    await markAssetReady(
      replacementRequest,
      replacementClaim,
      REPLACEMENT_FAVICON,
      12000,
      64,
      64
    ),
    true
  )
  assert.equal(
    await markAssetReady(
      replacementRequest,
      replacementClaim,
      REPLACEMENT_OG_IMAGE,
      262144,
      1200,
      630
    ),
    true
  )
  await finishSuccess(
    replacementRequest,
    replacementClaim,
    "Replacement enriched",
    REPLACEMENT_FAVICON,
    REPLACEMENT_OG_IMAGE
  )

  const replacementStates = await database.query(`
    select id, state
    from private.bookmark_assets
    where id in (
      '${FIRST_ASSET}',
      '${REPLACEMENT_FAVICON}',
      '${REPLACEMENT_OG_IMAGE}'
    )
    order by id;
  `)
  assert.deepEqual(replacementStates.rows, [
    { id: FIRST_ASSET, state: "delete_pending" },
    { id: REPLACEMENT_FAVICON, state: "active" },
    { id: REPLACEMENT_OG_IMAGE, state: "active" },
  ])

  const failedRequest = await requestReenrichment(
    bookmarkId,
    "30000000-0000-4000-8000-000000000002"
  )
  const failedClaim = await claimRequest(failedRequest)
  await reserveAsset(
    failedRequest,
    failedClaim,
    FAILED_ASSET,
    "favicon",
    "image/png"
  )
  assert.equal(
    await markAssetReady(
      failedRequest,
      failedClaim,
      FAILED_ASSET,
      1000,
      32,
      32
    ),
    true
  )
  const failedFinish = await database.query(`
    select public.worker_finish_enrichment_message(
      '${INTERACTIVE_QUEUE}',
      '${failedRequest.queue_message_id}',
      '${failedRequest.id}',
      '${failedRequest.generation}',
      '${failedClaim.lease_token}',
      false,
      null,
      null,
      null,
      null,
      'permanent',
      'fetch_failed',
      null,
      null
    ) as state;
  `)
  assert.equal(failedFinish.rows[0].state, "failed")
  await database.exec("reset role;")

  const preservedBookmark = await database.query(`
    select title, domain, metadata_status, favicon_asset_id, og_image_asset_id
    from public.bookmarks
    where id = ${bookmarkId};
  `)
  assert.deepEqual(preservedBookmark.rows, [
    {
      domain: "example.com",
      favicon_asset_id: REPLACEMENT_FAVICON,
      metadata_status: "failed",
      og_image_asset_id: REPLACEMENT_OG_IMAGE,
      title: "Replacement enriched",
    },
  ])
  const failedAssetState = await database.query(`
    select state
    from private.bookmark_assets
    where id = '${FAILED_ASSET}';
  `)
  assert.equal(failedAssetState.rows[0].state, "delete_pending")

  await setAuthenticatedUser(USER_ONE)
  const preservedPaths = await database.query(`
    select asset_id, asset_kind
    from public.read_bookmark_asset_signing_paths(
      array[${bookmarkId}]::bigint[],
      true
    );
  `)
  assert.deepEqual(preservedPaths.rows, [
    { asset_id: REPLACEMENT_FAVICON, asset_kind: "favicon" },
    { asset_id: REPLACEMENT_OG_IMAGE, asset_kind: "og_image" },
  ])
  await database.exec("reset role;")

  await setAuthenticatedUser(USER_ONE)
  await assert.rejects(
    database.query(`
      select public.request_bookmark_reenrichment(
        ${secondBookmarkId},
        '30000000-0000-4000-8000-000000000002'
      );
    `),
    /Idempotency key conflict/
  )
  await database.exec("reset role;")

  await setAuthenticatedUser(USER_ONE)
  await database.exec(`
    select public.trash_bookmarks(array[${bookmarkId}]::bigint[]);
    select public.delete_bookmarks_forever(array[${bookmarkId}]::bigint[]);
  `)
  await database.exec("reset role;")
  const orphanedAssets = await database.query(`
    select count(*)::integer as count
    from private.bookmark_assets
    where id in ('${REPLACEMENT_FAVICON}', '${REPLACEMENT_OG_IMAGE}')
      and bookmark_id is null
      and state = 'delete_pending';
  `)
  assert.equal(orphanedAssets.rows[0].count, 2)

  await database.exec("set role service_role;")
  const cleanupClaims = await database.query(`
    select * from public.worker_claim_bookmark_asset_cleanup(100, 60);
  `)
  const faviconCleanup = cleanupClaims.rows.find(
    (claim) => claim.asset_id === REPLACEMENT_FAVICON
  )
  assert.ok(faviconCleanup)
  const retryResult = await database.query(`
    select public.worker_finish_bookmark_asset_cleanup(
      '${faviconCleanup.asset_id}',
      '${faviconCleanup.cleanup_lease_token}',
      false,
      clock_timestamp() + interval '1 minute'
    ) as finished;
  `)
  assert.equal(retryResult.rows[0].finished, true)
  await database.exec("reset role;")

  await database.exec(`
    update private.bookmark_assets
    set delete_after = clock_timestamp() - interval '1 second'
    where id = '${REPLACEMENT_FAVICON}';
    set role service_role;
  `)
  const retryClaims = await database.query(`
    select * from public.worker_claim_bookmark_asset_cleanup(100, 60);
  `)
  const retriedFavicon = retryClaims.rows.find(
    (claim) => claim.asset_id === REPLACEMENT_FAVICON
  )
  assert.ok(retriedFavicon)
  assert.equal(retriedFavicon.cleanup_attempt_count, 2)
  const deleteResult = await database.query(`
    select public.worker_finish_bookmark_asset_cleanup(
      '${retriedFavicon.asset_id}',
      '${retriedFavicon.cleanup_lease_token}',
      true,
      null
    ) as finished;
  `)
  assert.equal(deleteResult.rows[0].finished, true)
  const repeatedDelete = await database.query(`
    select public.worker_finish_bookmark_asset_cleanup(
      '${retriedFavicon.asset_id}',
      '${retriedFavicon.cleanup_lease_token}',
      true,
      null
    ) as finished;
  `)
  assert.equal(repeatedDelete.rows[0].finished, false)
  await database.exec("reset role;")

  await database.exec(`
    update private.bookmark_assets
    set deleted_at = clock_timestamp() - interval '8 days'
    where id = '${REPLACEMENT_FAVICON}';
    set role service_role;
  `)
  const purged = await database.query(`
    select private.purge_deleted_bookmark_asset_rows(100) as count;
  `)
  assert.equal(purged.rows[0].count, 1)
  await database.exec("reset role;")

  const publicGrants = await database.query(`
    select routine_name, grantee
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in (
        'read_bookmark_asset_signing_paths',
        'worker_reserve_bookmark_asset',
        'worker_mark_bookmark_asset_ready',
        'worker_read_enrichment_bookmark_id',
        'worker_finish_enrichment_message',
        'worker_prepare_enrichment_batch',
        'worker_finish_enrichment_batch',
        'worker_claim_bookmark_asset_cleanup',
        'worker_finish_bookmark_asset_cleanup'
      )
      and privilege_type = 'EXECUTE'
      and grantee in ('anon', 'authenticated', 'service_role')
    order by routine_name, grantee;
  `)
  assert.deepEqual(publicGrants.rows, [
    {
      grantee: "authenticated",
      routine_name: "read_bookmark_asset_signing_paths",
    },
    {
      grantee: "service_role",
      routine_name: "worker_claim_bookmark_asset_cleanup",
    },
    {
      grantee: "service_role",
      routine_name: "worker_finish_bookmark_asset_cleanup",
    },
    {
      grantee: "service_role",
      routine_name: "worker_finish_enrichment_batch",
    },
    {
      grantee: "service_role",
      routine_name: "worker_finish_enrichment_message",
    },
    {
      grantee: "service_role",
      routine_name: "worker_mark_bookmark_asset_ready",
    },
    {
      grantee: "service_role",
      routine_name: "worker_prepare_enrichment_batch",
    },
    {
      grantee: "service_role",
      routine_name: "worker_read_enrichment_bookmark_id",
    },
    {
      grantee: "service_role",
      routine_name: "worker_reserve_bookmark_asset",
    },
  ])

  console.log(
    JSON.stringify({
      assetFunctions: 9,
      checks: "passed",
      cleanupAttempts: 2,
      signingRows: faviconPaths.rows.length,
    })
  )
} finally {
  await database.close()
}
