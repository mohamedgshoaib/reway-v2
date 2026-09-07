-- Run only after the Phase 8D library-interface migration exists.
-- The final expected exception rolls back every fixture in this transaction.

begin;
set local reway.suppress_broadcast = 'on';

insert into auth.users (id, email)
values
  ('33333333-3333-4333-8333-333333333333', 'phase8d-one@example.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'phase8d-two@example.invalid');

insert into public.tags (user_id, name, color, sort_order)
values (
  '44444444-4444-4444-8444-444444444444',
  'Other owner',
  'neutral',
  'a0'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

do $phase8d_checks$
declare
  parent_id bigint;
  child_id bigint;
  first_tag_id bigint;
  second_tag_id bigint;
  other_tag_id bigint;
  created_bookmark_id bigint;
  replaced_count integer;
  search_kinds text;
  search_paths text;
  stored_tag_ids bigint[];
  rejected boolean := false;
begin
  insert into public.collections (user_id, name, icon, color, sort_order)
  values (
    '33333333-3333-4333-8333-333333333333',
    'Research',
    'research',
    'teal',
    'a0'
  ) returning id into parent_id;

  insert into public.collections (
    user_id,
    parent_id,
    name,
    icon,
    color,
    sort_order
  ) values (
    '33333333-3333-4333-8333-333333333333',
    parent_id,
    'Reading',
    'book',
    'blue',
    'a0'
  ) returning id into child_id;

  insert into public.tags (user_id, name, color, sort_order)
  values
    (
      '33333333-3333-4333-8333-333333333333',
      'Design',
      'red',
      'a0'
    ),
    (
      '33333333-3333-4333-8333-333333333333',
      'Tools',
      'green',
      'b0'
    );

  select id into first_tag_id
  from public.tags
  where name = 'Design';

  select id into second_tag_id
  from public.tags
  where name = 'Tools';

  reset role;
  select id into other_tag_id
  from public.tags
  where user_id = '44444444-4444-4444-8444-444444444444';
  set local role authenticated;
  perform set_config(
    'request.jwt.claim.sub',
    '33333333-3333-4333-8333-333333333333',
    true
  );

  select (public.create_bookmark(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'https://phase8d.invalid/research',
    'Linear research'
  )).id into created_bookmark_id;

  insert into public.bookmark_collections (
    user_id,
    bookmark_id,
    collection_id,
    sort_order
  ) values (
    '33333333-3333-4333-8333-333333333333',
    created_bookmark_id,
    child_id,
    'a0'
  );

  insert into public.bookmark_tags (user_id, bookmark_id, tag_id)
  values (
    '33333333-3333-4333-8333-333333333333',
    created_bookmark_id,
    first_tag_id
  );

  select string_agg(result_kind, ',' order by result_kind = 'bookmark' desc, result_order)
  into search_kinds
  from public.search_library('research');

  select string_agg(path, ',' order by result_order)
  into search_paths
  from public.search_library('research')
  where result_kind = 'collection';

  if search_kinds is distinct from 'bookmark,collection,collection'
    or search_paths is distinct from 'Research,Research / Reading'
  then
    raise exception 'search_library returned the wrong grouped result';
  end if;

  select public.replace_bookmark_tags(
    created_bookmark_id,
    array[second_tag_id]::bigint[]
  ) into replaced_count;

  select array_agg(membership.tag_id order by membership.tag_id)
  into stored_tag_ids
  from public.bookmark_tags as membership
  where membership.bookmark_id = created_bookmark_id;

  if replaced_count is distinct from 1
    or stored_tag_ids is distinct from array[second_tag_id]::bigint[]
  then
    raise exception 'replace_bookmark_tags did not replace atomically';
  end if;

  begin
    perform public.replace_bookmark_tags(
      created_bookmark_id,
      array[second_tag_id, other_tag_id]::bigint[]
    );
  exception when no_data_found then
    rejected := true;
  end;

  if not rejected then
    raise exception 'replace_bookmark_tags accepted another owner tag';
  end if;

  select array_agg(membership.tag_id order by membership.tag_id)
  into stored_tag_ids
  from public.bookmark_tags as membership
  where membership.bookmark_id = created_bookmark_id;

  if stored_tag_ids is distinct from array[second_tag_id]::bigint[] then
    raise exception 'failed tag replacement changed memberships';
  end if;
end;
$phase8d_checks$;

reset role;
set local role anon;

do $anonymous_checks$
declare
  rejected boolean := false;
begin
  begin
    perform * from public.search_library('research');
  exception when insufficient_privilege then
    rejected := true;
  end;

  if not rejected then
    raise exception 'anon executed search_library';
  end if;
end;
$anonymous_checks$;

reset role;

do $finish$
begin
  raise exception 'phase8d_rollback hosted_checks=passed';
end;
$finish$;
