import assert from "node:assert/strict"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

import {
  applyPhase8Migrations,
  installPhase8ExternalStubs,
} from "./pglite-migrations.mjs"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const database = new PGlite({ extensions: { pg_trgm, pgcrypto } })

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
    values ('${USER_ID}', 'rebalance@example.invalid', '{}');
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${USER_ID}', false);
  `)

  const bookmarks = await database.query(`
    select (public.create_bookmark(
      gen_random_uuid(),
      'https://example.com/' || value::text,
      'Bookmark ' || value::text
    )).id
    from generate_series(1, 2) as value;
  `)
  const [firstBookmarkId, secondBookmarkId] = bookmarks.rows.map(
    (row) => row.id
  )

  const collections = await database.query(`
    insert into public.collections (user_id, name, icon, color, sort_order)
    values
      ('${USER_ID}', 'First', 'folder', 'neutral', 'a0'),
      ('${USER_ID}', 'Second', 'archive', 'blue', 'b0')
    returning id;
  `)
  const [firstCollectionId, secondCollectionId] = collections.rows.map(
    (row) => row.id
  )

  const tags = await database.query(`
    insert into public.tags (user_id, name, color, sort_order)
    values
      ('${USER_ID}', 'First', 'neutral', 'a0'),
      ('${USER_ID}', 'Second', 'violet', 'b0')
    returning id;
  `)
  const [firstTagId, secondTagId] = tags.rows.map((row) => row.id)

  await database.exec(`
    insert into public.bookmark_collections (
      user_id,
      bookmark_id,
      collection_id,
      sort_order
    ) values
      ('${USER_ID}', ${firstBookmarkId}, ${firstCollectionId}, 'a0'),
      ('${USER_ID}', ${secondBookmarkId}, ${firstCollectionId}, 'b0');
  `)

  const collectionVersion = await database.query(`
    select public.rebalance_collections(
      null,
      array[${firstCollectionId}, ${secondCollectionId}]::bigint[],
      array['b0', 'a0']::text[],
      0
    ) as version;
  `)
  const tagVersion = await database.query(`
    select public.rebalance_tags(
      array[${firstTagId}, ${secondTagId}]::bigint[],
      array['b0', 'a0']::text[],
      0
    ) as version;
  `)
  const bookmarkVersion = await database.query(`
    select public.rebalance_bookmarks(
      ${firstCollectionId},
      array[${firstBookmarkId}, ${secondBookmarkId}]::bigint[],
      array['b0', 'a0']::text[],
      0
    ) as version;
  `)

  assert.equal(Number(collectionVersion.rows[0].version), 1)
  assert.equal(Number(tagVersion.rows[0].version), 1)
  assert.equal(Number(bookmarkVersion.rows[0].version), 1)

  const rebalancedRows = await database.query(`
    select
      (select sort_order from public.collections where id = ${firstCollectionId})
        as first_collection_order,
      (select sort_order from public.collections where id = ${secondCollectionId})
        as second_collection_order,
      (select sort_order from public.tags where id = ${firstTagId})
        as first_tag_order,
      (select sort_order from public.tags where id = ${secondTagId})
        as second_tag_order,
      (
        select sort_order
        from public.bookmark_collections
        where bookmark_id = ${firstBookmarkId}
          and collection_id = ${firstCollectionId}
      ) as first_bookmark_order,
      (
        select sort_order
        from public.bookmark_collections
        where bookmark_id = ${secondBookmarkId}
          and collection_id = ${firstCollectionId}
      ) as second_bookmark_order;
  `)
  assert.deepEqual(rebalancedRows.rows[0], {
    first_bookmark_order: "b0",
    first_collection_order: "b0",
    first_tag_order: "b0",
    second_bookmark_order: "a0",
    second_collection_order: "a0",
    second_tag_order: "a0",
  })

  await assert.rejects(
    database.query(`
      select public.rebalance_tags(
        array[${firstTagId}, ${secondTagId}]::bigint[],
        array['a0', 'b0']::text[],
        0
      );
    `),
    /Tag order changed/
  )

  process.stdout.write(
    `${JSON.stringify({ checks: "passed", rebalances: 3 })}\n`
  )
} finally {
  await database.close()
}
