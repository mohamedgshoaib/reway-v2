create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_source text not null default 'generated',
  generated_avatar_seed uuid not null default gen_random_uuid(),
  google_avatar_url text,
  custom_avatar_path text,
  onboarding_completed_at timestamptz,
  account_state text not null default 'active',
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint profiles_username_format_check check (
    username = regexp_replace(btrim(username), '[[:space:]]+', ' ', 'g')
    and char_length(username) between 1 and 40
    and username !~ '[[:cntrl:]]'
  ),
  constraint profiles_avatar_source_check check (
    avatar_source in ('generated', 'google', 'custom')
  ),
  constraint profiles_avatar_state_check check (
    (avatar_source = 'generated' and custom_avatar_path is null)
    or (
      avatar_source = 'google'
      and google_avatar_url is not null
      and custom_avatar_path is null
    )
    or (avatar_source = 'custom' and custom_avatar_path is not null)
  ),
  constraint profiles_custom_avatar_path_check check (
    custom_avatar_path is null
    or custom_avatar_path like user_id::text || '/%'
  ),
  constraint profiles_account_state_check check (
    account_state in ('active', 'deletion_pending')
  ),
  constraint profiles_deletion_state_check check (
    (account_state = 'active' and deletion_requested_at is null)
    or (
      account_state = 'deletion_pending'
      and deletion_requested_at is not null
    )
  ),
  constraint profiles_row_version_check check (row_version > 0)
);

create table public.dashboard_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system',
  view_mode text not null default 'list',
  bookmark_sort text not null default 'date',
  collection_order_mode text not null default 'newest',
  tag_order_mode text not null default 'alpha',
  desktop_collections_open boolean not null default true,
  desktop_tags_open boolean not null default true,
  mobile_collections_open boolean not null default true,
  mobile_tags_open boolean not null default true,
  root_collection_order_version bigint not null default 0,
  tag_order_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint dashboard_preferences_theme_check check (
    theme in ('system', 'light', 'dark')
  ),
  constraint dashboard_preferences_view_mode_check check (
    view_mode in ('list', 'grid', 'grid-image')
  ),
  constraint dashboard_preferences_bookmark_sort_check check (
    bookmark_sort in ('date', 'visits', 'alpha')
  ),
  constraint dashboard_preferences_collection_order_mode_check check (
    collection_order_mode in ('newest', 'alpha', 'custom')
  ),
  constraint dashboard_preferences_tag_order_mode_check check (
    tag_order_mode in ('newest', 'alpha', 'custom')
  ),
  constraint dashboard_preferences_versions_check check (
    root_collection_order_version >= 0
    and tag_order_version >= 0
    and row_version > 0
  )
);

create table public.bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_request_id uuid not null,
  url text not null,
  url_fingerprint bytea generated always as (
    extensions.digest(url, 'sha256')
  ) stored,
  title text not null,
  normalized_title text generated always as (
    lower(regexp_replace(btrim(title), '[[:space:]]+', ' ', 'g'))
  ) stored,
  domain text,
  favicon_url text,
  og_image_url text,
  metadata_status text not null default 'pending',
  metadata_generation bigint not null default 1,
  collection_count integer not null default 0,
  trashed_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint bookmarks_user_id_id_key unique (user_id, id),
  constraint bookmarks_client_request_key unique (user_id, client_request_id),
  constraint bookmarks_url_format_check check (
    url = btrim(url)
    and url ~* '^https?://'
    and url !~ '[[:cntrl:]]'
  ),
  constraint bookmarks_title_format_check check (
    title = regexp_replace(btrim(title), '[[:space:]]+', ' ', 'g')
    and char_length(title) > 0
    and title !~ '[[:cntrl:]]'
  ),
  constraint bookmarks_metadata_status_check check (
    metadata_status in ('pending', 'enriched', 'failed')
  ),
  constraint bookmarks_metadata_generation_check check (
    metadata_generation > 0
  ),
  constraint bookmarks_collection_count_check check (collection_count >= 0),
  constraint bookmarks_trash_state_check check (
    (trashed_at is null and purge_after is null)
    or (
      trashed_at is not null
      and purge_after is not null
      and purge_after > trashed_at
    )
  ),
  constraint bookmarks_row_version_check check (row_version > 0)
);

create table public.collections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id bigint,
  name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  icon text not null default 'folder',
  color text not null default 'neutral',
  sort_order text collate "C" not null,
  child_order_version bigint not null default 0,
  bookmark_order_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint collections_user_id_id_key unique (user_id, id),
  constraint collections_user_normalized_name_key unique (
    user_id,
    normalized_name
  ),
  constraint collections_user_parent_fkey foreign key (user_id, parent_id)
    references public.collections (user_id, id) on delete cascade,
  constraint collections_not_self_parent_check check (parent_id is distinct from id),
  constraint collections_name_format_check check (
    name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
    and char_length(name) between 1 and 24
    and name !~ '[[:cntrl:]]'
  ),
  constraint collections_icon_check check (
    icon in (
      'airplane',
      'archive',
      'barbell',
      'book',
      'bookmark',
      'briefcase',
      'buildings',
      'calendar',
      'camera',
      'clipboard',
      'code',
      'cooking',
      'folder',
      'heart',
      'home',
      'location',
      'notebook',
      'paintbrush',
      'research',
      'shopping',
      'stack',
      'star',
      'user',
      'x'
    )
  ),
  constraint collections_color_check check (
    color in (
      'neutral',
      'red',
      'orange',
      'amber',
      'lime',
      'green',
      'teal',
      'cyan',
      'blue',
      'indigo',
      'violet',
      'rose'
    )
  ),
  constraint collections_sort_order_check check (
    char_length(sort_order) between 1 and 200
    and sort_order !~ '[[:cntrl:]]'
  ),
  constraint collections_versions_check check (
    child_order_version >= 0
    and bookmark_order_version >= 0
    and row_version > 0
  ),
  constraint collections_sibling_sort_order_key unique nulls not distinct (
    user_id,
    parent_id,
    sort_order
  )
);

create table public.tags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  color text not null default 'neutral',
  sort_order text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint tags_user_id_id_key unique (user_id, id),
  constraint tags_user_normalized_name_key unique (user_id, normalized_name),
  constraint tags_user_sort_order_key unique (user_id, sort_order),
  constraint tags_name_format_check check (
    name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
    and char_length(name) between 1 and 24
    and name !~ '[[:cntrl:]]'
  ),
  constraint tags_color_check check (
    color in (
      'neutral',
      'red',
      'orange',
      'amber',
      'lime',
      'green',
      'teal',
      'cyan',
      'blue',
      'indigo',
      'violet',
      'rose'
    )
  ),
  constraint tags_sort_order_check check (
    char_length(sort_order) between 1 and 200
    and sort_order !~ '[[:cntrl:]]'
  ),
  constraint tags_row_version_check check (row_version > 0)
);

create table public.bookmark_collections (
  user_id uuid not null,
  bookmark_id bigint not null,
  collection_id bigint not null,
  sort_order text collate "C" not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bookmark_id, collection_id),
  constraint bookmark_collections_bookmark_fkey foreign key (
    user_id,
    bookmark_id
  ) references public.bookmarks (user_id, id) on delete cascade,
  constraint bookmark_collections_collection_fkey foreign key (
    user_id,
    collection_id
  ) references public.collections (user_id, id) on delete cascade,
  constraint bookmark_collections_sort_order_check check (
    char_length(sort_order) between 1 and 200
    and sort_order !~ '[[:cntrl:]]'
  ),
  constraint bookmark_collections_scope_sort_order_key unique (
    user_id,
    collection_id,
    sort_order
  )
);

create table public.bookmark_tags (
  user_id uuid not null,
  bookmark_id bigint not null,
  tag_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bookmark_id, tag_id),
  constraint bookmark_tags_bookmark_fkey foreign key (user_id, bookmark_id)
    references public.bookmarks (user_id, id) on delete cascade,
  constraint bookmark_tags_tag_fkey foreign key (user_id, tag_id)
    references public.tags (user_id, id) on delete cascade
);

create table public.bookmark_events (
  id bigint generated always as identity primary key,
  event_id uuid not null,
  user_id uuid not null,
  bookmark_id bigint not null,
  created_at timestamptz not null default now(),
  constraint bookmark_events_user_id_id_key unique (user_id, id),
  constraint bookmark_events_user_event_key unique (user_id, event_id),
  constraint bookmark_events_bookmark_fkey foreign key (user_id, bookmark_id)
    references public.bookmarks (user_id, id) on delete cascade
);

create table public.bookmark_stats (
  bookmark_id bigint primary key,
  user_id uuid not null,
  visit_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint bookmark_stats_user_bookmark_key unique (user_id, bookmark_id),
  constraint bookmark_stats_bookmark_fkey foreign key (user_id, bookmark_id)
    references public.bookmarks (user_id, id) on delete cascade,
  constraint bookmark_stats_visit_count_check check (visit_count >= 0)
);

create table private.bookmark_search (
  bookmark_id bigint primary key,
  user_id uuid not null,
  searchable_text text not null,
  search_vector tsvector not null,
  updated_at timestamptz not null default now(),
  constraint bookmark_search_user_bookmark_key unique (user_id, bookmark_id),
  constraint bookmark_search_bookmark_fkey foreign key (user_id, bookmark_id)
    references public.bookmarks (user_id, id) on delete cascade
);

