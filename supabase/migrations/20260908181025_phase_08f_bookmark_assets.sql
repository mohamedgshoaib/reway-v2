alter table public.bookmarks
add constraint bookmarks_url_length_check
check (char_length(url) <= 8192) not valid;

alter table public.bookmarks
validate constraint bookmarks_url_length_check;

update public.bookmarks
set favicon_url = null,
  og_image_url = null
where favicon_url is not null or og_image_url is not null;

alter table public.bookmarks
add constraint bookmarks_legacy_asset_urls_empty_check
check (favicon_url is null and og_image_url is null) not valid;

alter table public.bookmarks
validate constraint bookmarks_legacy_asset_urls_empty_check;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'bookmark-assets',
  'bookmark-assets',
  false,
  262144,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table private.bookmark_assets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid,
  bookmark_id bigint,
  generation bigint not null,
  attempt_number integer not null,
  kind text not null,
  object_path text not null,
  content_type text not null,
  checksum bytea,
  byte_size bigint,
  width integer,
  height integer,
  state text not null default 'uploading',
  upload_expires_at timestamptz,
  delete_after timestamptz,
  cleanup_attempt_count integer not null default 0,
  cleanup_lease_token uuid,
  cleanup_lease_expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint bookmark_assets_user_id_id_key unique (user_id, id),
  constraint bookmark_assets_user_object_path_key unique (user_id, object_path),
  constraint bookmark_assets_request_fkey foreign key (user_id, request_id)
    references private.enrichment_requests (user_id, id)
    on delete set null (request_id),
  constraint bookmark_assets_bookmark_fkey foreign key (user_id, bookmark_id)
    references public.bookmarks (user_id, id)
    on delete set null (bookmark_id),
  constraint bookmark_assets_generation_check check (generation > 0),
  constraint bookmark_assets_attempt_number_check check (
    attempt_number between 1 and 3
  ),
  constraint bookmark_assets_kind_check check (kind in ('favicon', 'og_image')),
  constraint bookmark_assets_content_type_check check (
    content_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint bookmark_assets_path_check check (
    object_path = user_id::text || '/bookmark-assets/' || id::text ||
      case content_type
        when 'image/jpeg' then '.jpg'
        when 'image/png' then '.png'
        when 'image/webp' then '.webp'
      end
    and char_length(object_path) <= 512
    and object_path !~ '[[:cntrl:]]'
  ),
  constraint bookmark_assets_dimensions_check check (
    (width is null and height is null)
    or (width > 0 and height > 0)
  ),
  constraint bookmark_assets_size_check check (
    byte_size is null
    or (
      byte_size > 0
      and (
        (kind = 'favicon' and byte_size <= 32768)
        or (kind = 'og_image' and byte_size <= 262144)
      )
    )
  ),
  constraint bookmark_assets_pixel_bounds_check check (
    width is null
    or (
      (kind = 'favicon' and width <= 64 and height <= 64)
      or (kind = 'og_image' and width <= 1200 and height <= 630)
    )
  ),
  constraint bookmark_assets_checksum_check check (
    checksum is null or octet_length(checksum) = 32
  ),
  constraint bookmark_assets_cleanup_attempts_check check (
    cleanup_attempt_count >= 0
  ),
  constraint bookmark_assets_row_version_check check (row_version > 0),
  constraint bookmark_assets_state_check check (
    state in (
      'uploading',
      'ready',
      'active',
      'delete_pending',
      'deleting',
      'deleted'
    )
  ),
  constraint bookmark_assets_lifecycle_check check (
    (
      state = 'uploading'
      and checksum is null
      and byte_size is null
      and width is null
      and height is null
      and upload_expires_at is not null
      and delete_after is null
      and cleanup_lease_token is null
      and cleanup_lease_expires_at is null
      and deleted_at is null
    )
    or (
      state in ('ready', 'active')
      and checksum is not null
      and byte_size is not null
      and width is not null
      and height is not null
      and upload_expires_at is null
      and delete_after is null
      and cleanup_lease_token is null
      and cleanup_lease_expires_at is null
      and deleted_at is null
    )
    or (
      state = 'delete_pending'
      and upload_expires_at is null
      and delete_after is not null
      and cleanup_lease_token is null
      and cleanup_lease_expires_at is null
      and deleted_at is null
    )
    or (
      state = 'deleting'
      and upload_expires_at is null
      and delete_after is not null
      and cleanup_lease_token is not null
      and cleanup_lease_expires_at is not null
      and deleted_at is null
    )
    or (
      state = 'deleted'
      and upload_expires_at is null
      and cleanup_lease_token is null
      and cleanup_lease_expires_at is null
      and deleted_at is not null
    )
  ),
  constraint bookmark_assets_orphan_state_check check (
    bookmark_id is not null
    or state in ('delete_pending', 'deleting', 'deleted')
  )
);

