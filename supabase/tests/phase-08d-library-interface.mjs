import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const USER_ONE = "11111111-1111-4111-8111-111111111111"
const USER_TWO = "22222222-2222-4222-8222-222222222222"
const MIGRATIONS_DIRECTORY = resolve("supabase/migrations")
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

  const migrationNames = (await readdir(MIGRATIONS_DIRECTORY))
    .filter((name) => name.endsWith(".sql"))
    .sort()
  for (const migrationName of migrationNames) {
    const migration = await readFile(
      resolve(MIGRATIONS_DIRECTORY, migrationName),
      "utf8"
    )
    await database.exec(migration)
  }

  await database.exec(`
    insert into auth.users (id, email)
    values
      ('${USER_ONE}', 'one@example.com'),
      ('${USER_TWO}', 'two@example.com');
  `)

  await setAuthenticatedUser(USER_ONE)
  const parent = await database.query(`
    insert into public.collections (user_id, name, icon, color, sort_order)
    values ('${USER_ONE}', 'Research', 'research', 'teal', 'a0')
    returning id;
  `)
  const parentId = parent.rows[0].id
  const child = await database.query(`
    insert into public.collections (
      user_id,
      parent_id,
      name,
      icon,
      color,
      sort_order
    ) values (
      '${USER_ONE}',
      ${parentId},
      'Reading',
      'book',
      'blue',
      'a0'
    ) returning id;
  `)
  const childId = child.rows[0].id
  const tags = await database.query(`
    with inserted_tags as (
      insert into public.tags (user_id, name, color, sort_order)
      values
        ('${USER_ONE}', 'Design', 'red', 'a0'),
        ('${USER_ONE}', 'Tools', 'green', 'b0')
      returning id, name
    )
    select id, name from inserted_tags order by id;
  `)
  const firstTagId = tags.rows[0].id
  const secondTagId = tags.rows[1].id
  const bookmark = await database.query(`
    select (public.create_bookmark(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'https://linear.app/research',
      'Linear research'
    )).*;
  `)
  const bookmarkId = bookmark.rows[0].id
  await database.exec(`
    insert into public.bookmark_collections (
      user_id,
      bookmark_id,
      collection_id,
      sort_order
    ) values ('${USER_ONE}', ${bookmarkId}, ${childId}, 'a0');
    insert into public.bookmark_tags (user_id, bookmark_id, tag_id)
    values ('${USER_ONE}', ${bookmarkId}, ${firstTagId});
  `)

  const searchRows = await database.query(`
    select result_kind, result_order, title, path
    from public.search_library('research');
  `)
  assert.deepEqual(
    searchRows.rows.map((row) => row.result_kind),
    ["bookmark", "collection", "collection"]
  )
  assert.equal(searchRows.rows[0].title, "Linear research")
  assert.deepEqual(
    searchRows.rows.slice(1).map((row) => row.path),
    ["Research", "Research / Reading"]
  )

  const replacedCount = await database.query(`
    select public.replace_bookmark_tags(
      ${bookmarkId},
      array[${secondTagId}]::bigint[]
    ) as count;
  `)
  assert.equal(replacedCount.rows[0].count, 1)
  const assignedTags = await database.query(`
    select tag_id
    from public.bookmark_tags
    where bookmark_id = ${bookmarkId};
  `)
  assert.deepEqual(assignedTags.rows, [{ tag_id: secondTagId }])

  await assert.rejects(
    database.query(`
      select public.replace_bookmark_tags(
        ${bookmarkId},
        array[${secondTagId}, ${secondTagId}]::bigint[]
      );
    `),
    /Tag IDs must be unique/
  )
  await assert.rejects(
    database.query("select * from public.search_library('', 32, 16);"),
    /Invalid search input/
  )

  await database.exec("reset role;")
  await database.query(`
    insert into public.bookmarks (user_id, client_request_id, url, title)
    values (
      '${USER_TWO}',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'https://private.example',
      'Private research'
    );
  `)
  await setAuthenticatedUser(USER_ONE)
  const isolatedSearch = await database.query(`
    select title from public.search_library('private');
  `)
  assert.deepEqual(isolatedSearch.rows, [])

  const grants = await database.query(`
    select routine_name, privilege_type
    from information_schema.routine_privileges
    where grantee = 'authenticated'
      and routine_schema = 'public'
      and routine_name in ('search_library', 'replace_bookmark_tags')
    order by routine_name;
  `)
  assert.deepEqual(grants.rows, [
    { privilege_type: "EXECUTE", routine_name: "replace_bookmark_tags" },
    { privilege_type: "EXECUTE", routine_name: "search_library" },
  ])

  await database.exec("reset role;")
  await database.exec(`
    insert into public.collections (user_id, name, icon, color, sort_order)
    select
      '${USER_ONE}',
      'Plan collection ' || value::text,
      'folder',
      'neutral',
      'z' || lpad(value::text, 8, '0')
    from generate_series(1, 10000) as value;
    analyze public.collections;
  `)
  const collectionSearchPlan = await explain(`
    select collection.id
    from public.collections as collection
    left join public.collections as parent
      on parent.user_id = collection.user_id
      and parent.id = collection.parent_id
    where collection.user_id = '${USER_ONE}'
      and (
        collection.normalized_name operator(extensions.%) '9999'
        or parent.normalized_name operator(extensions.%) '9999'
        or collection.normalized_name like '9999%'
        or parent.normalized_name like '9999%'
      )
    order by greatest(
      extensions.similarity(collection.normalized_name, '9999'),
      coalesce(extensions.similarity(parent.normalized_name, '9999'), 0)
    ) desc,
    collection.id
    limit 16
  `)
  assert.doesNotMatch(
    collectionSearchPlan,
    /"Node Type":"Seq Scan","Parallel Aware":false,"Async Capable":false,"Relation Name":"collections","Alias":"collection"/,
    "collection search used a sequential scan"
  )

  console.log(
    JSON.stringify({
      checks: "passed",
      collectionSearchRows: 10000,
      functions: 2,
      parentPath: true,
    })
  )
} finally {
  await database.close()
}