create table private.enrichment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bookmark_id bigint not null,
  idempotency_key uuid not null,
  generation bigint not null,
  queue_name text not null,
  state text not null default 'queued',
  payload_version integer not null default 1,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  failure_class text,
  public_error_code text,
  internal_error text,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint enrichment_requests_user_id_id_key unique (user_id, id),
  constraint enrichment_requests_user_idempotency_key unique (
    user_id,
    idempotency_key
  ),
  constraint enrichment_requests_bookmark_generation_key unique (
    user_id,
    bookmark_id,
    generation
  ),
  constraint enrichment_requests_bookmark_fkey foreign key (
    user_id,
    bookmark_id
  ) references public.bookmarks (user_id, id) on delete cascade,
  constraint enrichment_requests_generation_check check (generation > 0),
  constraint enrichment_requests_queue_name_check check (
    queue_name in ('interactive', 'bulk')
  ),
  constraint enrichment_requests_state_check check (
    state in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  constraint enrichment_requests_payload_version_check check (
    payload_version > 0
  ),
  constraint enrichment_requests_attempts_check check (
    attempt_count between 0 and max_attempts
    and max_attempts between 1 and 3
  ),
  constraint enrichment_requests_lease_check check (
    (state = 'running' and lease_token is not null and lease_expires_at is not null)
    or (state <> 'running' and lease_token is null and lease_expires_at is null)
  ),
  constraint enrichment_requests_failure_check check (
    failure_class is null or failure_class in ('transient', 'permanent')
  ),
  constraint enrichment_requests_terminal_check check (
    (
      state in ('completed', 'failed', 'cancelled')
      and completed_at is not null
    )
    or (state in ('queued', 'running') and completed_at is null)
  ),
  constraint enrichment_requests_expiry_check check (
    expires_at is null or completed_at is not null
  ),
  constraint enrichment_requests_row_version_check check (row_version > 0)
);

create table private.transfer_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_request_id uuid not null,
  kind text not null,
  state text not null default 'staging',
  payload_version integer not null default 1,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  selected_count bigint not null default 0,
  processed_count bigint not null default 0,
  succeeded_count bigint not null default 0,
  failed_count bigint not null default 0,
  public_error_code text,
  internal_error text,
  terminal_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1,
  constraint transfer_jobs_user_id_id_key unique (user_id, id),
  constraint transfer_jobs_user_request_key unique (user_id, client_request_id),
  constraint transfer_jobs_kind_check check (
    kind in ('import', 'export', 'restore')
  ),
  constraint transfer_jobs_state_check check (
    state in (
      'staging',
      'awaiting_review',
      'queued',
      'running',
      'paused',
      'completed',
      'completed_with_failures',
      'failed',
      'cancelled'
    )
  ),
  constraint transfer_jobs_payload_version_check check (payload_version > 0),
  constraint transfer_jobs_attempts_check check (
    attempt_count between 0 and max_attempts and max_attempts > 0
  ),
  constraint transfer_jobs_lease_check check (
    (state = 'running' and lease_token is not null and lease_expires_at is not null)
    or (state <> 'running' and lease_token is null and lease_expires_at is null)
  ),
  constraint transfer_jobs_counts_check check (
    selected_count >= 0
    and processed_count >= 0
    and succeeded_count >= 0
    and failed_count >= 0
    and processed_count <= selected_count
    and succeeded_count + failed_count <= processed_count
  ),
  constraint transfer_jobs_terminal_check check (
    (
      state in ('completed', 'completed_with_failures', 'failed', 'cancelled')
      and terminal_at is not null
    )
    or (
      state in ('staging', 'awaiting_review', 'queued', 'running', 'paused')
      and terminal_at is null
    )
  ),
  constraint transfer_jobs_expiry_check check (
    expires_at is null or terminal_at is not null
  ),
  constraint transfer_jobs_row_version_check check (row_version > 0)
);

create table private.stored_files (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid,
  purpose text not null,
  object_path text not null,
  format_version integer not null,
  checksum bytea,
  byte_size bigint not null,
  state text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stored_files_user_id_id_key unique (user_id, id),
  constraint stored_files_user_object_path_key unique (user_id, object_path),
  constraint stored_files_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint stored_files_purpose_check check (
    purpose in (
      'import_source',
      'export_result',
      'restore_source',
      'restore_recovery'
    )
  ),
  constraint stored_files_path_check check (
    object_path = btrim(object_path)
    and object_path like user_id::text || '/%'
    and object_path !~ '[[:cntrl:]]'
  ),
  constraint stored_files_format_version_check check (format_version > 0),
  constraint stored_files_byte_size_check check (
    byte_size >= 0
    and (
      purpose not in ('import_source', 'restore_source')
      or byte_size <= 52428800
    )
  ),
  constraint stored_files_state_check check (
    state in ('pending', 'ready', 'failed', 'deleting', 'deleted')
  )
);

create table private.import_job_details (
  job_id uuid primary key,
  user_id uuid not null,
  source_kind text not null,
  source_file_id bigint not null,
  batch_size integer not null default 500,
  invalid_count bigint not null default 0,
  duplicate_count bigint not null default 0,
  flattened_path_count bigint not null default 0,
  unresolved_conflict_count bigint not null default 0,
  constraint import_job_details_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_job_details_source_file_fkey foreign key (
    user_id,
    source_file_id
  ) references private.stored_files (user_id, id) on delete restrict,
  constraint import_job_details_source_kind_check check (
    source_kind in ('x_archive', 'browser_html')
  ),
  constraint import_job_details_batch_size_check check (batch_size > 0),
  constraint import_job_details_counts_check check (
    invalid_count >= 0
    and duplicate_count >= 0
    and flattened_path_count >= 0
    and unresolved_conflict_count >= 0
  )
);

create table private.export_job_details (
  job_id uuid primary key,
  user_id uuid not null,
  export_format text not null,
  output_file_id bigint,
  cursor_bookmark_id bigint,
  constraint export_job_details_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint export_job_details_output_file_fkey foreign key (
    user_id,
    output_file_id
  ) references private.stored_files (user_id, id)
    on delete set null (output_file_id),
  constraint export_job_details_format_check check (
    export_format in ('browser_html', 'reway_json')
  )
);

create table private.restore_job_details (
  job_id uuid primary key,
  user_id uuid not null,
  source_file_id bigint not null,
  recovery_file_id bigint,
  validated_library_version bigint,
  confirmation_version bigint,
  constraint restore_job_details_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint restore_job_details_source_file_fkey foreign key (
    user_id,
    source_file_id
  ) references private.stored_files (user_id, id) on delete restrict,
  constraint restore_job_details_recovery_file_fkey foreign key (
    user_id,
    recovery_file_id
  ) references private.stored_files (user_id, id)
    on delete set null (recovery_file_id),
  constraint restore_job_details_versions_check check (
    (validated_library_version is null or validated_library_version >= 0)
    and (confirmation_version is null or confirmation_version >= 0)
  )
);

create table private.restore_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  restore_job_id uuid not null,
  recovery_file_id bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint restore_snapshots_user_id_id_key unique (user_id, id),
  constraint restore_snapshots_job_fkey foreign key (user_id, restore_job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint restore_snapshots_file_fkey foreign key (user_id, recovery_file_id)
    references private.stored_files (user_id, id) on delete restrict,
  constraint restore_snapshots_expiry_check check (expires_at > created_at)
);

create table private.import_stage_collections (
  job_id uuid not null,
  user_id uuid not null,
  item_key text not null,
  parent_item_key text,
  display_name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  icon text not null default 'folder',
  color text not null default 'neutral',
  source_position bigint not null,
  result_collection_id bigint,
  state text not null default 'staged',
  public_error_code text,
  primary key (job_id, item_key),
  constraint import_stage_collections_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_stage_collections_result_fkey foreign key (
    user_id,
    result_collection_id
  ) references public.collections (user_id, id)
    on delete set null (result_collection_id),
  constraint import_stage_collections_item_key_check check (
    item_key = btrim(item_key) and char_length(item_key) > 0
  ),
  constraint import_stage_collections_name_check check (
    display_name = regexp_replace(
      btrim(display_name),
      '[[:space:]]+',
      ' ',
      'g'
    )
    and char_length(display_name) between 1 and 24
    and display_name !~ '[[:cntrl:]]'
  ),
  constraint import_stage_collections_position_check check (source_position >= 0),
  constraint import_stage_collections_state_check check (
    state in ('staged', 'selected', 'committed', 'failed', 'skipped')
  )
);

create table private.import_stage_tags (
  job_id uuid not null,
  user_id uuid not null,
  item_key text not null,
  display_name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  color text not null default 'neutral',
  source_position bigint not null,
  result_tag_id bigint,
  state text not null default 'staged',
  public_error_code text,
  primary key (job_id, item_key),
  constraint import_stage_tags_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_stage_tags_result_fkey foreign key (user_id, result_tag_id)
    references public.tags (user_id, id) on delete set null (result_tag_id),
  constraint import_stage_tags_item_key_check check (
    item_key = btrim(item_key) and char_length(item_key) > 0
  ),
  constraint import_stage_tags_name_check check (
    display_name = regexp_replace(
      btrim(display_name),
      '[[:space:]]+',
      ' ',
      'g'
    )
    and char_length(display_name) between 1 and 24
    and display_name !~ '[[:cntrl:]]'
  ),
  constraint import_stage_tags_position_check check (source_position >= 0),
  constraint import_stage_tags_state_check check (
    state in ('staged', 'selected', 'committed', 'failed', 'skipped')
  )
);