alter table public.bookmarks
add column favicon_asset_id uuid,
add column og_image_asset_id uuid,
add constraint bookmarks_favicon_asset_fkey foreign key (
  user_id,
  favicon_asset_id
) references private.bookmark_assets (user_id, id),
add constraint bookmarks_og_image_asset_fkey foreign key (
  user_id,
  og_image_asset_id
) references private.bookmark_assets (user_id, id),
add constraint bookmarks_asset_ids_distinct_check check (
  favicon_asset_id is null
  or og_image_asset_id is null
  or favicon_asset_id <> og_image_asset_id
);

create index bookmark_assets_bookmark_idx
  on private.bookmark_assets (user_id, bookmark_id, generation, kind, id)
  where bookmark_id is not null;
create index bookmark_assets_request_idx
  on private.bookmark_assets (user_id, request_id, state, id)
  where request_id is not null;
create unique index bookmark_assets_request_attempt_kind_key
  on private.bookmark_assets (user_id, request_id, attempt_number, kind)
  where request_id is not null;
create index bookmark_assets_delete_due_idx
  on private.bookmark_assets (delete_after, id)
  where state = 'delete_pending';
create index bookmark_assets_upload_expiry_idx
  on private.bookmark_assets (upload_expires_at, id)
  where state = 'uploading';
create index bookmark_assets_cleanup_lease_idx
  on private.bookmark_assets (cleanup_lease_expires_at, id)
  where state = 'deleting';
create index bookmarks_favicon_asset_idx
  on public.bookmarks (user_id, favicon_asset_id)
  where favicon_asset_id is not null;
create index bookmarks_og_image_asset_idx
  on public.bookmarks (user_id, og_image_asset_id)
  where og_image_asset_id is not null;

alter table private.bookmark_assets enable row level security;
alter table private.bookmark_assets force row level security;

create or replace function private.guard_bookmark_asset_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.generation is distinct from old.generation
    or new.attempt_number is distinct from old.attempt_number
    or new.kind is distinct from old.kind
    or new.object_path is distinct from old.object_path
    or new.content_type is distinct from old.content_type
    or (
      new.bookmark_id is distinct from old.bookmark_id
      and not (
        old.bookmark_id is not null
        and new.bookmark_id is null
        and new.state in ('delete_pending', 'deleting', 'deleted')
      )
    )
    or (
      new.request_id is distinct from old.request_id
      and not (old.request_id is not null and new.request_id is null)
    )
  then
    raise exception using errcode = '23514', message = 'Asset identity is immutable.';
  end if;
  return new;
end;
$$;

create trigger bookmark_assets_guard_identity
before update on private.bookmark_assets
for each row execute function private.guard_bookmark_asset_identity();

create trigger bookmark_assets_set_updated_row
before update on private.bookmark_assets
for each row execute function private.set_updated_row();

create or replace function private.queue_deleted_bookmark_assets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.bookmark_assets
  set state = 'delete_pending',
    upload_expires_at = null,
    delete_after = least(coalesce(delete_after, clock_timestamp()), clock_timestamp()),
    cleanup_lease_token = null,
    cleanup_lease_expires_at = null
  where user_id = old.user_id
    and bookmark_id = old.id
    and state not in ('deleting', 'deleted');
  return old;
end;
$$;

create trigger bookmarks_queue_assets_before_delete
before delete on public.bookmarks
for each row execute function private.queue_deleted_bookmark_assets();

create or replace function private.lock_enrichment_request_for_asset_work(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  require_current_generation boolean
)
returns private.enrichment_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_request private.enrichment_requests;
begin
  select request.*
  into claimed_request
  from private.enrichment_requests as request
  where request.id = target_request_id
    and request.generation = target_generation;

  if not found then
    return null;
  end if;

  perform 1
  from public.bookmarks as bookmark
  where bookmark.user_id = claimed_request.user_id
    and bookmark.id = claimed_request.bookmark_id
    and (
      not require_current_generation
      or bookmark.metadata_generation = target_generation
    )
  for update;

  if not found then
    return null;
  end if;

  select request.*
  into claimed_request
  from private.enrichment_requests as request
  where request.id = target_request_id
    and request.generation = target_generation
    and request.lease_token = target_lease_token
    and request.state = 'running'
    and request.lease_expires_at > clock_timestamp()
  for update;

  if not found then
    return null;
  end if;
  return claimed_request;
end;
$$;

