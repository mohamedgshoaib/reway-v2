-- Run only after the Phase 8C migration exists on the target project.
-- The final expected exception rolls back every fixture in this transaction.

begin;
set local reway.suppress_broadcast = 'on';

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase8c-one@example.invalid',
    '{"given_name":"Mira"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase8c-two@example.invalid',
    '{}'::jsonb
  );

insert into public.bookmarks (user_id, client_request_id, url, title)
values (
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'https://phase8c-two.invalid',
  'Other owner'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

do $authenticated_checks$
declare
  created_bookmark_id bigint;
  repeated_bookmark_id bigint;
  second_bookmark_id bigint;
  collection_id bigint;
  child_collection_id bigint;
  second_collection_id bigint;
  tag_id bigint;
  second_tag_id bigint;
  collection_version bigint;
  tag_version bigint;
  bookmark_version bigint;
  checked_collection_id bigint;
  checked_tag_id bigint;
  inserted_visits integer;
  repeated_visits integer;
  visible_bookmarks integer;
  stored_collection_count integer;
  stored_visit_count bigint;
  rejected boolean;
begin
  select (public.create_bookmark(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'https://phase8c-one.invalid',
    'Original title'
  )).id into created_bookmark_id;

  select (public.create_bookmark(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'https://phase8c-changed.invalid',
    'Changed title'
  )).id into repeated_bookmark_id;

  if repeated_bookmark_id is distinct from created_bookmark_id then
    raise exception 'idempotent bookmark retry failed';
  end if;

  insert into public.collections (user_id, name, icon, color, sort_order)
  values (
    '11111111-1111-4111-8111-111111111111',
    'Research',
    'research',
    'teal',
    'a0'
  )
  returning id into collection_id;

  insert into public.collections (
    user_id,
    parent_id,
    name,
    icon,
    color,
    sort_order
  )
  values (
    '11111111-1111-4111-8111-111111111111',
    collection_id,
    'Reading',
    'book',
    'blue',
    'a0'
  )
  returning id into child_collection_id;

  rejected := false;
  begin
    insert into public.collections (
      user_id,
      parent_id,
      name,
      icon,
      color,
      sort_order
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      child_collection_id,
      'Too deep',
      'folder',
      'neutral',
      'a0'
    );
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'third collection tier was accepted';
  end if;

  insert into public.tags (user_id, name, color, sort_order)
  values (
    '11111111-1111-4111-8111-111111111111',
    'Engineering',
    'blue',
    'a0'
  )
  returning id into tag_id;

  insert into public.collections (user_id, name, icon, color, sort_order)
  values (
    '11111111-1111-4111-8111-111111111111',
    'Archive',
    'archive',
    'neutral',
    'b0'
  )
  returning id into second_collection_id;

  insert into public.tags (user_id, name, color, sort_order)
  values (
    '11111111-1111-4111-8111-111111111111',
    'Design',
    'violet',
    'b0'
  )
  returning id into second_tag_id;

  select (public.create_bookmark(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'https://phase8c-second.invalid',
    'Second bookmark'
  )).id into second_bookmark_id;

  insert into public.bookmark_collections (
    user_id,
    bookmark_id,
    collection_id,
    sort_order
  )
  values (
    '11111111-1111-4111-8111-111111111111',
    created_bookmark_id,
    collection_id,
    'a0'
  );

  insert into public.bookmark_tags (user_id, bookmark_id, tag_id)
  values (
    '11111111-1111-4111-8111-111111111111',
    created_bookmark_id,
    tag_id
  );

  insert into public.bookmark_collections (
    user_id,
    bookmark_id,
    collection_id,
    sort_order
  )
  values (
    '11111111-1111-4111-8111-111111111111',
    second_bookmark_id,
    collection_id,
    'b0'
  );

  select public.rebalance_collections(
    null,
    array[collection_id, second_collection_id],
    array['b0', 'a0'],
    0
  ) into collection_version;
  select public.rebalance_tags(
    array[tag_id, second_tag_id],
    array['b0', 'a0'],
    0
  ) into tag_version;
  select public.rebalance_bookmarks(
    collection_id,
    array[created_bookmark_id, second_bookmark_id],
    array['b0', 'a0'],
    0
  ) into bookmark_version;

  if collection_version <> 1 or tag_version <> 1 or bookmark_version <> 1 then
    raise exception 'rebalance did not increment its scope version';
  end if;

  checked_collection_id := collection_id;
  checked_tag_id := tag_id;

  if not exists (
    select 1 from public.collections as collection
    where collection.id = checked_collection_id and collection.sort_order = 'b0'
  ) or not exists (
    select 1 from public.collections as collection
    where collection.id = second_collection_id and collection.sort_order = 'a0'
  ) or not exists (
    select 1 from public.tags as tag
    where tag.id = checked_tag_id and tag.sort_order = 'b0'
  ) or not exists (
    select 1 from public.tags as tag
    where tag.id = second_tag_id and tag.sort_order = 'a0'
  ) or not exists (
    select 1 from public.bookmark_collections as membership
    where membership.bookmark_id = created_bookmark_id
      and membership.collection_id = checked_collection_id
      and membership.sort_order = 'b0'
  ) or not exists (
    select 1 from public.bookmark_collections as membership
    where membership.bookmark_id = second_bookmark_id
      and membership.collection_id = checked_collection_id
      and membership.sort_order = 'a0'
  ) then
    raise exception 'rebalance did not replace every scoped order';
  end if;

  rejected := false;
  begin
    perform public.rebalance_tags(
      array[tag_id, second_tag_id],
      array['a0', 'b0'],
      0
    );
  exception when serialization_failure then
    rejected := true;
  end;
  if not rejected then
    raise exception 'stale rebalance version was accepted';
  end if;

  select public.record_bookmark_visits(
    array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[],
    array[created_bookmark_id]::bigint[]
  ) into inserted_visits;
  select public.record_bookmark_visits(
    array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[],
    array[created_bookmark_id]::bigint[]
  ) into repeated_visits;

  if inserted_visits <> 1 or repeated_visits <> 0 then
    raise exception 'visit retry was not idempotent';
  end if;

  select count(*)::integer
  into visible_bookmarks
  from public.bookmarks;

  if visible_bookmarks <> 2 then
    raise exception 'cross-user bookmark became visible';
  end if;

  select bookmark.collection_count, stats.visit_count
  into stored_collection_count, stored_visit_count
  from public.bookmarks as bookmark
  join public.bookmark_stats as stats on stats.bookmark_id = bookmark.id
  where bookmark.id = created_bookmark_id;

  if stored_collection_count <> 1 or stored_visit_count <> 1 then
    raise exception 'derived bookmark counters drifted';
  end if;

  rejected := false;
  begin
    perform 1 from private.bookmark_search limit 1;
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'authenticated role read private search rows';
  end if;

  perform public.trash_bookmarks(array[created_bookmark_id]::bigint[]);
  perform public.restore_bookmarks(array[created_bookmark_id]::bigint[]);
end;
$authenticated_checks$;

reset role;

do $owner_checks$
declare
  search_text text;
begin
  select searchable_text
  into search_text
  from private.bookmark_search as search
  join public.bookmarks as bookmark on bookmark.id = search.bookmark_id
  where search.user_id = '11111111-1111-4111-8111-111111111111'
    and bookmark.url = 'https://phase8c-one.invalid';

  if search_text not like '%Engineering%' then
    raise exception 'search projection missed tag text';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private')
      and relation.relkind = 'r'
      and not relation.relrowsecurity
  ) then
    raise exception 'a user-owned table lacks RLS';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'anon' and table_schema in ('public', 'private')
  ) then
    raise exception 'anon has application table grants';
  end if;

  if exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_bookmarks_to_collection',
        'create_bookmark',
        'delete_bookmarks_forever',
        'delete_collection',
        'delete_tag',
        'get_transfer_job_status',
        'move_bookmarks_to_collection',
        'record_bookmark_visits',
        'remove_bookmarks_from_collection',
        'reorder_bookmark',
        'reorder_collection',
        'reorder_tag',
        'request_bookmark_reenrichment',
        'restore_bookmarks',
        'trash_bookmarks'
      )
      and procedure.prosecdef
  ) then
    raise exception 'a public function uses security definer';
  end if;
