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
const database = new PGlite({ extensions: { pg_trgm, pgcrypto } })

const setAuthenticatedUser = async (userId) => {
  await database.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `)
}

const explain = async (query) => {
  const result = await database.query(
    `explain (analyze, buffers, format json) ${query}`
  )
  return JSON.stringify(result.rows)
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
      ('${USER_ONE}', 'mira@example.com', '{"given_name":"Mira"}'),
      ('${USER_TWO}', 'other@example.com', '{}');
  `)

  const accountRows = await database.query(`
    select
      (select count(*)::integer from public.profiles) as profiles,
      (select count(*)::integer from public.dashboard_preferences) as preferences;
  `)
  assert.deepEqual(accountRows.rows[0], { preferences: 2, profiles: 2 })

  await setAuthenticatedUser(USER_ONE)
  const firstSave = await database.query(`
    select (public.create_bookmark(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'https://example.com/one',
      'Example one'
    )).*;
  `)
  const bookmarkId = firstSave.rows[0].id
  const repeatedSave = await database.query(`
    select (public.create_bookmark(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'https://example.com/changed',
      'Changed title'
    )).*;
  `)
  assert.equal(repeatedSave.rows[0].id, bookmarkId)

  const collectionRows = await database.query(`
    insert into public.collections (user_id, name, icon, color, sort_order)
    values ('${USER_ONE}', 'Research', 'research', 'teal', 'a0')
    returning id;
  `)
  const collectionId = collectionRows.rows[0].id
  const tagRows = await database.query(`
    insert into public.tags (user_id, name, color, sort_order)
    values ('${USER_ONE}', 'Engineering', 'blue', 'a0')
    returning id;
  `)
  const tagId = tagRows.rows[0].id

  await database.exec(`
    insert into public.bookmark_collections (
      user_id,
      bookmark_id,
      collection_id,
      sort_order
    ) values ('${USER_ONE}', ${bookmarkId}, ${collectionId}, 'a0');
    insert into public.bookmark_tags (user_id, bookmark_id, tag_id)
    values ('${USER_ONE}', ${bookmarkId}, ${tagId});
  `)

  const firstVisit = await database.query(`
    select public.record_bookmark_visits(
      array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[],
      array[${bookmarkId}]::bigint[]
    ) as inserted;
  `)
  const repeatedVisit = await database.query(`
    select public.record_bookmark_visits(
      array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[],
      array[${bookmarkId}]::bigint[]
    ) as inserted;
  `)
  assert.equal(firstVisit.rows[0].inserted, 1)
  assert.equal(repeatedVisit.rows[0].inserted, 0)

  await database.exec("reset role;")
  const derivedRows = await database.query(`
    select
      bookmark.collection_count,
      stats.visit_count,
      search.searchable_text,
      octet_length(bookmark.url_fingerprint) as fingerprint_bytes
    from public.bookmarks as bookmark
    join public.bookmark_stats as stats on stats.bookmark_id = bookmark.id
    join private.bookmark_search as search on search.bookmark_id = bookmark.id
    where bookmark.id = ${bookmarkId};
  `)
  assert.equal(derivedRows.rows[0].collection_count, 1)
  assert.equal(derivedRows.rows[0].visit_count, 1)
  assert.equal(derivedRows.rows[0].fingerprint_bytes, 32)
  assert.match(derivedRows.rows[0].searchable_text, /Engineering/)

  await database.exec("set role service_role;")
  const messages = await database.query(`
    select * from public.worker_read_queue(
      'reway_enrichment_interactive',
      90,
      1
    );
  `)
  assert.equal(messages.rows.length, 1)
  const message = messages.rows[0]
  const requestId = message.envelope.request_id
  const generation = message.envelope.generation
  const claimRows = await database.query(`
    select public.worker_claim_enrichment_message(
      'reway_enrichment_interactive',
      '${message.message_id}',
      '${requestId}',
      '${generation}',
      60
    ) as claim;
  `)
  const claim = claimRows.rows[0].claim
  assert.equal(claim.status, "claimed")
  const attempt = await database.query(`
    select public.worker_start_enrichment_attempt(
      '${requestId}',
      '${generation}',
      '${claim.lease_token}'
    ) as started;
  `)
  assert.equal(attempt.rows[0].started, true)
  const finish = await database.query(`
    select public.worker_finish_enrichment_message(
      'reway_enrichment_interactive',
      '${message.message_id}',
      '${requestId}',
      '${generation}',
      '${claim.lease_token}',
      true,
      'Enriched title'
    ) as finished;
  `)
  assert.equal(finish.rows[0].finished, "completed")
  const deleted = await database.query(`
    select public.worker_delete_terminal_message(
      'reway_enrichment_interactive',
      '${message.message_id}'
    ) as deleted;
  `)
  assert.equal(deleted.rows[0].deleted, true)

  await database.exec("reset role;")
  await database.query(`
    insert into public.bookmarks (user_id, client_request_id, url, title)
    values (
      '${USER_TWO}',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'https://example.com/two',
      'Example two'
    );
  `)
  await setAuthenticatedUser(USER_ONE)
  const visibleBookmarks = await database.query(`
    select count(*)::integer as count from public.bookmarks;
  `)
  assert.equal(visibleBookmarks.rows[0].count, 1)

  await database.query(
    `select public.trash_bookmarks(array[${bookmarkId}]::bigint[]);`
  )
  await database.query(
    `select public.restore_bookmarks(array[${bookmarkId}]::bigint[]);`
  )

  await database.exec("reset role;")
  const benchmarkStart = performance.now()
  await database.exec(`
    insert into public.bookmarks (user_id, client_request_id, url, title)
    select
      '${USER_ONE}',
      gen_random_uuid(),
      'https://benchmark.example/' || value::text,
      'Benchmark ' || value::text
    from generate_series(1, 100000) as value;
    analyze public.bookmarks;
    analyze public.bookmark_stats;
    analyze private.bookmark_search;
  `)
  const benchmarkMilliseconds = Math.round(performance.now() - benchmarkStart)

  const plans = {
    active: await explain(`
      select id from public.bookmarks
      where user_id = '${USER_ONE}' and trashed_at is null
      order by created_at desc, id desc limit 50
    `),
    exactUrl: await explain(`
      select id from public.bookmarks
      where user_id = '${USER_ONE}'
        and url_fingerprint = extensions.digest(
          'https://benchmark.example/99999',
          'sha256'
        )
        and url = 'https://benchmark.example/99999'
    `),
    mostVisited: await explain(`
      select bookmark_id from public.bookmark_stats
      where user_id = '${USER_ONE}'
      order by visit_count desc, bookmark_id limit 50
    `),
    search: await explain(`
      select bookmark_id from private.bookmark_search
      where user_id = '${USER_ONE}'
        and search_vector @@ plainto_tsquery('simple', '99999')
      order by
        ts_rank(search_vector, plainto_tsquery('simple', '99999')) desc,
        bookmark_id
      limit 50
    `),
    searchLibrary: await explain(`
      select search.bookmark_id
      from private.bookmark_search as search
      join public.bookmarks as bookmark
        on bookmark.user_id = search.user_id
        and bookmark.id = search.bookmark_id
      where search.user_id = '${USER_ONE}'
        and bookmark.trashed_at is null
        and (
          search.search_vector @@ websearch_to_tsquery('simple', '99999')
          or search.searchable_text operator(extensions.%) '99999'
        )
      order by
        greatest(
          ts_rank_cd(
            search.search_vector,
            websearch_to_tsquery('simple', '99999')
          ),
          extensions.similarity(search.searchable_text, '99999')
        ) desc,
        bookmark.id desc
      limit 32
    `),
    uncollected: await explain(`
      select id from public.bookmarks
      where user_id = '${USER_ONE}'
        and trashed_at is null
        and collection_count = 0
      order by created_at desc, id desc limit 50
    `),
  }

  for (const [name, plan] of Object.entries(plans)) {
    assert.doesNotMatch(plan, /Seq Scan/, `${name} used a sequential scan`)
  }

  const catalog = await database.query(`
    select
      (
        select count(*)::integer
        from pg_class as relation
        join pg_namespace as namespace on namespace.oid = relation.relnamespace
        where namespace.nspname in ('public', 'private')
          and relation.relkind = 'r'
          and not relation.relrowsecurity
      ) as tables_without_rls,
      (
        select count(*)::integer
        from information_schema.role_table_grants
        where grantee = 'anon' and table_schema in ('public', 'private')
      ) as anon_table_grants,
      (
        select count(*)::integer
        from pg_proc as procedure
        join pg_namespace as namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public' and procedure.prosecdef
      ) as public_security_definers;
  `)
  assert.deepEqual(catalog.rows[0], {
    anon_table_grants: 0,
    public_security_definers: 0,
    tables_without_rls: 0,
  })

  process.stdout.write(
    `${JSON.stringify({
      benchmarkBookmarks: 100000,
      benchmarkMilliseconds,
      checks: "passed",
    })}\n`
  )
} finally {
  await database.close()
}
