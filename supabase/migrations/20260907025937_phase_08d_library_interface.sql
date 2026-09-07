create index collections_name_trigram_idx
  on public.collections using gin (normalized_name extensions.gin_trgm_ops);

create or replace function private.search_library(
  target_user_id uuid,
  query_text text,
  bookmark_limit integer,
  collection_limit integer
)
returns table (
  result_kind text,
  result_order integer,
  id bigint,
  title text,
  url text,
  domain text,
  favicon_url text,
  name text,
  parent_id bigint,
  path text,
  icon text,
  color text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := btrim(query_text);
  parsed_query tsquery;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if normalized_query is null
    or char_length(normalized_query) not between 1 and 200
    or normalized_query ~ '[[:cntrl:]]'
    or bookmark_limit not between 1 and 32
    or collection_limit not between 1 and 16
  then
    raise exception using errcode = '22023', message = 'Invalid search input.';
  end if;

  parsed_query := websearch_to_tsquery('simple', normalized_query);

  return query
  with bookmark_matches as (
    select
      bookmark.id,
      bookmark.title,
      bookmark.url,
      bookmark.domain,
      bookmark.favicon_url,
      greatest(
        ts_rank_cd(search.search_vector, parsed_query),
        extensions.similarity(search.searchable_text, normalized_query)
      ) as score
    from private.bookmark_search as search
    join public.bookmarks as bookmark
      on bookmark.user_id = search.user_id
      and bookmark.id = search.bookmark_id
    where search.user_id = target_user_id
      and bookmark.trashed_at is null
      and (
        search.search_vector @@ parsed_query
        or search.searchable_text operator(extensions.%) normalized_query
      )
    order by score desc, bookmark.id desc
    limit bookmark_limit
  ),
  ranked_bookmarks as (
    select
      'bookmark'::text as result_kind,
      row_number() over (
        order by bookmark_matches.score desc, bookmark_matches.id desc
      )::integer as result_order,
      bookmark_matches.id,
      bookmark_matches.title,
      bookmark_matches.url,
      bookmark_matches.domain,
      bookmark_matches.favicon_url,
      null::text as name,
      null::bigint as parent_id,
      null::text as path,
      null::text as icon,
      null::text as color
    from bookmark_matches
  ),
  collection_matches as (
    select
      collection.id,
      collection.name,
      collection.parent_id,
      case
        when parent.id is null then collection.name
        else parent.name || ' / ' || collection.name
      end as path,
      collection.icon,
      collection.color,
      greatest(
        extensions.similarity(collection.normalized_name, lower(normalized_query)),
        coalesce(
          extensions.similarity(parent.normalized_name, lower(normalized_query)),
          0
        )
      ) as score
    from public.collections as collection
    left join public.collections as parent
      on parent.user_id = collection.user_id
      and parent.id = collection.parent_id
    where collection.user_id = target_user_id
      and (
        collection.normalized_name operator(extensions.%) lower(normalized_query)
        or parent.normalized_name operator(extensions.%) lower(normalized_query)
        or collection.normalized_name like lower(normalized_query) || '%'
        or parent.normalized_name like lower(normalized_query) || '%'
      )
    order by score desc, path, collection.id
    limit collection_limit
  ),
  ranked_collections as (
    select
      'collection'::text as result_kind,
      row_number() over (
        order by
          collection_matches.score desc,
          collection_matches.path,
          collection_matches.id
      )::integer as result_order,
      collection_matches.id,
      null::text as title,
      null::text as url,
      null::text as domain,
      null::text as favicon_url,
      collection_matches.name,
      collection_matches.parent_id,
      collection_matches.path,
      collection_matches.icon,
      collection_matches.color
    from collection_matches
  )
  select combined.*
  from (
    select * from ranked_bookmarks
    union all
    select * from ranked_collections
  ) as combined
  order by
    case combined.result_kind when 'bookmark' then 0 else 1 end,
    combined.result_order;
end;
$$;

create or replace function public.search_library(
  query_text text,
  bookmark_limit integer default 32,
  collection_limit integer default 16
)
returns table (
  result_kind text,
  result_order integer,
  id bigint,
  title text,
  url text,
  domain text,
  favicon_url text,
  name text,
  parent_id bigint,
  path text,
  icon text,
  color text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.search_library(
    (select auth.uid()),
    query_text,
    bookmark_limit,
    collection_limit
  );
$$;

create or replace function private.replace_bookmark_tags(
  target_user_id uuid,
  target_bookmark_id bigint,
  target_tag_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_tag_ids bigint[] := coalesce(target_tag_ids, '{}'::bigint[]);
  requested_tag_count integer;
  owned_tag_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if array_position(normalized_tag_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Tag IDs cannot be null.';
  end if;

  select count(distinct tag_id)::integer
  into requested_tag_count
  from unnest(normalized_tag_ids) as requested(tag_id);

  if requested_tag_count is distinct from cardinality(normalized_tag_ids) then
    raise exception using errcode = '22023', message = 'Tag IDs must be unique.';
  end if;

  perform bookmark.id
  from public.bookmarks as bookmark
  where bookmark.user_id = target_user_id
    and bookmark.id = target_bookmark_id
    and bookmark.trashed_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Bookmark not found.';
  end if;

  perform tag.id
  from public.tags as tag
  where tag.user_id = target_user_id
    and tag.id = any(normalized_tag_ids)
  order by tag.id
  for key share;

  select count(*)::integer
  into owned_tag_count
  from public.tags as tag
  where tag.user_id = target_user_id
    and tag.id = any(normalized_tag_ids);

  if owned_tag_count is distinct from requested_tag_count then
    raise exception using errcode = 'P0002', message = 'Tag set changed.';
  end if;

  delete from public.bookmark_tags
  where user_id = target_user_id
    and bookmark_id = target_bookmark_id
    and not (tag_id = any(normalized_tag_ids));

  insert into public.bookmark_tags (user_id, bookmark_id, tag_id)
  select target_user_id, target_bookmark_id, requested.tag_id
  from unnest(normalized_tag_ids) as requested(tag_id)
  on conflict (user_id, bookmark_id, tag_id) do nothing;

  return requested_tag_count;
end;
$$;

create or replace function public.replace_bookmark_tags(
  bookmark_id bigint,
  tag_ids bigint[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.replace_bookmark_tags(
    (select auth.uid()),
    bookmark_id,
    tag_ids
  );
$$;

revoke all on function private.search_library(uuid, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.search_library(text, integer, integer)
  from public, anon;
grant execute on function private.search_library(uuid, text, integer, integer)
  to authenticated;
grant execute on function public.search_library(text, integer, integer)
  to authenticated;

revoke all on function private.replace_bookmark_tags(uuid, bigint, bigint[])
  from public, anon, authenticated;
revoke all on function public.replace_bookmark_tags(bigint, bigint[])
  from public, anon;
grant execute on function private.replace_bookmark_tags(uuid, bigint, bigint[])
  to authenticated;
grant execute on function public.replace_bookmark_tags(bigint, bigint[])
  to authenticated;