create or replace function private.worker_reserve_bookmark_asset(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  target_asset_id uuid,
  target_kind text,
  target_content_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset_path text;
  claimed_request private.enrichment_requests;
  existing_asset private.bookmark_assets;
  file_extension text;
begin
  if target_asset_id is null
    or target_kind not in ('favicon', 'og_image')
    or target_content_type not in ('image/jpeg', 'image/png', 'image/webp')
  then
    raise exception using errcode = '22023', message = 'Invalid asset reservation.';
  end if;

  claimed_request := private.lock_enrichment_request_for_asset_work(
    target_request_id,
    target_generation,
    target_lease_token,
    true
  );

  if claimed_request.id is null then
    raise exception using errcode = '55000', message = 'Asset reservation rejected.';
  end if;

  file_extension := case target_content_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
  end;
  asset_path := claimed_request.user_id::text || '/bookmark-assets/' ||
    target_asset_id::text || '.' || file_extension;

  insert into private.bookmark_assets (
    id,
    user_id,
    request_id,
    bookmark_id,
    generation,
    attempt_number,
    kind,
    object_path,
    content_type,
    upload_expires_at
  )
  values (
    target_asset_id,
    claimed_request.user_id,
    claimed_request.id,
    claimed_request.bookmark_id,
    claimed_request.generation,
    claimed_request.attempt_count,
    target_kind,
    asset_path,
    target_content_type,
    clock_timestamp() + interval '1 hour'
  )
  on conflict (id) do nothing;

  select asset.*
  into strict existing_asset
  from private.bookmark_assets as asset
  where asset.id = target_asset_id;

  if existing_asset.user_id is distinct from claimed_request.user_id
    or existing_asset.request_id is distinct from claimed_request.id
    or existing_asset.bookmark_id is distinct from claimed_request.bookmark_id
    or existing_asset.generation is distinct from claimed_request.generation
    or existing_asset.attempt_number is distinct from claimed_request.attempt_count
    or existing_asset.kind is distinct from target_kind
    or existing_asset.object_path is distinct from asset_path
    or existing_asset.content_type is distinct from target_content_type
  then
    raise exception using
      errcode = '23505',
      constraint = 'bookmark_assets_pkey',
      message = 'Asset reservation conflict.';
  end if;

  return existing_asset.object_path;
end;
$$;

create or replace function public.worker_reserve_bookmark_asset(
  target_request_id uuid,
  target_generation text,
  target_lease_token uuid,
  target_asset_id uuid,
  target_kind text,
  target_content_type text
)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_reserve_bookmark_asset(
    target_request_id,
    target_generation::bigint,
    target_lease_token,
    target_asset_id,
    target_kind,
    target_content_type
  );
$$;

create or replace function private.worker_mark_bookmark_asset_ready(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  target_asset_id uuid,
  target_checksum bytea,
  target_byte_size bigint,
  target_width integer,
  target_height integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_request private.enrichment_requests;
  existing_asset private.bookmark_assets;
begin
  if target_checksum is null
    or octet_length(target_checksum) <> 32
    or target_byte_size is null
    or target_byte_size <= 0
    or target_width is null
    or target_width <= 0
    or target_height is null
    or target_height <= 0
  then
    raise exception using errcode = '22023', message = 'Invalid asset result.';
  end if;

  claimed_request := private.lock_enrichment_request_for_asset_work(
    target_request_id,
    target_generation,
    target_lease_token,
    true
  );

  if claimed_request.id is null then
    return false;
  end if;

  select asset.*
  into existing_asset
  from private.bookmark_assets as asset
  where asset.id = target_asset_id
    and asset.user_id = claimed_request.user_id
    and asset.request_id = claimed_request.id
    and asset.bookmark_id = claimed_request.bookmark_id
    and asset.generation = claimed_request.generation
  for update;

  if not found then
    return false;
  end if;

  if existing_asset.state = 'ready' then
    return existing_asset.checksum = target_checksum
      and existing_asset.byte_size = target_byte_size
      and existing_asset.width = target_width
      and existing_asset.height = target_height;
  end if;

  if existing_asset.state <> 'uploading' then
    return false;
  end if;

  update private.bookmark_assets
  set checksum = target_checksum,
    byte_size = target_byte_size,
    width = target_width,
    height = target_height,
    state = 'ready',
    upload_expires_at = null
  where id = target_asset_id;

  return true;
end;
$$;

create or replace function public.worker_mark_bookmark_asset_ready(
  target_request_id uuid,
  target_generation text,
  target_lease_token uuid,
  target_asset_id uuid,
  target_checksum text,
  target_byte_size bigint,
  target_width integer,
  target_height integer
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_mark_bookmark_asset_ready(
    target_request_id,
    target_generation::bigint,
    target_lease_token,
    target_asset_id,
    decode(target_checksum, 'hex'),
    target_byte_size,
    target_width,
    target_height
  );
$$;

create or replace function private.worker_read_enrichment_bookmark_id(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claimed_request private.enrichment_requests;
begin
  claimed_request := private.lock_enrichment_request_for_asset_work(
    target_request_id,
    target_generation,
    target_lease_token,
    true
  );

  if claimed_request.id is null then
    return null;
  end if;
  return claimed_request.bookmark_id::text;
end;
$$;

create or replace function public.worker_read_enrichment_bookmark_id(
  target_request_id uuid,
  target_generation text,
  target_lease_token uuid
)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_read_enrichment_bookmark_id(
    target_request_id,
    target_generation::bigint,
    target_lease_token
  );
$$;

create or replace function private.read_bookmark_asset_signing_paths(
  target_user_id uuid,
  target_bookmark_ids bigint[],
  include_og_image boolean
)
returns table (
  bookmark_id bigint,
  asset_id uuid,
  asset_kind text,
  object_path text,
  content_type text,
  width integer,
  height integer,
  byte_size bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  distinct_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  select count(distinct requested.bookmark_id)::integer
  into distinct_count
  from unnest(target_bookmark_ids) as requested(bookmark_id);

  if target_bookmark_ids is null
    or cardinality(target_bookmark_ids) not between 1 and 96
    or distinct_count <> cardinality(target_bookmark_ids)
    or exists (
      select 1
      from unnest(target_bookmark_ids) as requested(bookmark_id)
      where requested.bookmark_id is null or requested.bookmark_id <= 0
    )
  then
    raise exception using errcode = '22023', message = 'Invalid asset request.';
  end if;

  return query
  select
    bookmark.id,
    asset.id,
    asset.kind,
    asset.object_path,
    asset.content_type,
    asset.width,
    asset.height,
    asset.byte_size
  from public.bookmarks as bookmark
  cross join lateral (
    values
      ('favicon'::text, bookmark.favicon_asset_id, 0),
      ('og_image'::text, bookmark.og_image_asset_id, 1)
  ) as reference(kind, asset_id, kind_order)
  join private.bookmark_assets as asset
    on asset.user_id = bookmark.user_id
    and asset.id = reference.asset_id
    and asset.bookmark_id = bookmark.id
    and asset.kind = reference.kind
    and asset.state = 'active'
  where bookmark.user_id = target_user_id
    and bookmark.id = any(target_bookmark_ids)
    and (bookmark.purge_after is null or bookmark.purge_after > now())
    and (reference.kind = 'favicon' or include_og_image)
  order by array_position(target_bookmark_ids, bookmark.id), reference.kind_order;
end;
$$;

create or replace function public.read_bookmark_asset_signing_paths(
  bookmark_ids bigint[],
  include_og_image boolean default false
)
returns table (
  bookmark_id bigint,
  asset_id uuid,
  asset_kind text,
  object_path text,
  content_type text,
  width integer,
  height integer,
  byte_size bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.read_bookmark_asset_signing_paths(
    (select auth.uid()),
    bookmark_ids,
    include_og_image
  );
$$;

drop function public.worker_finish_enrichment_message(
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);
drop function private.worker_finish_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);
drop function private.worker_finish_enrichment_message_unchecked(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);
drop function private.finish_enrichment_request(
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);

create or replace function private.finish_enrichment_request(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  succeeded boolean,
  result_title text default null,
  result_domain text default null,
  result_favicon_asset_id uuid default null,
  result_og_image_asset_id uuid default null,
  result_failure_class text default null,
  result_public_error_code text default null,
  result_internal_error text default null,
  retry_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bookmark_generation bigint;
  claimed_request private.enrichment_requests;
  old_favicon_asset_id uuid;
  old_og_image_asset_id uuid;
  terminal_time timestamptz;
begin
  claimed_request := private.lock_enrichment_request_for_asset_work(
    target_request_id,
    target_generation,
    target_lease_token,
    false
  );

  if claimed_request.id is null then
    return false;
  end if;

  select
    bookmark.metadata_generation,
    bookmark.favicon_asset_id,
    bookmark.og_image_asset_id
  into bookmark_generation, old_favicon_asset_id, old_og_image_asset_id
  from public.bookmarks as bookmark
  where bookmark.user_id = claimed_request.user_id
    and bookmark.id = claimed_request.bookmark_id
  for update;

  if bookmark_generation is null
    or bookmark_generation is distinct from target_generation
  then
    terminal_time := now();
    update private.bookmark_assets
    set state = 'delete_pending',
      upload_expires_at = null,
      delete_after = clock_timestamp()
    where request_id = target_request_id
      and state in ('uploading', 'ready');
    update private.enrichment_requests
    set state = 'cancelled',
      lease_token = null,
      lease_expires_at = null,
      completed_at = terminal_time,
      expires_at = terminal_time + interval '7 days',
      public_error_code = 'stale_generation',
      internal_error = null
    where id = target_request_id;
    return false;
  end if;

  if succeeded then
    if result_title is null
      or char_length(btrim(result_title)) = 0
      or result_domain is null
      or result_domain <> btrim(result_domain)
      or result_domain <> lower(result_domain)
      or char_length(result_domain) not between 1 and 253
      or result_domain ~ '[[:cntrl:]]'
    then
      raise exception using errcode = '22023', message = 'Valid title and domain are required.';
    end if;

    if result_favicon_asset_id is not null and not exists (
      select 1
      from private.bookmark_assets as asset
      where asset.id = result_favicon_asset_id
        and asset.user_id = claimed_request.user_id
        and asset.request_id = claimed_request.id
        and asset.bookmark_id = claimed_request.bookmark_id
        and asset.generation = target_generation
        and asset.kind = 'favicon'
        and asset.state = 'ready'
    ) then
      raise exception using errcode = '22023', message = 'Invalid favicon asset.';
    end if;

    if result_og_image_asset_id is not null and not exists (
      select 1
      from private.bookmark_assets as asset
      where asset.id = result_og_image_asset_id
        and asset.user_id = claimed_request.user_id
        and asset.request_id = claimed_request.id
        and asset.bookmark_id = claimed_request.bookmark_id
        and asset.generation = target_generation
        and asset.kind = 'og_image'
        and asset.state = 'ready'
    ) then
      raise exception using errcode = '22023', message = 'Invalid OG-image asset.';
    end if;

    update public.bookmarks
    set title = regexp_replace(btrim(result_title), '[[:space:]]+', ' ', 'g'),
      domain = result_domain,
      favicon_asset_id = result_favicon_asset_id,
      og_image_asset_id = result_og_image_asset_id,
      favicon_url = null,
      og_image_url = null,
      metadata_status = 'enriched'
    where user_id = claimed_request.user_id
      and id = claimed_request.bookmark_id;

    update private.bookmark_assets
    set state = 'active'
    where id = any(
      array_remove(
        array[result_favicon_asset_id, result_og_image_asset_id]::uuid[],
        null::uuid
      )
    );

    update private.bookmark_assets
    set state = 'delete_pending',
      upload_expires_at = null,
      delete_after = clock_timestamp()
    where user_id = claimed_request.user_id
      and (
        id = any(
          array_remove(
            array[old_favicon_asset_id, old_og_image_asset_id]::uuid[],
            null::uuid
          )
        )
        or (
          request_id = target_request_id
          and state in ('uploading', 'ready')
        )
      )
      and not (
        id = any(
          array_remove(
            array[result_favicon_asset_id, result_og_image_asset_id]::uuid[],
            null::uuid
          )
        )
      )
      and state <> 'deleted';

    terminal_time := now();
    update private.enrichment_requests
    set state = 'completed',
      lease_token = null,
      lease_expires_at = null,
      failure_class = null,
      public_error_code = null,
      internal_error = null,
      completed_at = terminal_time,
      expires_at = terminal_time + interval '7 days'
    where id = target_request_id;
    return true;
  end if;

  update private.bookmark_assets
  set state = 'delete_pending',
    upload_expires_at = null,
    delete_after = clock_timestamp()
  where request_id = target_request_id
    and state in ('uploading', 'ready');

  if result_failure_class = 'transient'
    and retry_at is not null
    and claimed_request.attempt_count < claimed_request.max_attempts
  then
    update private.enrichment_requests
    set state = 'queued',
      lease_token = null,
      lease_expires_at = null,
      next_attempt_at = retry_at,
      failure_class = result_failure_class,
      public_error_code = result_public_error_code,
      internal_error = result_internal_error
    where id = target_request_id;
    return true;
  end if;

  if result_failure_class not in ('transient', 'permanent') then
    raise exception using errcode = '22023', message = 'Invalid failure class.';
  end if;

  update public.bookmarks
  set metadata_status = 'failed'
  where user_id = claimed_request.user_id
    and id = claimed_request.bookmark_id;

  terminal_time := now();
  update private.enrichment_requests
  set state = 'failed',
    lease_token = null,
    lease_expires_at = null,
    failure_class = result_failure_class,
    public_error_code = result_public_error_code,
    internal_error = result_internal_error,
    completed_at = terminal_time,
    expires_at = terminal_time + interval '7 days'
  where id = target_request_id;
  return true;
end;
$$;

create or replace function private.worker_finish_enrichment_message(
  target_queue_name text,
  target_message_id bigint,
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  succeeded boolean,
  result_title text default null,
  result_domain text default null,
  result_favicon_asset_id uuid default null,
  result_og_image_asset_id uuid default null,
  result_failure_class text default null,
  result_public_error_code text default null,
  result_internal_error text default null,
  retry_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_request private.enrichment_requests;
  result_accepted boolean;
  result_state text;
  visibility_delay integer;
begin
  if target_queue_name not in (
    'reway_enrichment_interactive',
    'reway_enrichment_bulk'
  ) then
    raise exception using errcode = '22023', message = 'Invalid queue.';
  end if;

  claimed_request := private.lock_enrichment_request_for_asset_work(
    target_request_id,
    target_generation,
    target_lease_token,
    false
  );

  if claimed_request.id is null
    or claimed_request.queue_message_id is distinct from target_message_id
    or private.enrichment_queue_name(claimed_request.queue_name)
      is distinct from target_queue_name
  then
    return 'rejected';
  end if;

  select private.finish_enrichment_request(
    target_request_id,
    target_generation,
    target_lease_token,
    succeeded,
    result_title,
    result_domain,
    result_favicon_asset_id,
    result_og_image_asset_id,
    result_failure_class,
    result_public_error_code,
    result_internal_error,
    retry_at
  )
  into result_accepted;

  select request.state
  into strict result_state
  from private.enrichment_requests as request
  where request.id = target_request_id;

  if result_state = 'queued' then
    visibility_delay := greatest(
      0,
      ceil(extract(epoch from retry_at - clock_timestamp()))
    )::integer;
    perform pgmq.set_vt(
      target_queue_name,
      target_message_id,
      visibility_delay
    );
    if not private.queue_message_exists(
      target_queue_name,
      target_message_id
    ) then
      raise exception using errcode = '55000', message = 'Queue message missing.';
    end if;
  end if;

  if not result_accepted and result_state <> 'cancelled' then
    return 'rejected';
  end if;

  return result_state;
end;
$$;

create or replace function public.worker_finish_enrichment_message(
  target_queue_name text,
  target_message_id text,
  target_request_id uuid,
  target_generation text,
  target_lease_token uuid,
  succeeded boolean,
  result_title text default null,
  result_domain text default null,
  result_favicon_asset_id uuid default null,
  result_og_image_asset_id uuid default null,
  result_failure_class text default null,
  result_public_error_code text default null,
  result_internal_error text default null,
  retry_at timestamptz default null
)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_finish_enrichment_message(
    target_queue_name,
    target_message_id::bigint,
    target_request_id,
    target_generation::bigint,
    target_lease_token,
    succeeded,
    result_title,
    result_domain,
    result_favicon_asset_id,
    result_og_image_asset_id,
    result_failure_class,
    result_public_error_code,
    result_internal_error,
    retry_at
  );
$$;

create or replace function private.worker_claim_bookmark_asset_cleanup(
  batch_size integer,
  lease_seconds integer
)
returns table (
  asset_id uuid,
  user_id uuid,
  object_path text,
  cleanup_attempt_count integer,
  cleanup_lease_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size not between 1 and 100
    or lease_seconds not between 5 and 900
  then
    raise exception using errcode = '22023', message = 'Invalid cleanup claim.';
  end if;

  return query
  with due_assets as (
    (
      select asset.id, asset.delete_after as due_at
      from private.bookmark_assets as asset
      where asset.state = 'delete_pending'
        and asset.delete_after <= clock_timestamp()
      order by asset.delete_after, asset.id
      limit batch_size
    )
    union all
    (
      select asset.id, asset.upload_expires_at as due_at
      from private.bookmark_assets as asset
      where asset.state = 'uploading'
        and asset.upload_expires_at <= clock_timestamp()
      order by asset.upload_expires_at, asset.id
      limit batch_size
    )
    union all
    (
      select asset.id, asset.cleanup_lease_expires_at as due_at
      from private.bookmark_assets as asset
      where asset.state = 'deleting'
        and asset.cleanup_lease_expires_at <= clock_timestamp()
      order by asset.cleanup_lease_expires_at, asset.id
      limit batch_size
    )
  ),
  candidates as (
    select asset.id
    from private.bookmark_assets as asset
    join due_assets on due_assets.id = asset.id
    order by due_assets.due_at, asset.id
    limit batch_size
    for update of asset skip locked
  )
  update private.bookmark_assets as asset
  set state = 'deleting',
    upload_expires_at = null,
    delete_after = coalesce(asset.delete_after, clock_timestamp()),
    cleanup_attempt_count = asset.cleanup_attempt_count + 1,
    cleanup_lease_token = gen_random_uuid(),
    cleanup_lease_expires_at = clock_timestamp() +
      make_interval(secs => lease_seconds)
  from candidates
  where asset.id = candidates.id
  returning
    asset.id,
    asset.user_id,
    asset.object_path,
    asset.cleanup_attempt_count,
    asset.cleanup_lease_token;
end;
$$;

create or replace function public.worker_claim_bookmark_asset_cleanup(
  batch_size integer,
  lease_seconds integer
)
returns table (
  asset_id uuid,
  user_id uuid,
  object_path text,
  cleanup_attempt_count integer,
  cleanup_lease_token uuid
)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.worker_claim_bookmark_asset_cleanup(batch_size, lease_seconds);
$$;

create or replace function private.worker_finish_bookmark_asset_cleanup(
  target_asset_id uuid,
  target_cleanup_lease_token uuid,
  succeeded boolean,
  retry_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not succeeded and (
    retry_at is null
    or retry_at <= clock_timestamp()
    or retry_at > clock_timestamp() + interval '1 day'
  ) then
    raise exception using errcode = '22023', message = 'Invalid cleanup retry.';
  end if;

  update private.bookmark_assets
  set state = case when succeeded then 'deleted' else 'delete_pending' end,
    delete_after = case when succeeded then delete_after else retry_at end,
    cleanup_lease_token = null,
    cleanup_lease_expires_at = null,
    deleted_at = case when succeeded then clock_timestamp() else null end
  where id = target_asset_id
    and cleanup_lease_token = target_cleanup_lease_token
    and state = 'deleting'
    and cleanup_lease_expires_at > clock_timestamp();

  return found;
end;
$$;

create or replace function public.worker_finish_bookmark_asset_cleanup(
  target_asset_id uuid,
  target_cleanup_lease_token uuid,
  succeeded boolean,
  retry_at timestamptz default null
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_finish_bookmark_asset_cleanup(
    target_asset_id,
    target_cleanup_lease_token,
    succeeded,
    retry_at
  );
$$;

create or replace function private.purge_deleted_bookmark_asset_rows(
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
    select asset.id
    from private.bookmark_assets as asset
    where asset.state = 'deleted'
      and asset.deleted_at <= now() - interval '7 days'
    order by asset.deleted_at, asset.id
    limit batch_size
    for update skip locked
  )
  delete from private.bookmark_assets as asset
  using candidates
  where asset.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function private.request_bookmark_reenrichment(
  target_user_id uuid,
  target_bookmark_id bigint,
  target_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_generation bigint;
  existing_bookmark_id bigint;
  existing_request_id uuid;
  new_request_id uuid;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  perform 1
  from public.profiles as profile
  where profile.user_id = target_user_id
  for update;

  select request.id, request.bookmark_id
  into existing_request_id, existing_bookmark_id
  from private.enrichment_requests as request
  where request.user_id = target_user_id
    and request.idempotency_key = target_idempotency_key;

  if existing_request_id is not null then
    if existing_bookmark_id is distinct from target_bookmark_id then
      raise exception using
        errcode = '23505',
        constraint = 'enrichment_requests_user_idempotency_key',
        message = 'Idempotency key conflict.';
    end if;
    if exists (
      select 1
      from private.enrichment_requests as request
      where request.id = existing_request_id and request.state = 'queued'
    ) then
      perform private.send_enrichment_message(existing_request_id);
    end if;
    return existing_request_id;
  end if;

  select bookmark.metadata_generation
  into current_generation
  from public.bookmarks as bookmark
  where bookmark.user_id = target_user_id
    and bookmark.id = target_bookmark_id
    and bookmark.trashed_at is null
  for update;

  if current_generation is null then
    raise exception using errcode = 'P0002', message = 'Bookmark not found.';
  end if;

  current_generation := current_generation + 1;

  update public.bookmarks
  set metadata_generation = current_generation,
    metadata_status = 'pending'
  where user_id = target_user_id and id = target_bookmark_id;

  insert into private.enrichment_requests (
    user_id,
    bookmark_id,
    idempotency_key,
    generation,
    queue_name
  )
  values (
    target_user_id,
    target_bookmark_id,
    target_idempotency_key,
    current_generation,
    'interactive'
  )
  returning id into new_request_id;

  perform private.send_enrichment_message(new_request_id);
  return new_request_id;
end;
$$;

revoke all on table private.bookmark_assets
  from public, anon, authenticated, service_role;

revoke all on function private.guard_bookmark_asset_identity()
  from public, anon, authenticated, service_role;
revoke all on function private.queue_deleted_bookmark_assets()
  from public, anon, authenticated, service_role;
revoke all on function private.lock_enrichment_request_for_asset_work(
  uuid,
  bigint,
  uuid,
  boolean
) from public, anon, authenticated, service_role;
revoke all on function private.worker_reserve_bookmark_asset(
  uuid,
  bigint,
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.worker_reserve_bookmark_asset(
  uuid,
  text,
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;
revoke all on function private.worker_mark_bookmark_asset_ready(
  uuid,
  bigint,
  uuid,
  uuid,
  bytea,
  bigint,
  integer,
  integer
) from public, anon, authenticated, service_role;
revoke all on function public.worker_mark_bookmark_asset_ready(
  uuid,
  text,
  uuid,
  uuid,
  text,
  bigint,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function private.worker_read_enrichment_bookmark_id(
  uuid,
  bigint,
  uuid
) from public, anon, authenticated, service_role;
revoke all on function public.worker_read_enrichment_bookmark_id(
  uuid,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function private.read_bookmark_asset_signing_paths(
  uuid,
  bigint[],
  boolean
) from public, anon, authenticated;
revoke all on function public.read_bookmark_asset_signing_paths(
  bigint[],
  boolean
) from public, anon;
revoke all on function private.finish_enrichment_request(
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.worker_finish_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.worker_finish_enrichment_message(
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated;
revoke all on function private.worker_claim_bookmark_asset_cleanup(
  integer,
  integer
) from public, anon, authenticated, service_role;
revoke all on function public.worker_claim_bookmark_asset_cleanup(
  integer,
  integer
) from public, anon, authenticated;
revoke all on function private.worker_finish_bookmark_asset_cleanup(
  uuid,
  uuid,
  boolean,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.worker_finish_bookmark_asset_cleanup(
  uuid,
  uuid,
  boolean,
  timestamptz
) from public, anon, authenticated;
revoke all on function private.purge_deleted_bookmark_asset_rows(integer)
  from public, anon, authenticated, service_role;

grant execute on function private.worker_reserve_bookmark_asset(
  uuid,
  bigint,
  uuid,
  uuid,
  text,
  text
) to service_role;
grant execute on function public.worker_reserve_bookmark_asset(
  uuid,
  text,
  uuid,
  uuid,
  text,
  text
) to service_role;
grant execute on function private.worker_mark_bookmark_asset_ready(
  uuid,
  bigint,
  uuid,
  uuid,
  bytea,
  bigint,
  integer,
  integer
) to service_role;
grant execute on function public.worker_mark_bookmark_asset_ready(
  uuid,
  text,
  uuid,
  uuid,
  text,
  bigint,
  integer,
  integer
) to service_role;
grant execute on function private.worker_read_enrichment_bookmark_id(
  uuid,
  bigint,
  uuid
) to service_role;
grant execute on function public.worker_read_enrichment_bookmark_id(
  uuid,
  text,
  uuid
) to service_role;
grant execute on function private.read_bookmark_asset_signing_paths(
  uuid,
  bigint[],
  boolean
) to authenticated;
grant execute on function public.read_bookmark_asset_signing_paths(
  bigint[],
  boolean
) to authenticated;
grant execute on function private.worker_finish_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  boolean,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;
grant execute on function public.worker_finish_enrichment_message(
  text,
  text,
  uuid,
  text,
  uuid,
  boolean,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;
grant execute on function private.worker_claim_bookmark_asset_cleanup(
  integer,
  integer
) to service_role;
grant execute on function public.worker_claim_bookmark_asset_cleanup(
  integer,
  integer
) to service_role;
grant execute on function private.worker_finish_bookmark_asset_cleanup(
  uuid,
  uuid,
  boolean,
  timestamptz
) to service_role;
grant execute on function public.worker_finish_bookmark_asset_cleanup(
  uuid,
  uuid,
  boolean,
  timestamptz
) to service_role;
grant execute on function private.purge_deleted_bookmark_asset_rows(integer)
  to service_role;

create or replace function private.request_enrichment_worker_wake(
  target_queue_name text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  wake_marker text;
  worker_api_key text;
  worker_url text;
  wake_token text;
begin
  if target_queue_name not in (
    'reway_enrichment_interactive',
    'reway_enrichment_bulk'
  ) then
    raise exception using errcode = '22023', message = 'Invalid wake queue.';
  end if;

  wake_marker := case target_queue_name
    when 'reway_enrichment_interactive'
      then 'reway.interactive_wake_requested'
    else 'reway.bulk_wake_requested'
  end;
  if current_setting(wake_marker, true) = 'on' then
    return null;
  end if;
  perform set_config(wake_marker, 'on', true);

  begin
    select
      max(secret.decrypted_secret) filter (
        where secret.name = 'reway_worker_api_key'
      ),
      max(secret.decrypted_secret) filter (
        where secret.name = 'reway_worker_url'
      ),
      max(secret.decrypted_secret) filter (
        where secret.name = 'reway_worker_wake_token'
      )
    into worker_api_key, worker_url, wake_token
    from vault.decrypted_secrets as secret
    where secret.name in (
      'reway_worker_api_key',
      'reway_worker_url',
      'reway_worker_wake_token'
    );

    if worker_api_key is null or worker_url is null or wake_token is null then
      return null;
    end if;

    return net.http_post(
      url := worker_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', worker_api_key,
        'x-reway-worker-wake', wake_token
      ),
      body := jsonb_build_object('queue_name', target_queue_name),
      timeout_milliseconds := 5000
    );
  exception when others then
    return null;
  end;
end;
$$;

create or replace function private.wake_enrichment_worker_after_queue_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.request_enrichment_worker_wake(
    private.enrichment_queue_name(new.queue_name)
  );
  return null;
end;
$$;

create trigger enrichment_requests_wake_worker
after update of queue_message_id on private.enrichment_requests
for each row
when (
  new.queue_message_id is not null
  and old.queue_message_id is distinct from new.queue_message_id
)
execute function private.wake_enrichment_worker_after_queue_binding();

select cron.schedule(
  'reway-enrichment-interactive-wake',
  '30 seconds',
  $schedule$
    select private.request_enrichment_worker_wake(
      'reway_enrichment_interactive'
    );
  $schedule$
);

select cron.schedule(
  'reway-enrichment-bulk-wake',
  '30 seconds',
  $schedule$
    select private.request_enrichment_worker_wake(
      'reway_enrichment_bulk'
    );
  $schedule$
);

revoke all on function private.request_enrichment_worker_wake(text)
  from public, anon, authenticated, service_role;
revoke all on function private.wake_enrichment_worker_after_queue_binding()
  from public, anon, authenticated, service_role;