create table private.import_stage_bookmarks (
  job_id uuid not null,
  user_id uuid not null,
  item_key text not null,
  url text not null,
  title text not null,
  source_created_at timestamptz,
  source_position bigint not null,
  selected boolean not null default true,
  result_bookmark_id bigint,
  state text not null default 'staged',
  public_error_code text,
  primary key (job_id, item_key),
  constraint import_stage_bookmarks_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_stage_bookmarks_result_fkey foreign key (
    user_id,
    result_bookmark_id
  ) references public.bookmarks (user_id, id)
    on delete set null (result_bookmark_id),
  constraint import_stage_bookmarks_item_key_check check (
    item_key = btrim(item_key) and char_length(item_key) > 0
  ),
  constraint import_stage_bookmarks_url_check check (
    url = btrim(url) and url ~* '^https?://' and url !~ '[[:cntrl:]]'
  ),
  constraint import_stage_bookmarks_title_check check (
    title = regexp_replace(btrim(title), '[[:space:]]+', ' ', 'g')
    and char_length(title) > 0
    and title !~ '[[:cntrl:]]'
  ),
  constraint import_stage_bookmarks_position_check check (source_position >= 0),
  constraint import_stage_bookmarks_state_check check (
    state in ('staged', 'selected', 'committed', 'failed', 'skipped')
  )
);

create table private.import_stage_bookmark_collections (
  job_id uuid not null,
  user_id uuid not null,
  bookmark_item_key text not null,
  collection_item_key text not null,
  source_position bigint not null,
  state text not null default 'staged',
  public_error_code text,
  primary key (job_id, bookmark_item_key, collection_item_key),
  constraint import_stage_bookmark_collections_job_fkey foreign key (
    user_id,
    job_id
  ) references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_stage_bookmark_collections_bookmark_fkey foreign key (
    job_id,
    bookmark_item_key
  ) references private.import_stage_bookmarks (job_id, item_key) on delete cascade,
  constraint import_stage_bookmark_collections_collection_fkey foreign key (
    job_id,
    collection_item_key
  ) references private.import_stage_collections (job_id, item_key) on delete cascade,
  constraint import_stage_bookmark_collections_position_check check (
    source_position >= 0
  ),
  constraint import_stage_bookmark_collections_state_check check (
    state in ('staged', 'committed', 'failed', 'skipped')
  )
);

create table private.import_stage_bookmark_tags (
  job_id uuid not null,
  user_id uuid not null,
  bookmark_item_key text not null,
  tag_item_key text not null,
  state text not null default 'staged',
  public_error_code text,
  primary key (job_id, bookmark_item_key, tag_item_key),
  constraint import_stage_bookmark_tags_job_fkey foreign key (user_id, job_id)
    references private.transfer_jobs (user_id, id) on delete cascade,
  constraint import_stage_bookmark_tags_bookmark_fkey foreign key (
    job_id,
    bookmark_item_key
  ) references private.import_stage_bookmarks (job_id, item_key) on delete cascade,
  constraint import_stage_bookmark_tags_tag_fkey foreign key (job_id, tag_item_key)
    references private.import_stage_tags (job_id, item_key) on delete cascade,
  constraint import_stage_bookmark_tags_state_check check (
    state in ('staged', 'committed', 'failed', 'skipped')
  )
);

create index bookmarks_user_url_fingerprint_idx
  on public.bookmarks (user_id, url_fingerprint, id);
create index bookmarks_active_created_idx
  on public.bookmarks (user_id, created_at desc, id desc)
  where trashed_at is null;
create index bookmarks_active_title_idx
  on public.bookmarks (user_id, normalized_title, id)
  where trashed_at is null;
create index bookmarks_uncollected_created_idx
  on public.bookmarks (user_id, created_at desc, id desc)
  where trashed_at is null and collection_count = 0;
create index bookmarks_user_trash_idx
  on public.bookmarks (user_id, purge_after, id)
  where trashed_at is not null;
create index bookmarks_expired_trash_idx
  on public.bookmarks (purge_after, id)
  where purge_after is not null;

create index collections_user_parent_created_idx
  on public.collections (user_id, parent_id, created_at desc, id);
create index collections_user_parent_order_idx
  on public.collections (user_id, parent_id, sort_order, id);

create index tags_user_created_idx
  on public.tags (user_id, created_at desc, id);
create index tags_user_order_idx
  on public.tags (user_id, sort_order, id);

create index bookmark_collections_collection_bookmark_idx
  on public.bookmark_collections (user_id, collection_id, bookmark_id);
create index bookmark_collections_collection_order_idx
  on public.bookmark_collections (
    user_id,
    collection_id,
    sort_order,
    bookmark_id
  );
create index bookmark_tags_tag_bookmark_idx
  on public.bookmark_tags (user_id, tag_id, bookmark_id);

create index bookmark_events_user_bookmark_created_idx
  on public.bookmark_events (user_id, bookmark_id, created_at desc, id desc);
create index bookmark_events_expiry_idx
  on public.bookmark_events (created_at, id);

create index bookmark_stats_user_visits_idx
  on public.bookmark_stats (user_id, visit_count desc, bookmark_id);

create index bookmark_search_user_bookmark_idx
  on private.bookmark_search (user_id, bookmark_id);
create index bookmark_search_vector_idx
  on private.bookmark_search using gin (search_vector);
create index bookmark_search_trigram_idx
  on private.bookmark_search using gin (
    searchable_text extensions.gin_trgm_ops
  );

create index enrichment_requests_bookmark_idx
  on private.enrichment_requests (user_id, bookmark_id, generation desc);
create index enrichment_requests_claim_idx
  on private.enrichment_requests (queue_name, next_attempt_at, created_at, id)
  where state = 'queued';
create index enrichment_requests_lease_idx
  on private.enrichment_requests (lease_expires_at, id)
  where state = 'running';
create index enrichment_requests_expiry_idx
  on private.enrichment_requests (expires_at, id)
  where expires_at is not null;

create index transfer_jobs_user_active_idx
  on private.transfer_jobs (user_id, updated_at desc, id)
  where state in ('staging', 'awaiting_review', 'queued', 'running', 'paused');
create index transfer_jobs_claim_idx
  on private.transfer_jobs (next_attempt_at, created_at, id)
  where state = 'queued';
create index transfer_jobs_lease_idx
  on private.transfer_jobs (lease_expires_at, id)
  where state = 'running';
create index transfer_jobs_expiry_idx
  on private.transfer_jobs (expires_at, id)
  where expires_at is not null;

create index stored_files_job_idx
  on private.stored_files (user_id, job_id, id);
create index stored_files_expiry_idx
  on private.stored_files (expires_at, id)
  where expires_at is not null and state <> 'deleted';

create index restore_snapshots_user_created_idx
  on private.restore_snapshots (user_id, created_at desc, id desc);
create index restore_snapshots_expiry_idx
  on private.restore_snapshots (expires_at, id);

create index import_stage_collections_job_position_idx
  on private.import_stage_collections (user_id, job_id, source_position, item_key);
create index import_stage_tags_job_position_idx
  on private.import_stage_tags (user_id, job_id, source_position, item_key);
create index import_stage_bookmarks_job_position_idx
  on private.import_stage_bookmarks (user_id, job_id, source_position, item_key);
create index import_stage_bookmarks_pending_idx
  on private.import_stage_bookmarks (user_id, job_id, source_position, item_key)
  where selected and state in ('staged', 'selected', 'failed');

create or replace function private.set_updated_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.row_version := old.row_version + 1;
  return new;
end;
$$;

create trigger profiles_set_updated_row
before update on public.profiles
for each row execute function private.set_updated_row();

create trigger dashboard_preferences_set_updated_row
before update on public.dashboard_preferences
for each row execute function private.set_updated_row();

create trigger bookmarks_set_updated_row
before update on public.bookmarks
for each row execute function private.set_updated_row();

create trigger collections_set_updated_row
before update on public.collections
for each row execute function private.set_updated_row();

create trigger tags_set_updated_row
before update on public.tags
for each row execute function private.set_updated_row();

create trigger enrichment_requests_set_updated_row
before update on private.enrichment_requests
for each row execute function private.set_updated_row();

create trigger transfer_jobs_set_updated_row
before update on private.transfer_jobs
for each row execute function private.set_updated_row();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookmark_stats_touch_updated_at
before update on public.bookmark_stats
for each row execute function private.touch_updated_at();

create trigger bookmark_search_touch_updated_at
before update on private.bookmark_search
for each row execute function private.touch_updated_at();

create trigger stored_files_touch_updated_at
before update on private.stored_files
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text;
  candidate_google_avatar text;
begin
  candidate_username := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'given_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user'
  );
  candidate_username := regexp_replace(
    candidate_username,
    '[[:cntrl:]]',
    '',
    'g'
  );
  candidate_username := regexp_replace(
    btrim(candidate_username),
    '[[:space:]]+',
    ' ',
    'g'
  );
  candidate_username := left(coalesce(nullif(candidate_username, ''), 'user'), 40);

  candidate_google_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'), '')
  );

  insert into public.profiles (
    user_id,
    username,
    avatar_source,
    google_avatar_url
  )
  values (
    new.id,
    candidate_username,
    case when candidate_google_avatar is null then 'generated' else 'google' end,
    candidate_google_avatar
  )
  on conflict (user_id) do nothing;

  insert into public.dashboard_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_reway_account_rows
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.enforce_collection_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_parent_id bigint;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using
      errcode = '23514',
      constraint = 'collections_user_id_immutable',
      message = 'A collection owner cannot change.';
  end if;

  perform 1
  from public.profiles
  where user_id = new.user_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      constraint = 'collections_user_profile_fkey',
      message = 'The collection owner does not exist.';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception using
      errcode = '23514',
      constraint = 'collections_not_self_parent_check',
      message = 'A collection cannot be its own parent.';
  end if;

  select parent.parent_id
  into parent_parent_id
  from public.collections as parent
  where parent.user_id = new.user_id and parent.id = new.parent_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      constraint = 'collections_user_parent_fkey',
      message = 'The parent collection does not exist for this owner.';
  end if;

  if parent_parent_id is not null then
    raise exception using
      errcode = '23514',
      constraint = 'collections_max_depth_check',
      message = 'A child collection cannot contain another collection.';
  end if;

  perform 1
  from public.collections as child
  where child.user_id = new.user_id and child.parent_id = new.id
  order by child.id
  for update;

  if found then
    raise exception using
      errcode = '23514',
      constraint = 'collections_parent_cannot_be_child_check',
      message = 'Move nested collections before assigning this collection a parent.';
  end if;

  return new;
