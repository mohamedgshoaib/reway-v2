alter table public.collections
  drop constraint collections_sibling_sort_order_key,
  add constraint collections_sibling_sort_order_key
    unique nulls not distinct (user_id, parent_id, sort_order)
    deferrable initially immediate;

alter table public.tags
  drop constraint tags_user_sort_order_key,
  add constraint tags_user_sort_order_key
    unique (user_id, sort_order)
    deferrable initially immediate;

alter table public.bookmark_collections
  drop constraint bookmark_collections_scope_sort_order_key,
  add constraint bookmark_collections_scope_sort_order_key
    unique (user_id, collection_id, sort_order)
    deferrable initially immediate;

alter table private.import_job_details
  add column staging_purged_at timestamptz;

create index import_job_details_staging_cleanup_idx
  on private.import_job_details (staging_purged_at, job_id)
  where staging_purged_at is null;

create or replace function private.rebalance_collections(
  target_user_id uuid,
  target_parent_id bigint,
  target_collection_ids bigint[],
  target_sort_orders text[],
  expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  scope_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if target_collection_ids is null
    or target_sort_orders is null
    or cardinality(target_collection_ids) = 0
    or cardinality(target_collection_ids) <> cardinality(target_sort_orders)
    or cardinality(target_collection_ids) is distinct from (
      select count(distinct collection_id)::integer
      from unnest(target_collection_ids) as selected(collection_id)
    )
    or cardinality(target_sort_orders) is distinct from (
      select count(distinct sort_order)::integer
      from unnest(target_sort_orders) as selected(sort_order)
    )
  then
    raise exception using errcode = '22023', message = 'Invalid collection rebalance set.';
  end if;

  perform 1
  from public.profiles
  where user_id = target_user_id
  for update;

  if target_parent_id is null then
    select preference.root_collection_order_version
    into current_version
    from public.dashboard_preferences as preference
    where preference.user_id = target_user_id
    for update;
  else
    select collection.child_order_version
    into current_version
    from public.collections as collection
    where collection.user_id = target_user_id and collection.id = target_parent_id
    for update;
  end if;

  if current_version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Collection order changed.';
  end if;

  select count(*)::integer
  into scope_count
  from public.collections as collection
  where collection.user_id = target_user_id
    and collection.parent_id is not distinct from target_parent_id;

  if scope_count is distinct from cardinality(target_collection_ids)
    or exists (
      select 1
      from public.collections as collection
      where collection.user_id = target_user_id
        and collection.parent_id is not distinct from target_parent_id
        and collection.id <> all(target_collection_ids)
    )
  then
    raise exception using errcode = '40001', message = 'Collection scope changed.';
  end if;

  perform collection.id
  from public.collections as collection
  where collection.user_id = target_user_id
    and collection.id = any(target_collection_ids)
  order by collection.id
  for update;

  set constraints collections_sibling_sort_order_key deferred;

  update public.collections as collection
  set sort_order = replacement.sort_order
  from unnest(target_collection_ids, target_sort_orders)
    as replacement(collection_id, sort_order)
  where collection.user_id = target_user_id
    and collection.id = replacement.collection_id;

  set constraints collections_sibling_sort_order_key immediate;

  if target_parent_id is null then
    update public.dashboard_preferences
    set root_collection_order_version = root_collection_order_version + 1
    where user_id = target_user_id
    returning root_collection_order_version into current_version;
  else
    update public.collections
    set child_order_version = child_order_version + 1
    where user_id = target_user_id and id = target_parent_id
    returning child_order_version into current_version;
  end if;

  perform private.send_library_resync(target_user_id);
  return current_version;
end;
$$;

create or replace function public.rebalance_collections(
  parent_id bigint,
  collection_ids bigint[],
  sort_orders text[],
  expected_version bigint
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.rebalance_collections(
    (select auth.uid()),
    parent_id,
    collection_ids,
    sort_orders,
    expected_version
  );
$$;

create or replace function private.rebalance_tags(
  target_user_id uuid,
  target_tag_ids bigint[],
  target_sort_orders text[],
  expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  scope_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if target_tag_ids is null
    or target_sort_orders is null
    or cardinality(target_tag_ids) = 0
    or cardinality(target_tag_ids) <> cardinality(target_sort_orders)
    or cardinality(target_tag_ids) is distinct from (
      select count(distinct tag_id)::integer
      from unnest(target_tag_ids) as selected(tag_id)
    )
    or cardinality(target_sort_orders) is distinct from (
      select count(distinct sort_order)::integer
      from unnest(target_sort_orders) as selected(sort_order)
    )
  then
    raise exception using errcode = '22023', message = 'Invalid tag rebalance set.';
  end if;

  select preference.tag_order_version
  into current_version
  from public.dashboard_preferences as preference
  where preference.user_id = target_user_id
  for update;

  if current_version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Tag order changed.';
  end if;

  select count(*)::integer
  into scope_count
  from public.tags
  where user_id = target_user_id;

  if scope_count is distinct from cardinality(target_tag_ids)
    or exists (
      select 1
      from public.tags
      where user_id = target_user_id and id <> all(target_tag_ids)
    )
  then
    raise exception using errcode = '40001', message = 'Tag scope changed.';
  end if;

  perform tag.id
  from public.tags as tag
  where tag.user_id = target_user_id and tag.id = any(target_tag_ids)
  order by tag.id
  for update;

  set constraints tags_user_sort_order_key deferred;

  update public.tags as tag
  set sort_order = replacement.sort_order
  from unnest(target_tag_ids, target_sort_orders)
    as replacement(tag_id, sort_order)
  where tag.user_id = target_user_id and tag.id = replacement.tag_id;

  set constraints tags_user_sort_order_key immediate;

  update public.dashboard_preferences
  set tag_order_version = tag_order_version + 1
  where user_id = target_user_id
  returning tag_order_version into current_version;

  perform private.send_library_resync(target_user_id);
  return current_version;
end;
$$;

create or replace function public.rebalance_tags(
  tag_ids bigint[],
  sort_orders text[],
  expected_version bigint
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.rebalance_tags(
    (select auth.uid()),
    tag_ids,
    sort_orders,
    expected_version
  );
$$;

create or replace function private.rebalance_bookmarks(
  target_user_id uuid,
  target_collection_id bigint,
  target_bookmark_ids bigint[],
  target_sort_orders text[],
  expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  scope_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if target_bookmark_ids is null
    or target_sort_orders is null
    or cardinality(target_bookmark_ids) = 0
    or cardinality(target_bookmark_ids) <> cardinality(target_sort_orders)
    or cardinality(target_bookmark_ids) is distinct from (
      select count(distinct bookmark_id)::integer
      from unnest(target_bookmark_ids) as selected(bookmark_id)
    )
    or cardinality(target_sort_orders) is distinct from (
      select count(distinct sort_order)::integer
      from unnest(target_sort_orders) as selected(sort_order)
    )
  then
    raise exception using errcode = '22023', message = 'Invalid bookmark rebalance set.';
  end if;

  select collection.bookmark_order_version
  into current_version
  from public.collections as collection
  where collection.user_id = target_user_id and collection.id = target_collection_id
  for update;

  if current_version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Bookmark order changed.';
  end if;

  select count(*)::integer
  into scope_count
  from public.bookmark_collections
  where user_id = target_user_id and collection_id = target_collection_id;

  if scope_count is distinct from cardinality(target_bookmark_ids)
    or exists (
      select 1
      from public.bookmark_collections
      where user_id = target_user_id
        and collection_id = target_collection_id
        and bookmark_id <> all(target_bookmark_ids)
    )
  then
    raise exception using errcode = '40001', message = 'Bookmark scope changed.';
  end if;

  perform membership.bookmark_id
  from public.bookmark_collections as membership
  where membership.user_id = target_user_id
    and membership.collection_id = target_collection_id
    and membership.bookmark_id = any(target_bookmark_ids)
  order by membership.bookmark_id
  for update;

  set constraints bookmark_collections_scope_sort_order_key deferred;

  update public.bookmark_collections as membership
  set sort_order = replacement.sort_order
  from unnest(target_bookmark_ids, target_sort_orders)
    as replacement(bookmark_id, sort_order)
  where membership.user_id = target_user_id
    and membership.collection_id = target_collection_id
    and membership.bookmark_id = replacement.bookmark_id;

  set constraints bookmark_collections_scope_sort_order_key immediate;

  update public.collections
  set bookmark_order_version = bookmark_order_version + 1
  where user_id = target_user_id and id = target_collection_id
  returning bookmark_order_version into current_version;

  perform private.send_library_resync(target_user_id);
  return current_version;
end;
$$;

create or replace function public.rebalance_bookmarks(
  collection_id bigint,
  bookmark_ids bigint[],
  sort_orders text[],
  expected_version bigint
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.rebalance_bookmarks(
    (select auth.uid()),
    collection_id,
    bookmark_ids,
    sort_orders,
    expected_version
  );
$$;

create or replace function private.purge_expired_enrichment_requests(
  batch_size integer default 1000
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if batch_size not between 1 and 10000 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  with candidates as (
    select request.id
    from private.enrichment_requests as request
    where request.expires_at <= now()
      and request.state in ('completed', 'failed', 'cancelled')
    order by request.expires_at, request.id
    limit batch_size
    for update skip locked
  )
  delete from private.enrichment_requests as request
  using candidates
  where request.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function private.purge_expired_import_staging(
  batch_size integer default 50
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_count integer;
begin
  if batch_size not between 1 and 500 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  with candidates as (
    select detail.job_id
    from private.import_job_details as detail
    join private.transfer_jobs as job
      on job.user_id = detail.user_id and job.id = detail.job_id
    where detail.staging_purged_at is null
      and job.terminal_at <= now() - interval '7 days'
      and job.state in ('completed', 'completed_with_failures', 'failed', 'cancelled')
    order by job.terminal_at, detail.job_id
    limit batch_size
    for update of detail skip locked
  ),
  deleted_bookmarks as (
    delete from private.import_stage_bookmarks as staged
    using candidates
    where staged.job_id = candidates.job_id
  ),
  deleted_collections as (
    delete from private.import_stage_collections as staged
    using candidates
    where staged.job_id = candidates.job_id
  ),
  deleted_tags as (
    delete from private.import_stage_tags as staged
    using candidates
    where staged.job_id = candidates.job_id
  )
  update private.import_job_details as detail
  set staging_purged_at = now()
  from candidates
  where detail.job_id = candidates.job_id;

  get diagnostics cleaned_count = row_count;
  return cleaned_count;
end;
$$;

create or replace function private.purge_expired_restore_snapshots(
  batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  with candidates as (
    select snapshot.id
    from private.restore_snapshots as snapshot
    where snapshot.expires_at <= now()
    order by snapshot.expires_at, snapshot.id
    limit batch_size
    for update skip locked
  )
  delete from private.restore_snapshots as snapshot
  using candidates
  where snapshot.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function private.purge_expired_transfer_jobs(
  batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  with candidates as (
    select job.id
    from private.transfer_jobs as job
    where job.expires_at <= now()
      and job.state in ('completed', 'completed_with_failures', 'failed', 'cancelled')
      and not exists (
        select 1
        from private.stored_files as file
        where file.job_id = job.id and file.state <> 'deleted'
      )
    order by job.expires_at, job.id
    limit batch_size
    for update skip locked
  )
  delete from private.transfer_jobs as job
  using candidates
  where job.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function private.purge_expired_stored_file_rows(
  batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  with candidates as (
    select file.id
    from private.stored_files as file
    where file.expires_at <= now() and file.state = 'deleted'
    order by file.expires_at, file.id
    limit batch_size
    for update skip locked
  )
  delete from private.stored_files as file
  using candidates
  where file.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function private.rebalance_collections(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) from public, anon, authenticated;
revoke all on function private.rebalance_tags(uuid, bigint[], text[], bigint)
  from public, anon, authenticated;
revoke all on function private.rebalance_bookmarks(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) from public, anon, authenticated;

grant execute on function private.rebalance_collections(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) to authenticated;
grant execute on function private.rebalance_tags(uuid, bigint[], text[], bigint)
  to authenticated;
grant execute on function private.rebalance_bookmarks(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) to authenticated;

revoke all on function public.rebalance_collections(bigint, bigint[], text[], bigint)
  from public, anon;
revoke all on function public.rebalance_tags(bigint[], text[], bigint)
  from public, anon;
revoke all on function public.rebalance_bookmarks(bigint, bigint[], text[], bigint)
  from public, anon;

grant execute on function public.rebalance_collections(
  bigint,
  bigint[],
  text[],
  bigint
) to authenticated;
grant execute on function public.rebalance_tags(bigint[], text[], bigint)
  to authenticated;
grant execute on function public.rebalance_bookmarks(
  bigint,
  bigint[],
  text[],
  bigint
) to authenticated;

revoke all on function private.purge_expired_enrichment_requests(integer)
  from public, anon, authenticated;
revoke all on function private.purge_expired_import_staging(integer)
  from public, anon, authenticated;
revoke all on function private.purge_expired_restore_snapshots(integer)
  from public, anon, authenticated;
revoke all on function private.purge_expired_transfer_jobs(integer)
  from public, anon, authenticated;
revoke all on function private.purge_expired_stored_file_rows(integer)
  from public, anon, authenticated;

grant execute on function private.purge_expired_enrichment_requests(integer)
  to service_role;
grant execute on function private.purge_expired_import_staging(integer)
  to service_role;
grant execute on function private.purge_expired_restore_snapshots(integer)
  to service_role;
grant execute on function private.purge_expired_transfer_jobs(integer)
  to service_role;
grant execute on function private.purge_expired_stored_file_rows(integer)
  to service_role;