end;
$owner_checks$;

set local role service_role;

do $worker_checks$
declare
  claimed record;
  started boolean;
  finished boolean;
  stale_finish boolean;
begin
  select *
  into strict claimed
  from private.claim_enrichment_requests('interactive', 1, 60);

  select private.start_enrichment_attempt(
    claimed.request_id,
    claimed.generation,
    claimed.lease_token
  ) into started;

  select private.finish_enrichment_request(
    claimed.request_id,
    claimed.generation,
    claimed.lease_token,
    true,
    'Enriched title'
  ) into finished;

  select private.finish_enrichment_request(
    claimed.request_id,
    claimed.generation,
    claimed.lease_token,
    true,
    'Stale title'
  ) into stale_finish;

  if not started or not finished or stale_finish then
    raise exception 'worker compare-and-set failed';
  end if;
end;
$worker_checks$;

reset role;
set local role anon;

do $anonymous_checks$
declare
  rejected boolean := false;
begin
  begin
    perform 1 from public.profiles limit 1;
  exception when insufficient_privilege then
    rejected := true;
  end;

  if not rejected then
    raise exception 'anon read application data';
  end if;
end;
$anonymous_checks$;

reset role;

do $finish$
begin
  raise exception 'phase8c_rollback hosted_checks=passed';
end;
$finish$;