end;
$$;

create trigger collections_enforce_hierarchy
before insert or update of user_id, parent_id on public.collections
for each row execute function private.enforce_collection_hierarchy();

create or replace function private.validate_transfer_job_detail()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actual_kind text;
begin
  select job.kind
  into actual_kind
  from private.transfer_jobs as job
  where job.user_id = new.user_id and job.id = new.job_id
  for key share;

  if actual_kind is distinct from tg_argv[0] then
    raise exception using
      errcode = '23514',
      constraint = tg_table_name || '_job_kind_check',
      message = 'The transfer job kind does not match its detail row.';
  end if;

  return new;
end;
$$;

create trigger import_job_details_validate_kind
before insert or update of user_id, job_id on private.import_job_details
for each row execute function private.validate_transfer_job_detail('import');

create trigger export_job_details_validate_kind
before insert or update of user_id, job_id on private.export_job_details
for each row execute function private.validate_transfer_job_detail('export');

create trigger restore_job_details_validate_kind
before insert or update of user_id, job_id on private.restore_job_details
for each row execute function private.validate_transfer_job_detail('restore');

create or replace function private.create_bookmark_stats_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.bookmark_stats (bookmark_id, user_id)
  select rows.id, rows.user_id
  from new_bookmarks as rows
  on conflict (bookmark_id) do nothing;

  return null;
end;
$$;

create trigger bookmarks_create_stats_rows
after insert on public.bookmarks
referencing new table as new_bookmarks
for each statement execute function private.create_bookmark_stats_rows();

create or replace function private.increment_bookmark_visit_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookmark_stats as stats
  set visit_count = stats.visit_count + inserted.visit_count
  from (
    select rows.user_id, rows.bookmark_id, count(*)::bigint as visit_count
    from new_bookmark_events as rows
    group by rows.user_id, rows.bookmark_id
  ) as inserted
  where stats.user_id = inserted.user_id
    and stats.bookmark_id = inserted.bookmark_id;

  return null;
end;
$$;

create trigger bookmark_events_increment_stats
after insert on public.bookmark_events
referencing new table as new_bookmark_events
for each statement execute function private.increment_bookmark_visit_counts();

create or replace function private.increment_bookmark_collection_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookmarks as bookmark
  set collection_count = bookmark.collection_count + inserted.membership_count
  from (
    select rows.user_id, rows.bookmark_id, count(*)::integer as membership_count
    from new_bookmark_collections as rows
    group by rows.user_id, rows.bookmark_id
  ) as inserted
  where bookmark.user_id = inserted.user_id
    and bookmark.id = inserted.bookmark_id;

  return null;
end;
$$;

create or replace function private.decrement_bookmark_collection_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookmarks as bookmark
  set collection_count = greatest(
    0,
    bookmark.collection_count - deleted.membership_count
  )
  from (
    select rows.user_id, rows.bookmark_id, count(*)::integer as membership_count
    from old_bookmark_collections as rows
    group by rows.user_id, rows.bookmark_id
  ) as deleted
  where bookmark.user_id = deleted.user_id
    and bookmark.id = deleted.bookmark_id;

  return null;
end;
$$;

create trigger bookmark_collections_increment_counts
after insert on public.bookmark_collections
referencing new table as new_bookmark_collections
for each statement execute function private.increment_bookmark_collection_counts();

create trigger bookmark_collections_decrement_counts
after delete on public.bookmark_collections
referencing old table as old_bookmark_collections
for each statement execute function private.decrement_bookmark_collection_counts();

create or replace function private.refresh_bookmark_search(
  target_bookmark_ids bigint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_bookmark_ids is null or cardinality(target_bookmark_ids) = 0 then
    return;
  end if;

  delete from private.bookmark_search
  where bookmark_id = any(target_bookmark_ids);

  insert into private.bookmark_search (
    bookmark_id,
    user_id,
    searchable_text,
    search_vector
  )
  select
    bookmark.id,
    bookmark.user_id,
    concat_ws(' ', bookmark.title, coalesce(tag_names.names, ''), bookmark.url),
    setweight(to_tsvector('simple', bookmark.title), 'A')
      || setweight(to_tsvector('simple', coalesce(tag_names.names, '')), 'B')
      || setweight(to_tsvector('simple', bookmark.url), 'C')
  from public.bookmarks as bookmark
  left join lateral (
    select string_agg(tag.name, ' ' order by tag.id) as names
    from public.bookmark_tags as membership
    join public.tags as tag
      on tag.user_id = membership.user_id and tag.id = membership.tag_id
    where membership.user_id = bookmark.user_id
      and membership.bookmark_id = bookmark.id
  ) as tag_names on true
  where bookmark.id = any(target_bookmark_ids)
    and bookmark.trashed_at is null;
end;
$$;

create or replace function private.refresh_search_after_bookmark_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_bookmark_search(
    (select array_agg(rows.id) from new_bookmarks as rows)
  );
  return null;
end;
$$;

create or replace function private.refresh_search_after_bookmark_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_bookmark_search(
    (
      select array_agg(updated.id)
      from new_bookmarks as updated
      join old_bookmarks as previous on previous.id = updated.id
      where updated.title is distinct from previous.title
        or updated.url is distinct from previous.url
        or updated.trashed_at is distinct from previous.trashed_at
    )
  );
  return null;
end;
$$;

create or replace function private.refresh_search_after_bookmark_tag_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_bookmark_search(
    (select array_agg(distinct rows.bookmark_id) from new_bookmark_tags as rows)
  );
  return null;
end;
$$;

create or replace function private.refresh_search_after_bookmark_tag_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_bookmark_search(
    (select array_agg(distinct rows.bookmark_id) from old_bookmark_tags as rows)
  );
  return null;
end;
$$;

create or replace function private.refresh_search_after_tag_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_bookmark_search(
    (
      select array_agg(distinct membership.bookmark_id)
      from new_tags as updated
      join old_tags as previous on previous.id = updated.id
      join public.bookmark_tags as membership
        on membership.user_id = updated.user_id and membership.tag_id = updated.id
      where updated.name is distinct from previous.name
    )
  );
  return null;
end;
$$;

create trigger bookmarks_refresh_search_after_insert
after insert on public.bookmarks
referencing new table as new_bookmarks
for each statement execute function private.refresh_search_after_bookmark_insert();

create trigger bookmarks_refresh_search_after_update
after update on public.bookmarks
referencing old table as old_bookmarks new table as new_bookmarks
for each statement execute function private.refresh_search_after_bookmark_update();

create trigger bookmark_tags_refresh_search_after_insert
after insert on public.bookmark_tags
referencing new table as new_bookmark_tags
for each statement execute function private.refresh_search_after_bookmark_tag_insert();

create trigger bookmark_tags_refresh_search_after_delete
after delete on public.bookmark_tags
referencing old table as old_bookmark_tags
for each statement execute function private.refresh_search_after_bookmark_tag_delete();

create trigger tags_refresh_search_after_update
after update on public.tags
referencing old table as old_tags new table as new_tags
for each statement execute function private.refresh_search_after_tag_update();

create or replace function private.broadcast_bookmark_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_bookmark public.bookmarks;
begin
  if current_setting('reway.suppress_broadcast', true) = 'on' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    changed_bookmark := old;
  else
    changed_bookmark := new;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'operation', lower(tg_op),
      'bookmark_id', changed_bookmark.id,
      'row_version', changed_bookmark.row_version
    ),
    'bookmark_changed',
    'library:' || changed_bookmark.user_id::text,
    true
  );

  return null;
end;
$$;

create trigger bookmarks_broadcast_change
after insert or update or delete on public.bookmarks
for each row execute function private.broadcast_bookmark_change();

create or replace function private.account_accepts_writes(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles as profile
      where profile.user_id = target_user_id
        and profile.account_state = 'active'
    );
$$;

create or replace function private.read_transfer_job_status(target_job_id uuid)
returns table (
  id uuid,
  kind text,
  state text,
  selected_count bigint,
  processed_count bigint,
  succeeded_count bigint,
  failed_count bigint,
  public_error_code text,
  terminal_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  row_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    job.id,
    job.kind,
    job.state,
    job.selected_count,
    job.processed_count,
    job.succeeded_count,
    job.failed_count,
    job.public_error_code,
    job.terminal_at,
    job.created_at,
    job.updated_at,
    job.row_version
  from private.transfer_jobs as job
  where job.id = target_job_id
    and job.user_id = (select auth.uid());
$$;

create or replace function public.get_transfer_job_status(target_job_id uuid)
returns table (
  id uuid,
  kind text,
  state text,
  selected_count bigint,
  processed_count bigint,
  succeeded_count bigint,
  failed_count bigint,
  public_error_code text,
  terminal_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  row_version bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.read_transfer_job_status(target_job_id);
$$;

create or replace function private.send_library_resync(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select realtime.send(
    jsonb_build_object('reason', 'bulk_mutation'),
    'library_resync_required',
    'library:' || target_user_id::text,
    true
  );
$$;

create or replace function private.create_bookmark(
  target_user_id uuid,
  target_client_request_id uuid,
  target_url text,
  target_title text,
  target_queue_name text,
  target_created_at timestamptz
)
returns public.bookmarks
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_bookmark public.bookmarks;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if target_queue_name not in ('interactive', 'bulk') then
    raise exception using
      errcode = '23514',
      constraint = 'enrichment_requests_queue_name_check',
      message = 'Invalid enrichment queue.';
  end if;

  insert into public.bookmarks (
    user_id,
    client_request_id,
    url,
    title,
    created_at
  )
  values (
    target_user_id,
    target_client_request_id,
    target_url,
    target_title,
    coalesce(target_created_at, now())
  )
  on conflict (user_id, client_request_id) do nothing
  returning * into created_bookmark;

  if created_bookmark.id is null then
    select bookmark.*
    into strict created_bookmark
    from public.bookmarks as bookmark
    where bookmark.user_id = target_user_id
      and bookmark.client_request_id = target_client_request_id;

    return created_bookmark;
  end if;

  insert into private.enrichment_requests (
    user_id,
    bookmark_id,
    idempotency_key,
    generation,
    queue_name
  )
  values (
    target_user_id,
    created_bookmark.id,
    target_client_request_id,
    created_bookmark.metadata_generation,
    target_queue_name
  );

  return created_bookmark;
end;
$$;

create or replace function public.create_bookmark(
  client_request_id uuid,
  url text,
  title text,
  queue_name text default 'interactive',
  created_at timestamptz default null
)
returns public.bookmarks
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_bookmark(
    (select auth.uid()),
    client_request_id,
    url,
    title,
    queue_name,
    created_at
  );
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
  existing_request_id uuid;
  new_request_id uuid;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  select request.id
  into existing_request_id
  from private.enrichment_requests as request
  where request.user_id = target_user_id
    and request.idempotency_key = target_idempotency_key;

  if existing_request_id is not null then
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

  return new_request_id;
end;
$$;

create or replace function public.request_bookmark_reenrichment(
  bookmark_id bigint,
  idempotency_key uuid
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.request_bookmark_reenrichment(
    (select auth.uid()),
    bookmark_id,
    idempotency_key
  );
$$;

create or replace function private.lock_owned_bookmarks(
  target_user_id uuid,
  target_bookmark_ids bigint[],
  required_trash_state text default 'any'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  distinct_target_count integer;
  locked_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if required_trash_state not in ('any', 'active', 'trash') then
    raise exception using errcode = '22023', message = 'Invalid Trash state.';
  end if;

  select count(distinct bookmark_id)::integer
  into distinct_target_count
  from unnest(target_bookmark_ids) as selected(bookmark_id);

  if distinct_target_count = 0
    or distinct_target_count is distinct from cardinality(target_bookmark_ids)
  then
    raise exception using
      errcode = '22023',
      message = 'Bookmark IDs must be a non-empty distinct set.';
  end if;

  select count(*)::integer
  into locked_count
  from (
    select bookmark.id
    from public.bookmarks as bookmark
    where bookmark.user_id = target_user_id
      and bookmark.id = any(target_bookmark_ids)
      and (
        required_trash_state = 'any'
        or (
          required_trash_state = 'active'
          and bookmark.trashed_at is null
        )
        or (
          required_trash_state = 'trash'
          and bookmark.trashed_at is not null
          and bookmark.purge_after > now()
        )
      )
    order by bookmark.id
    for update
  ) as locked;

  if locked_count is distinct from distinct_target_count then
    raise exception using errcode = 'P0002', message = 'Bookmark set changed.';
  end if;

  return locked_count;
end;
$$;

create or replace function private.trash_bookmarks(
  target_user_id uuid,
  target_bookmark_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  previous_broadcast_setting text;
begin
  affected_count := private.lock_owned_bookmarks(
    target_user_id,
    target_bookmark_ids,
    'active'
  );
  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  update public.bookmarks
  set trashed_at = now(), purge_after = now() + interval '30 days'
  where user_id = target_user_id and id = any(target_bookmark_ids);

  perform private.send_library_resync(target_user_id);
  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );
  return affected_count;
end;
$$;

create or replace function public.trash_bookmarks(bookmark_ids bigint[])
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.trash_bookmarks((select auth.uid()), bookmark_ids);
$$;

create or replace function private.restore_bookmarks(
  target_user_id uuid,
  target_bookmark_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  previous_broadcast_setting text;
begin
  affected_count := private.lock_owned_bookmarks(
    target_user_id,
    target_bookmark_ids,
    'trash'
  );
  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  update public.bookmarks
  set trashed_at = null, purge_after = null
  where user_id = target_user_id and id = any(target_bookmark_ids);

  perform private.send_library_resync(target_user_id);
  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );
  return affected_count;
end;
$$;

create or replace function public.restore_bookmarks(bookmark_ids bigint[])
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.restore_bookmarks((select auth.uid()), bookmark_ids);
$$;

create or replace function private.delete_bookmarks_forever(
  target_user_id uuid,
  target_bookmark_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  previous_broadcast_setting text;
begin
  affected_count := private.lock_owned_bookmarks(
    target_user_id,
    target_bookmark_ids,
    'trash'
  );
  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  delete from public.bookmarks
  where user_id = target_user_id and id = any(target_bookmark_ids);

  perform private.send_library_resync(target_user_id);
  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );
  return affected_count;
end;
$$;

create or replace function public.delete_bookmarks_forever(
  bookmark_ids bigint[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.delete_bookmarks_forever((select auth.uid()), bookmark_ids);
$$;

create or replace function private.apply_collection_membership_bulk(
  target_user_id uuid,
  target_action text,
  target_bookmark_ids bigint[],
  target_collection_id bigint,
  target_sort_orders text[] default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  previous_broadcast_setting text;
begin
  if target_action not in ('add', 'move', 'remove') then
    raise exception using errcode = '22023', message = 'Invalid collection action.';
  end if;

  affected_count := private.lock_owned_bookmarks(
    target_user_id,
    target_bookmark_ids,
    'active'
  );

  perform 1
  from public.collections
  where user_id = target_user_id and id = target_collection_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Collection not found.';
  end if;

  if target_action in ('add', 'move') and (
    target_sort_orders is null
    or cardinality(target_sort_orders) <> cardinality(target_bookmark_ids)
  ) then
    raise exception using
      errcode = '22023',
      message = 'One order key is required for each bookmark.';
  end if;

  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  if target_action = 'move' then
    delete from public.bookmark_collections
    where user_id = target_user_id and bookmark_id = any(target_bookmark_ids);
  elsif target_action = 'remove' then
    delete from public.bookmark_collections
    where user_id = target_user_id
      and bookmark_id = any(target_bookmark_ids)
      and collection_id = target_collection_id;
  end if;

  if target_action in ('add', 'move') then
    insert into public.bookmark_collections (
      user_id,
      bookmark_id,
      collection_id,
      sort_order
    )
    select
      target_user_id,
      input.bookmark_id,
      target_collection_id,
      input.sort_order
    from unnest(target_bookmark_ids, target_sort_orders)
      as input(bookmark_id, sort_order)
    on conflict (user_id, bookmark_id, collection_id)
    do update set sort_order = excluded.sort_order;
  end if;

  perform private.send_library_resync(target_user_id);
  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );
  return affected_count;
end;
$$;

create or replace function public.add_bookmarks_to_collection(
  bookmark_ids bigint[],
  collection_id bigint,
  sort_orders text[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.apply_collection_membership_bulk(
    (select auth.uid()),
    'add',
    bookmark_ids,
    collection_id,
    sort_orders
  );
$$;

create or replace function public.move_bookmarks_to_collection(
  bookmark_ids bigint[],
  collection_id bigint,
  sort_orders text[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.apply_collection_membership_bulk(
    (select auth.uid()),
    'move',
    bookmark_ids,
    collection_id,
    sort_orders
  );
$$;

create or replace function public.remove_bookmarks_from_collection(
  bookmark_ids bigint[],
  collection_id bigint
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.apply_collection_membership_bulk(
    (select auth.uid()),
    'remove',
    bookmark_ids,
    collection_id,
    null
  );
$$;

create or replace function private.delete_collection(
  target_user_id uuid,
  target_collection_id bigint
)
returns table (deleted_collection_count integer, trashed_bookmark_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_ids bigint[];
  bookmark_ids bigint[];
  previous_broadcast_setting text;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  perform 1
  from public.profiles
  where user_id = target_user_id
  for update;

  select array_agg(collection.id order by collection.id)
  into collection_ids
  from public.collections as collection
  where collection.user_id = target_user_id
    and (
      collection.id = target_collection_id
      or collection.parent_id = target_collection_id
    );

  if collection_ids is null then
    raise exception using errcode = 'P0002', message = 'Collection not found.';
  end if;

  perform collection.id
  from public.collections as collection
  where collection.user_id = target_user_id
    and collection.id = any(collection_ids)
  order by collection.id
  for update;

  select array_agg(candidate.bookmark_id order by candidate.bookmark_id)
  into bookmark_ids
  from (
    select membership.bookmark_id
    from public.bookmark_collections as membership
    join public.bookmarks as bookmark
      on bookmark.user_id = membership.user_id
      and bookmark.id = membership.bookmark_id
    where membership.user_id = target_user_id
      and bookmark.trashed_at is null
    group by membership.bookmark_id
    having bool_or(membership.collection_id = any(collection_ids))
      and bool_and(membership.collection_id = any(collection_ids))
  ) as candidate;

  if bookmark_ids is not null then
    perform bookmark.id
    from public.bookmarks as bookmark
    where bookmark.user_id = target_user_id
      and bookmark.id = any(bookmark_ids)
    order by bookmark.id
    for update;
  end if;

  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  if bookmark_ids is not null then
    update public.bookmarks
    set trashed_at = now(), purge_after = now() + interval '30 days'
    where user_id = target_user_id and id = any(bookmark_ids);
  end if;

  delete from public.collections
  where user_id = target_user_id and id = target_collection_id;

  perform private.send_library_resync(target_user_id);
  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );

  return query select
    cardinality(collection_ids),
    coalesce(cardinality(bookmark_ids), 0);
end;
$$;

create or replace function public.delete_collection(collection_id bigint)
returns table (deleted_collection_count integer, trashed_bookmark_count integer)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.delete_collection((select auth.uid()), collection_id);
$$;

create or replace function private.delete_tag(
  target_user_id uuid,
  target_tag_id bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  perform 1
  from public.tags
  where user_id = target_user_id and id = target_tag_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tag not found.';
  end if;

  select count(*)::integer
  into affected_count
  from public.bookmark_tags
  where user_id = target_user_id and tag_id = target_tag_id;

  delete from public.tags
  where user_id = target_user_id and id = target_tag_id;

  perform private.send_library_resync(target_user_id);
  return affected_count;
end;
$$;

create or replace function public.delete_tag(tag_id bigint)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.delete_tag((select auth.uid()), tag_id);
$$;

create or replace function private.reorder_collection(
  target_user_id uuid,
  target_collection_id bigint,
  target_parent_id bigint,
  target_sort_order text,
  expected_source_version bigint,
  expected_destination_version bigint
)
returns table (source_version bigint, destination_version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_parent_id bigint;
  current_source_version bigint;
  current_destination_version bigint;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  perform 1
  from public.profiles
  where user_id = target_user_id
  for update;

  select collection.parent_id
  into source_parent_id
  from public.collections as collection
  where collection.user_id = target_user_id
    and collection.id = target_collection_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Collection not found.';
  end if;

  if source_parent_id is null then
    select preference.root_collection_order_version
    into current_source_version
    from public.dashboard_preferences as preference
    where preference.user_id = target_user_id
    for update;
  else
    select parent.child_order_version
    into current_source_version
    from public.collections as parent
    where parent.user_id = target_user_id and parent.id = source_parent_id
    for update;
  end if;

  if target_parent_id is not distinct from source_parent_id then
    current_destination_version := current_source_version;
  elsif target_parent_id is null then
    select preference.root_collection_order_version
    into current_destination_version
    from public.dashboard_preferences as preference
    where preference.user_id = target_user_id
    for update;
  else
    select parent.child_order_version
    into current_destination_version
    from public.collections as parent
    where parent.user_id = target_user_id and parent.id = target_parent_id
    for update;
  end if;

  if current_source_version is distinct from expected_source_version
    or current_destination_version is distinct from expected_destination_version
  then
    raise exception using errcode = '40001', message = 'Collection order changed.';
  end if;

  update public.collections
  set parent_id = target_parent_id, sort_order = target_sort_order
  where user_id = target_user_id and id = target_collection_id;

  if source_parent_id is null then
    update public.dashboard_preferences
    set root_collection_order_version = root_collection_order_version + 1
    where user_id = target_user_id;
  else
    update public.collections
    set child_order_version = child_order_version + 1
    where user_id = target_user_id and id = source_parent_id;
  end if;

  if target_parent_id is distinct from source_parent_id then
    if target_parent_id is null then
      update public.dashboard_preferences
      set root_collection_order_version = root_collection_order_version + 1
      where user_id = target_user_id;
    else
      update public.collections
      set child_order_version = child_order_version + 1
      where user_id = target_user_id and id = target_parent_id;
    end if;
  end if;

  if source_parent_id is null then
    select root_collection_order_version
    into source_version
    from public.dashboard_preferences
    where user_id = target_user_id;
  else
    select child_order_version
    into source_version
    from public.collections
    where user_id = target_user_id and id = source_parent_id;
  end if;

  if target_parent_id is not distinct from source_parent_id then
    destination_version := source_version;
  elsif target_parent_id is null then
    select root_collection_order_version
    into destination_version
    from public.dashboard_preferences
    where user_id = target_user_id;
  else
    select child_order_version
    into destination_version
    from public.collections
    where user_id = target_user_id and id = target_parent_id;
  end if;

  perform private.send_library_resync(target_user_id);
  return next;
end;
$$;

create or replace function public.reorder_collection(
  collection_id bigint,
  parent_id bigint,
  sort_order text,
  expected_source_version bigint,
  expected_destination_version bigint
)
returns table (source_version bigint, destination_version bigint)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.reorder_collection(
    (select auth.uid()),
    collection_id,
    parent_id,
    sort_order,
    expected_source_version,
    expected_destination_version
  );
$$;

create or replace function private.reorder_tag(
  target_user_id uuid,
  target_tag_id bigint,
  target_sort_order text,
  expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  select preference.tag_order_version
  into current_version
  from public.dashboard_preferences as preference
  where preference.user_id = target_user_id
  for update;

  if current_version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Tag order changed.';
  end if;

  update public.tags
  set sort_order = target_sort_order
  where user_id = target_user_id and id = target_tag_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tag not found.';
  end if;

  update public.dashboard_preferences
  set tag_order_version = tag_order_version + 1
  where user_id = target_user_id
  returning tag_order_version into current_version;

  perform private.send_library_resync(target_user_id);
  return current_version;
end;
$$;

create or replace function public.reorder_tag(
  tag_id bigint,
  sort_order text,
  expected_version bigint
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reorder_tag(
    (select auth.uid()),
    tag_id,
    sort_order,
    expected_version
  );
$$;

create or replace function private.reorder_bookmark(
  target_user_id uuid,
  target_collection_id bigint,
  target_bookmark_id bigint,
  target_sort_order text,
  previous_bookmark_id bigint,
  next_bookmark_id bigint,
  expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  previous_order text;
  next_order text;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  select collection.bookmark_order_version
  into current_version
  from public.collections as collection
  where collection.user_id = target_user_id
    and collection.id = target_collection_id
  for update;

  if current_version is null then
    raise exception using errcode = 'P0002', message = 'Collection not found.';
  end if;
  if current_version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Bookmark order changed.';
  end if;

  perform membership.bookmark_id
  from public.bookmark_collections as membership
  where membership.user_id = target_user_id
    and membership.collection_id = target_collection_id
    and membership.bookmark_id in (
      target_bookmark_id,
      previous_bookmark_id,
      next_bookmark_id
    )
  order by membership.bookmark_id
  for update;

  perform 1
  from public.bookmark_collections
  where user_id = target_user_id
    and collection_id = target_collection_id
    and bookmark_id = target_bookmark_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Bookmark membership not found.';
  end if;

  if previous_bookmark_id is not null then
    select sort_order
    into previous_order
    from public.bookmark_collections
    where user_id = target_user_id
      and collection_id = target_collection_id
      and bookmark_id = previous_bookmark_id;

    if previous_order is null then
      raise exception using errcode = 'P0002', message = 'Previous bookmark not found.';
    end if;
  end if;

  if next_bookmark_id is not null then
    select sort_order
    into next_order
    from public.bookmark_collections
    where user_id = target_user_id
      and collection_id = target_collection_id
      and bookmark_id = next_bookmark_id;

    if next_order is null then
      raise exception using errcode = 'P0002', message = 'Next bookmark not found.';
    end if;
  end if;

  if previous_order is not null
    and previous_order collate "C" >= target_sort_order collate "C"
  then
    raise exception using errcode = '22023', message = 'Order key is before its previous neighbor.';
  end if;
  if next_order is not null
    and target_sort_order collate "C" >= next_order collate "C"
  then
    raise exception using errcode = '22023', message = 'Order key is after its next neighbor.';
  end if;

  update public.bookmark_collections
  set sort_order = target_sort_order
  where user_id = target_user_id
    and collection_id = target_collection_id
    and bookmark_id = target_bookmark_id;

  update public.collections
  set bookmark_order_version = bookmark_order_version + 1
  where user_id = target_user_id and id = target_collection_id
  returning bookmark_order_version into current_version;

  perform private.send_library_resync(target_user_id);
  return current_version;
end;
$$;

create or replace function public.reorder_bookmark(
  collection_id bigint,
  bookmark_id bigint,
  sort_order text,
  previous_bookmark_id bigint,
  next_bookmark_id bigint,
  expected_version bigint
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reorder_bookmark(
    (select auth.uid()),
    collection_id,
    bookmark_id,
    sort_order,
    previous_bookmark_id,
    next_bookmark_id,
    expected_version
  );
$$;

create or replace function private.record_bookmark_visits(
  target_user_id uuid,
  target_event_ids uuid[],
  target_bookmark_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  owned_bookmark_count integer;
begin
  if target_user_id is null
    or target_user_id is distinct from (select auth.uid())
    or not private.account_accepts_writes(target_user_id)
  then
    raise exception using errcode = '42501', message = 'Not authorized.';
  end if;

  if target_event_ids is null
    or target_bookmark_ids is null
    or cardinality(target_event_ids) = 0
    or cardinality(target_event_ids) <> cardinality(target_bookmark_ids)
  then
    raise exception using
      errcode = '22023',
      message = 'Visit event and bookmark arrays must be non-empty and aligned.';
  end if;

  select count(distinct bookmark.id)::integer
  into owned_bookmark_count
  from public.bookmarks as bookmark
  where bookmark.user_id = target_user_id
    and bookmark.id = any(target_bookmark_ids)
    and bookmark.trashed_at is null;

  if owned_bookmark_count is distinct from (
    select count(distinct bookmark_id)::integer
    from unnest(target_bookmark_ids) as selected(bookmark_id)
  ) then
    raise exception using errcode = 'P0002', message = 'Bookmark set changed.';
  end if;

  insert into public.bookmark_events (event_id, user_id, bookmark_id)
  select input.event_id, target_user_id, input.bookmark_id
  from unnest(target_event_ids, target_bookmark_ids)
    as input(event_id, bookmark_id)
  on conflict (user_id, event_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.record_bookmark_visits(
  event_ids uuid[],
  bookmark_ids bigint[]
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.record_bookmark_visits(
    (select auth.uid()),
    event_ids,
    bookmark_ids
  );
$$;

create or replace function private.claim_enrichment_requests(
  target_queue_name text,
  batch_size integer,
  lease_seconds integer
)
returns table (
  request_id uuid,
  user_id uuid,
  bookmark_id bigint,
  generation bigint,
  lease_token uuid,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_queue_name not in ('interactive', 'bulk')
    or batch_size not between 1 and 100
    or lease_seconds not between 1 and 900
  then
    raise exception using errcode = '22023', message = 'Invalid claim bounds.';
  end if;

  return query
  with candidates as (
    select request.id
    from private.enrichment_requests as request
    where request.queue_name = target_queue_name
      and request.state = 'queued'
      and request.next_attempt_at <= now()
      and request.attempt_count < request.max_attempts
    order by request.next_attempt_at, request.created_at, request.id
    limit batch_size
    for update skip locked
  )
  update private.enrichment_requests as request
  set state = 'running',
    lease_token = gen_random_uuid(),
    lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds)
  from candidates
  where request.id = candidates.id
  returning
    request.id,
    request.user_id,
    request.bookmark_id,
    request.generation,
    request.lease_token,
    request.attempt_count,
    request.max_attempts;
end;
$$;

create or replace function private.start_enrichment_attempt(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.enrichment_requests
  set attempt_count = attempt_count + 1
  where id = target_request_id
    and generation = target_generation
    and lease_token = target_lease_token
    and state = 'running'
    and lease_expires_at > clock_timestamp()
    and attempt_count < max_attempts;

  return found;
end;
$$;

create or replace function private.finish_enrichment_request(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  succeeded boolean,
  result_title text default null,
  result_favicon_url text default null,
  result_og_image_url text default null,
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
  claimed_request private.enrichment_requests;
  bookmark_generation bigint;
  terminal_time timestamptz;
begin
  select request.*
  into claimed_request
  from private.enrichment_requests as request
  where request.id = target_request_id
    and request.generation = target_generation
    and request.lease_token = target_lease_token
    and request.state = 'running'
  for update;

  if not found then
    return false;
  end if;

  select bookmark.metadata_generation
  into bookmark_generation
  from public.bookmarks as bookmark
  where bookmark.user_id = claimed_request.user_id
    and bookmark.id = claimed_request.bookmark_id
  for update;

  if bookmark_generation is null
    or bookmark_generation is distinct from target_generation
  then
    terminal_time := now();
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
    if result_title is null or char_length(btrim(result_title)) = 0 then
      raise exception using errcode = '22023', message = 'A title is required.';
    end if;

    update public.bookmarks
    set title = regexp_replace(btrim(result_title), '[[:space:]]+', ' ', 'g'),
      favicon_url = result_favicon_url,
      og_image_url = result_og_image_url,
      metadata_status = 'enriched'
    where user_id = claimed_request.user_id
      and id = claimed_request.bookmark_id;

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

create or replace function private.claim_transfer_jobs(
  target_kind text,
  batch_size integer,
  lease_seconds integer
)
returns table (
  job_id uuid,
  user_id uuid,
  kind text,
  lease_token uuid,
  attempt_count integer,
  max_attempts integer,
  row_version bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_kind not in ('import', 'export', 'restore')
    or batch_size not between 1 and 50
    or lease_seconds not between 1 and 3600
  then
    raise exception using errcode = '22023', message = 'Invalid claim bounds.';
  end if;

  return query
  with candidates as (
    select job.id
    from private.transfer_jobs as job
    where job.kind = target_kind
      and job.state = 'queued'
      and coalesce(job.next_attempt_at, job.created_at) <= now()
      and job.attempt_count < job.max_attempts
    order by coalesce(job.next_attempt_at, job.created_at), job.id
    limit batch_size
    for update skip locked
  )
  update private.transfer_jobs as job
  set state = 'running',
    attempt_count = job.attempt_count + 1,
    lease_token = gen_random_uuid(),
    lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds)
  from candidates
  where job.id = candidates.id
  returning
    job.id,
    job.user_id,
    job.kind,
    job.lease_token,
    job.attempt_count,
    job.max_attempts,
    job.row_version;
end;
$$;

create or replace function private.finish_transfer_job(
  target_job_id uuid,
  target_lease_token uuid,
  target_state text,
  target_processed_count bigint,
  target_succeeded_count bigint,
  target_failed_count bigint,
  target_public_error_code text default null,
  target_internal_error text default null,
  target_retry_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  terminal_time timestamptz;
begin
  if target_state not in ('queued', 'completed', 'completed_with_failures', 'failed') then
    raise exception using errcode = '22023', message = 'Invalid result state.';
  end if;

  terminal_time := case when target_state = 'queued' then null else now() end;

  update private.transfer_jobs
  set state = target_state,
    lease_token = null,
    lease_expires_at = null,
    next_attempt_at = target_retry_at,
    processed_count = target_processed_count,
    succeeded_count = target_succeeded_count,
    failed_count = target_failed_count,
    public_error_code = target_public_error_code,
    internal_error = target_internal_error,
    terminal_at = terminal_time,
    expires_at = case
      when target_state = 'queued' then null
      else terminal_time + interval '30 days'
    end
  where id = target_job_id
    and lease_token = target_lease_token
    and state = 'running';

  return found;
end;
$$;

create or replace function private.purge_expired_bookmarks(
  batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user_id uuid;
  affected_user_ids uuid[];
  deleted_count integer;
  previous_broadcast_setting text;
begin
  if batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid cleanup batch size.';
  end if;

  previous_broadcast_setting := current_setting('reway.suppress_broadcast', true);
  perform set_config('reway.suppress_broadcast', 'on', true);

  with candidates as (
    select bookmark.id
    from public.bookmarks as bookmark
    where bookmark.purge_after <= now()
    order by bookmark.purge_after, bookmark.id
    limit batch_size
    for update skip locked
  ),
  deleted as (
    delete from public.bookmarks as bookmark
    using candidates
    where bookmark.id = candidates.id
    returning bookmark.user_id
  )
  select count(*)::integer, array_agg(distinct deleted.user_id)
  into deleted_count, affected_user_ids
  from deleted;

  for affected_user_id in
    select unnest(affected_user_ids)
  loop
    perform private.send_library_resync(affected_user_id);
  end loop;

  perform set_config(
    'reway.suppress_broadcast',
    coalesce(previous_broadcast_setting, ''),
    true
  );
  return deleted_count;
end;
$$;

create or replace function private.purge_expired_bookmark_events(
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
    select event.id
    from public.bookmark_events as event
    where event.created_at <= now() - interval '30 days'
    order by event.created_at, event.id
    limit batch_size
    for update skip locked
  )
  delete from public.bookmark_events as event
  using candidates
  where event.id = candidates.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.dashboard_preferences enable row level security;
alter table public.dashboard_preferences force row level security;
alter table public.bookmarks enable row level security;
alter table public.bookmarks force row level security;
alter table public.collections enable row level security;
alter table public.collections force row level security;
alter table public.tags enable row level security;
alter table public.tags force row level security;
alter table public.bookmark_collections enable row level security;
alter table public.bookmark_collections force row level security;
alter table public.bookmark_tags enable row level security;
alter table public.bookmark_tags force row level security;
alter table public.bookmark_events enable row level security;
alter table public.bookmark_events force row level security;
alter table public.bookmark_stats enable row level security;
alter table public.bookmark_stats force row level security;

alter table private.bookmark_search enable row level security;
alter table private.bookmark_search force row level security;
alter table private.enrichment_requests enable row level security;
alter table private.enrichment_requests force row level security;
alter table private.transfer_jobs enable row level security;
alter table private.transfer_jobs force row level security;
alter table private.stored_files enable row level security;
alter table private.stored_files force row level security;
alter table private.import_job_details enable row level security;
alter table private.import_job_details force row level security;
alter table private.export_job_details enable row level security;
alter table private.export_job_details force row level security;
alter table private.restore_job_details enable row level security;
alter table private.restore_job_details force row level security;
alter table private.restore_snapshots enable row level security;
alter table private.restore_snapshots force row level security;
alter table private.import_stage_collections enable row level security;
alter table private.import_stage_collections force row level security;
alter table private.import_stage_tags enable row level security;
alter table private.import_stage_tags force row level security;
alter table private.import_stage_bookmarks enable row level security;
alter table private.import_stage_bookmarks force row level security;
alter table private.import_stage_bookmark_collections enable row level security;
alter table private.import_stage_bookmark_collections force row level security;
alter table private.import_stage_bookmark_tags enable row level security;
alter table private.import_stage_bookmark_tags force row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_update_own_active
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id and account_state = 'active'
)
with check (
  (select auth.uid()) = user_id and account_state = 'active'
);

create policy dashboard_preferences_select_own
on public.dashboard_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy dashboard_preferences_update_own_active
on public.dashboard_preferences
for update
to authenticated
using ((select private.account_accepts_writes(user_id)))
with check ((select private.account_accepts_writes(user_id)));

create policy bookmarks_select_own
on public.bookmarks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy bookmarks_update_own_active
on public.bookmarks
for update
to authenticated
using ((select private.account_accepts_writes(user_id)))
with check ((select private.account_accepts_writes(user_id)));

create policy collections_select_own
on public.collections
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy collections_insert_own_active
on public.collections
for insert
to authenticated
with check ((select private.account_accepts_writes(user_id)));

create policy collections_update_own_active
on public.collections
for update
to authenticated
using ((select private.account_accepts_writes(user_id)))
with check ((select private.account_accepts_writes(user_id)));

create policy tags_select_own
on public.tags
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy tags_insert_own_active
on public.tags
for insert
to authenticated
with check ((select private.account_accepts_writes(user_id)));

create policy tags_update_own_active
on public.tags
for update
to authenticated
using ((select private.account_accepts_writes(user_id)))
with check ((select private.account_accepts_writes(user_id)));

create policy bookmark_collections_select_own
on public.bookmark_collections
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy bookmark_collections_insert_own_active
on public.bookmark_collections
for insert
to authenticated
with check ((select private.account_accepts_writes(user_id)));

create policy bookmark_collections_delete_own_active
on public.bookmark_collections
for delete
to authenticated
using ((select private.account_accepts_writes(user_id)));

create policy bookmark_tags_select_own
on public.bookmark_tags
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy bookmark_tags_insert_own_active
on public.bookmark_tags
for insert
to authenticated
with check ((select private.account_accepts_writes(user_id)));

create policy bookmark_tags_delete_own_active
on public.bookmark_tags
for delete
to authenticated
using ((select private.account_accepts_writes(user_id)));

create policy bookmark_events_insert_own_active
on public.bookmark_events
for insert
to authenticated
with check ((select private.account_accepts_writes(user_id)));

create policy bookmark_stats_select_own
on public.bookmark_stats
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy realtime_library_broadcast_select
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) = 'library:' || (select auth.uid())::text
);

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.dashboard_preferences from public, anon, authenticated;
revoke all on table public.bookmarks from public, anon, authenticated;
revoke all on table public.collections from public, anon, authenticated;
revoke all on table public.tags from public, anon, authenticated;
revoke all on table public.bookmark_collections from public, anon, authenticated;
revoke all on table public.bookmark_tags from public, anon, authenticated;
revoke all on table public.bookmark_events from public, anon, authenticated;
revoke all on table public.bookmark_stats from public, anon, authenticated;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;

grant select on table public.profiles to authenticated;
grant update (
  username,
  avatar_source,
  google_avatar_url,
  custom_avatar_path,
  onboarding_completed_at
) on table public.profiles to authenticated;

grant select on table public.dashboard_preferences to authenticated;
grant update (
  theme,
  view_mode,
  bookmark_sort,
  collection_order_mode,
  tag_order_mode,
  desktop_collections_open,
  desktop_tags_open,
  mobile_collections_open,
  mobile_tags_open
) on table public.dashboard_preferences to authenticated;

grant select on table public.bookmarks to authenticated;
grant update (url, title) on table public.bookmarks to authenticated;

grant select on table public.collections to authenticated;
grant insert (user_id, parent_id, name, icon, color, sort_order)
  on table public.collections to authenticated;
grant update (name, icon, color) on table public.collections to authenticated;

grant select on table public.tags to authenticated;
grant insert (user_id, name, color, sort_order)
  on table public.tags to authenticated;
grant update (name, color) on table public.tags to authenticated;

grant select, insert, delete on table public.bookmark_collections to authenticated;
grant select, insert, delete on table public.bookmark_tags to authenticated;
grant select on table public.bookmark_stats to authenticated;

grant usage on sequence public.collections_id_seq to authenticated;
grant usage on sequence public.tags_id_seq to authenticated;
grant usage on sequence public.bookmark_events_id_seq to authenticated;

grant execute on function private.account_accepts_writes(uuid) to authenticated;
grant execute on function private.read_transfer_job_status(uuid) to authenticated;
revoke all on function public.get_transfer_job_status(uuid) from public, anon;
grant execute on function public.get_transfer_job_status(uuid) to authenticated;

revoke all on function private.set_updated_row() from public, anon, authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.enforce_collection_hierarchy()
  from public, anon, authenticated;
revoke all on function private.validate_transfer_job_detail()
  from public, anon, authenticated;
revoke all on function private.create_bookmark_stats_rows()
  from public, anon, authenticated;
revoke all on function private.increment_bookmark_visit_counts()
  from public, anon, authenticated;
revoke all on function private.increment_bookmark_collection_counts()
  from public, anon, authenticated;
revoke all on function private.decrement_bookmark_collection_counts()
  from public, anon, authenticated;
revoke all on function private.refresh_bookmark_search(bigint[])
  from public, anon, authenticated;
revoke all on function private.refresh_search_after_bookmark_insert()
  from public, anon, authenticated;
revoke all on function private.refresh_search_after_bookmark_update()
  from public, anon, authenticated;
revoke all on function private.refresh_search_after_bookmark_tag_insert()
  from public, anon, authenticated;
revoke all on function private.refresh_search_after_bookmark_tag_delete()
  from public, anon, authenticated;
revoke all on function private.refresh_search_after_tag_update()
  from public, anon, authenticated;
revoke all on function private.broadcast_bookmark_change()
  from public, anon, authenticated;

grant execute on function private.create_bookmark(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz
) to authenticated;
grant execute on function private.request_bookmark_reenrichment(
  uuid,
  bigint,
  uuid
) to authenticated;
grant execute on function private.lock_owned_bookmarks(uuid, bigint[], text)
  to authenticated;
grant execute on function private.trash_bookmarks(uuid, bigint[])
  to authenticated;
grant execute on function private.restore_bookmarks(uuid, bigint[])
  to authenticated;
grant execute on function private.delete_bookmarks_forever(uuid, bigint[])
  to authenticated;
grant execute on function private.apply_collection_membership_bulk(
  uuid,
  text,
  bigint[],
  bigint,
  text[]
) to authenticated;
grant execute on function private.delete_collection(uuid, bigint)
  to authenticated;
grant execute on function private.delete_tag(uuid, bigint) to authenticated;
grant execute on function private.reorder_collection(
  uuid,
  bigint,
  bigint,
  text,
  bigint,
  bigint
) to authenticated;
grant execute on function private.reorder_tag(uuid, bigint, text, bigint)
  to authenticated;
grant execute on function private.reorder_bookmark(
  uuid,
  bigint,
  bigint,
  text,
  bigint,
  bigint,
  bigint
) to authenticated;
grant execute on function private.record_bookmark_visits(uuid, uuid[], bigint[])
  to authenticated;

revoke all on function public.create_bookmark(
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon;
revoke all on function public.request_bookmark_reenrichment(bigint, uuid)
  from public, anon;
revoke all on function public.trash_bookmarks(bigint[]) from public, anon;
revoke all on function public.restore_bookmarks(bigint[]) from public, anon;
revoke all on function public.delete_bookmarks_forever(bigint[])
  from public, anon;
revoke all on function public.add_bookmarks_to_collection(
  bigint[],
  bigint,
  text[]
) from public, anon;
revoke all on function public.move_bookmarks_to_collection(
  bigint[],
  bigint,
  text[]
) from public, anon;
revoke all on function public.remove_bookmarks_from_collection(bigint[], bigint)
  from public, anon;
revoke all on function public.delete_collection(bigint) from public, anon;
revoke all on function public.delete_tag(bigint) from public, anon;
revoke all on function public.reorder_collection(
  bigint,
  bigint,
  text,
  bigint,
  bigint
) from public, anon;
revoke all on function public.reorder_tag(bigint, text, bigint)
  from public, anon;
revoke all on function public.reorder_bookmark(
  bigint,
  bigint,
  text,
  bigint,
  bigint,
  bigint
) from public, anon;
revoke all on function public.record_bookmark_visits(uuid[], bigint[])
  from public, anon;

grant execute on function public.create_bookmark(
  uuid,
  text,
  text,
  text,
  timestamptz
) to authenticated;
grant execute on function public.request_bookmark_reenrichment(bigint, uuid)
  to authenticated;
grant execute on function public.trash_bookmarks(bigint[]) to authenticated;
grant execute on function public.restore_bookmarks(bigint[]) to authenticated;
grant execute on function public.delete_bookmarks_forever(bigint[])
  to authenticated;
grant execute on function public.add_bookmarks_to_collection(
  bigint[],
  bigint,
  text[]
) to authenticated;
grant execute on function public.move_bookmarks_to_collection(
  bigint[],
  bigint,
  text[]
) to authenticated;
grant execute on function public.remove_bookmarks_from_collection(bigint[], bigint)
  to authenticated;
grant execute on function public.delete_collection(bigint) to authenticated;
grant execute on function public.delete_tag(bigint) to authenticated;
grant execute on function public.reorder_collection(
  bigint,
  bigint,
  text,
  bigint,
  bigint
) to authenticated;
grant execute on function public.reorder_tag(bigint, text, bigint)
  to authenticated;
grant execute on function public.reorder_bookmark(
  bigint,
  bigint,
  text,
  bigint,
  bigint,
  bigint
) to authenticated;
grant execute on function public.record_bookmark_visits(uuid[], bigint[])
  to authenticated;

grant usage on schema private to service_role;
grant execute on function private.claim_enrichment_requests(text, integer, integer)
  to service_role;
grant execute on function private.start_enrichment_attempt(uuid, bigint, uuid)
  to service_role;
grant execute on function private.finish_enrichment_request(
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
) to service_role;
grant execute on function private.claim_transfer_jobs(text, integer, integer)
  to service_role;
grant execute on function private.finish_transfer_job(
  uuid,
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  text,
  text,
  timestamptz
) to service_role;
grant execute on function private.purge_expired_bookmarks(integer)
  to service_role;
grant execute on function private.purge_expired_bookmark_events(integer)
  to service_role;
