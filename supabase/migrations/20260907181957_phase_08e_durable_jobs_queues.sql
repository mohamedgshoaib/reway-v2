create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select pgmq.create('reway_enrichment_interactive');
select pgmq.create('reway_enrichment_bulk');
select pgmq.create('reway_transfer_mutating');
select pgmq.create('reway_transfer_export');

alter table private.enrichment_requests
add column queue_message_id bigint,
add column heartbeat_at timestamptz;

alter table private.transfer_jobs
add column queue_message_id bigint,
add column heartbeat_at timestamptz;

create unique index enrichment_requests_queue_message_idx
  on private.enrichment_requests (queue_name, queue_message_id)
  where queue_message_id is not null;

create unique index transfer_jobs_queue_message_idx
  on private.transfer_jobs (kind, queue_message_id)
  where queue_message_id is not null;

create index enrichment_requests_state_idx
  on private.enrichment_requests (state, id);

create index transfer_jobs_state_idx
  on private.transfer_jobs (state, id);

create table private.worker_queue_incidents (
  id bigint generated always as identity primary key,
  queue_name text not null,
  message_id bigint not null,
  delivery_count integer not null,
  reason_code text not null,
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  constraint worker_queue_incidents_message_key unique (queue_name, message_id),
  constraint worker_queue_incidents_delivery_count_check check (
    delivery_count > 0
  ),
  constraint worker_queue_incidents_reason_check check (
    reason_code in (
      'invalid_identifier',
      'malformed_envelope',
      'missing_request',
      'stale_message',
      'unknown_work_kind',
      'unsupported_payload_version'
    )
  )
);

create index worker_queue_incidents_expiry_idx
  on private.worker_queue_incidents (expires_at, id);

create table private.durable_repair_runs (
  id bigint generated always as identity primary key,
  expired_requeued integer not null default 0,
  exhausted_failed integer not null default 0,
  missing_messages_replaced integer not null default 0,
  terminal_messages_deleted integer not null default 0,
  incidents_deleted integer not null default 0,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  expires_at timestamptz not null,
  constraint durable_repair_runs_counts_check check (
    expired_requeued >= 0
    and exhausted_failed >= 0
    and missing_messages_replaced >= 0
    and terminal_messages_deleted >= 0
    and incidents_deleted >= 0
  ),
  constraint durable_repair_runs_time_check check (
    completed_at >= started_at and expires_at > completed_at
  )
);

create index durable_repair_runs_expiry_idx
  on private.durable_repair_runs (expires_at, id);

alter table private.worker_queue_incidents enable row level security;
alter table private.worker_queue_incidents force row level security;
alter table private.durable_repair_runs enable row level security;
alter table private.durable_repair_runs force row level security;

create or replace function private.is_worker_queue_name(target_queue_name text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select target_queue_name in (
    'reway_enrichment_interactive',
    'reway_enrichment_bulk',
    'reway_transfer_mutating',
    'reway_transfer_export'
  );
$$;

create or replace function private.enrichment_queue_name(
  target_logical_queue_name text
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case target_logical_queue_name
    when 'interactive' then 'reway_enrichment_interactive'
    when 'bulk' then 'reway_enrichment_bulk'
    else null
  end;
$$;

create or replace function private.transfer_queue_name(target_kind text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case target_kind
    when 'import' then 'reway_transfer_mutating'
    when 'restore' then 'reway_transfer_mutating'
    when 'export' then 'reway_transfer_export'
    else null
  end;
$$;

create or replace function private.queue_message_exists(
  target_queue_name text,
  target_message_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_exists boolean;
begin
  if not private.is_worker_queue_name(target_queue_name)
    or target_message_id is null
  then
    return false;
  end if;

  execute format(
    'select exists (select 1 from pgmq.%I where msg_id = $1)',
    'q_' || target_queue_name
  )
  into message_exists
  using target_message_id;

  return coalesce(message_exists, false);
exception
  when undefined_table then
    return false;
end;
$$;

create or replace function private.send_enrichment_message(
  target_request_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row private.enrichment_requests;
  physical_queue_name text;
  sent_message_id bigint;
begin
  select request.*
  into strict request_row
  from private.enrichment_requests as request
  where request.id = target_request_id
  for update;

  if request_row.state <> 'queued' then
    raise exception using
      errcode = '55000',
      message = 'Only queued enrichment requests may be sent.';
  end if;

  if request_row.queue_message_id is not null then
    return request_row.queue_message_id;
  end if;

  physical_queue_name := private.enrichment_queue_name(request_row.queue_name);
  if physical_queue_name is null then
    raise exception using errcode = '22023', message = 'Invalid queue.';
  end if;

  select pgmq.send(
    physical_queue_name,
    jsonb_build_object(
      'version', 1,
      'work_kind', 'enrichment',
      'request_id', request_row.id,
      'generation', request_row.generation::text
    ),
    greatest(
      0,
      ceil(extract(epoch from request_row.next_attempt_at - clock_timestamp()))
    )::integer
  )
  into sent_message_id;

  update private.enrichment_requests
  set queue_message_id = sent_message_id
  where id = request_row.id;

  return sent_message_id;
end;
$$;

create or replace function private.send_transfer_message(target_job_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row private.transfer_jobs;
  physical_queue_name text;
  sent_message_id bigint;
begin
  select job.*
  into strict job_row
  from private.transfer_jobs as job
  where job.id = target_job_id
  for update;

  if job_row.state <> 'queued' then
    raise exception using
      errcode = '55000',
      message = 'Only queued transfer jobs may be sent.';
  end if;

  if job_row.queue_message_id is not null then
    return job_row.queue_message_id;
  end if;

  physical_queue_name := private.transfer_queue_name(job_row.kind);
  if physical_queue_name is null then
    raise exception using errcode = '22023', message = 'Invalid queue.';
  end if;

  select pgmq.send(
    physical_queue_name,
    jsonb_build_object(
      'version', 1,
      'work_kind', job_row.kind,
      'job_id', job_row.id
    ),
    greatest(
      0,
      ceil(
        extract(
          epoch from coalesce(job_row.next_attempt_at, clock_timestamp())
            - clock_timestamp()
        )
      )
    )::integer
  )
  into sent_message_id;

  update private.transfer_jobs
  set queue_message_id = sent_message_id
  where id = job_row.id;

  return sent_message_id;
end;
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
  request_id uuid;
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

    select request.id
    into request_id
    from private.enrichment_requests as request
    where request.user_id = target_user_id
      and request.bookmark_id = created_bookmark.id
      and request.generation = created_bookmark.metadata_generation
      and request.state = 'queued';

    if request_id is not null then
      perform private.send_enrichment_message(request_id);
    end if;

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
  )
  returning id into request_id;

  perform private.send_enrichment_message(request_id);

  return created_bookmark;
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

create or replace function private.worker_read_queue(
  target_queue_name text,
  visibility_seconds integer,
  batch_size integer
)
returns table (
  message_id bigint,
  delivery_count integer,
  enqueued_at timestamptz,
  visible_at timestamptz,
  envelope jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_worker_queue_name(target_queue_name)
    or visibility_seconds not between 2 and 900
    or batch_size not between 1 and 100
  then
    raise exception using errcode = '22023', message = 'Invalid queue read.';
  end if;

  return query
  select
    message.msg_id,
    message.read_ct,
    message.enqueued_at,
    message.vt,
    message.message
  from pgmq.read(target_queue_name, visibility_seconds, batch_size) as message;
end;
$$;

create or replace function private.worker_claim_enrichment_message(
  target_queue_name text,
  target_message_id bigint,
  target_request_id uuid,
  target_generation bigint,
  lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row private.enrichment_requests;
  new_lease_token uuid;
begin
  if not private.is_worker_queue_name(target_queue_name)
    or target_queue_name not in (
      'reway_enrichment_interactive',
      'reway_enrichment_bulk'
    )
    or target_message_id is null
    or target_request_id is null
    or target_generation is null
    or lease_seconds not between 1 and 600
  then
    raise exception using errcode = '22023', message = 'Invalid claim.';
  end if;

  select request.*
  into request_row
  from private.enrichment_requests as request
  where request.id = target_request_id
  for update;

  if request_row.id is null then
    return jsonb_build_object('status', 'missing');
  end if;

  if private.enrichment_queue_name(request_row.queue_name) <> target_queue_name
    or request_row.queue_message_id is distinct from target_message_id
    or request_row.generation is distinct from target_generation
  then
    return jsonb_build_object('status', 'stale_message');
  end if;

  if request_row.state in ('completed', 'failed', 'cancelled') then
    return jsonb_build_object('status', 'terminal');
  end if;

  if request_row.state <> 'queued' then
    return jsonb_build_object('status', 'busy');
  end if;

  if request_row.next_attempt_at > clock_timestamp() then
    return jsonb_build_object('status', 'not_due');
  end if;

  if request_row.attempt_count >= request_row.max_attempts then
    return jsonb_build_object('status', 'exhausted');
  end if;

  new_lease_token := gen_random_uuid();

  update private.enrichment_requests
  set state = 'running',
    lease_token = new_lease_token,
    lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds),
    heartbeat_at = clock_timestamp()
  where id = request_row.id;

  return jsonb_build_object(
    'status', 'claimed',
    'lease_token', new_lease_token,
    'attempt_count', request_row.attempt_count,
    'max_attempts', request_row.max_attempts
  );
end;
$$;

create or replace function private.worker_claim_transfer_message(
  target_queue_name text,
  target_message_id bigint,
  target_job_id uuid,
  target_work_kind text,
  lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row private.transfer_jobs;
  new_lease_token uuid;
begin
  if not private.is_worker_queue_name(target_queue_name)
    or target_queue_name not in (
      'reway_transfer_mutating',
      'reway_transfer_export'
    )
    or target_message_id is null
    or target_job_id is null
    or target_work_kind not in ('import', 'restore', 'export')
    or lease_seconds not between 1 and 600
  then
    raise exception using errcode = '22023', message = 'Invalid claim.';
  end if;

  select job.*
  into job_row
  from private.transfer_jobs as job
  where job.id = target_job_id
  for update;

  if job_row.id is null then
    return jsonb_build_object('status', 'missing');
  end if;

  if job_row.kind <> target_work_kind
    or private.transfer_queue_name(job_row.kind) <> target_queue_name
    or job_row.queue_message_id is distinct from target_message_id
  then
    return jsonb_build_object('status', 'stale_message');
  end if;

  if job_row.state in (
    'completed',
    'completed_with_failures',
    'failed',
    'cancelled'
  ) then
    return jsonb_build_object('status', 'terminal');
  end if;

  if job_row.state <> 'queued' then
    return jsonb_build_object('status', 'busy');
  end if;

  if coalesce(job_row.next_attempt_at, job_row.created_at) > clock_timestamp() then
    return jsonb_build_object('status', 'not_due');
  end if;

  if job_row.attempt_count >= job_row.max_attempts then
    return jsonb_build_object('status', 'exhausted');
  end if;

  new_lease_token := gen_random_uuid();

  update private.transfer_jobs
  set state = 'running',
    lease_token = new_lease_token,
    lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds),
    heartbeat_at = clock_timestamp()
  where id = job_row.id;

  return jsonb_build_object(
    'status', 'claimed',
    'lease_token', new_lease_token,
    'attempt_count', job_row.attempt_count,
    'max_attempts', job_row.max_attempts,
    'row_version', job_row.row_version
  );
end;
$$;

create or replace function private.start_transfer_attempt(
  target_job_id uuid,
  target_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.transfer_jobs
  set attempt_count = attempt_count + 1
  where id = target_job_id
    and lease_token = target_lease_token
    and state = 'running'
    and lease_expires_at > clock_timestamp()
    and attempt_count < max_attempts;

  return found;
end;
$$;

create or replace function private.worker_start_enrichment_attempt(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.start_enrichment_attempt(
    target_request_id,
    target_generation,
    target_lease_token
  );
$$;

create or replace function private.worker_start_transfer_attempt(
  target_job_id uuid,
  target_lease_token uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.start_transfer_attempt(target_job_id, target_lease_token);
$$;

create or replace function private.worker_renew_enrichment_lease(
  target_queue_name text,
  target_message_id bigint,
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  lease_seconds integer,
  visibility_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  visible_message_count integer;
begin
  if target_queue_name not in (
    'reway_enrichment_interactive',
    'reway_enrichment_bulk'
  )
    or lease_seconds not between 1 and 600
    or visibility_seconds not between lease_seconds + 1 and 900
  then
    raise exception using errcode = '22023', message = 'Invalid lease renewal.';
  end if;

  if not private.queue_message_exists(target_queue_name, target_message_id) then
    return false;
  end if;

  update private.enrichment_requests
  set lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds),
    heartbeat_at = clock_timestamp()
  where id = target_request_id
    and generation = target_generation
    and queue_message_id = target_message_id
    and lease_token = target_lease_token
    and state = 'running'
    and lease_expires_at > clock_timestamp();

  if not found then
    return false;
  end if;

  select count(*)::integer
  into visible_message_count
  from pgmq.set_vt(target_queue_name, target_message_id, visibility_seconds);

  if visible_message_count <> 1 then
    raise exception using errcode = '55000', message = 'Queue message missing.';
  end if;

  return true;
end;
$$;

create or replace function private.worker_renew_transfer_lease(
  target_queue_name text,
  target_message_id bigint,
  target_job_id uuid,
  target_lease_token uuid,
  lease_seconds integer,
  visibility_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  visible_message_count integer;
begin
  if target_queue_name not in (
    'reway_transfer_mutating',
    'reway_transfer_export'
  )
    or lease_seconds not between 1 and 600
    or visibility_seconds not between lease_seconds + 1 and 900
  then
    raise exception using errcode = '22023', message = 'Invalid lease renewal.';
  end if;

  if not private.queue_message_exists(target_queue_name, target_message_id) then
    return false;
  end if;

  update private.transfer_jobs
  set lease_expires_at = clock_timestamp() + make_interval(secs => lease_seconds),
    heartbeat_at = clock_timestamp()
  where id = target_job_id
    and queue_message_id = target_message_id
    and lease_token = target_lease_token
    and state = 'running'
    and lease_expires_at > clock_timestamp();

  if not found then
    return false;
  end if;

  select count(*)::integer
  into visible_message_count
  from pgmq.set_vt(target_queue_name, target_message_id, visibility_seconds);

  if visible_message_count <> 1 then
    raise exception using errcode = '55000', message = 'Queue message missing.';
  end if;

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
  result_favicon_url text default null,
  result_og_image_url text default null,
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

  perform 1
  from private.enrichment_requests as request
  where request.id = target_request_id
    and request.generation = target_generation
    and request.queue_message_id = target_message_id
    and private.enrichment_queue_name(request.queue_name) = target_queue_name
    and request.lease_token = target_lease_token
    and request.state = 'running'
    and request.lease_expires_at > clock_timestamp()
  for update;

  if not found then
    return 'rejected';
  end if;

  select private.finish_enrichment_request(
    target_request_id,
    target_generation,
    target_lease_token,
    succeeded,
    result_title,
    result_favicon_url,
    result_og_image_url,
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
  end if;

  if not result_accepted and result_state <> 'cancelled' then
    return 'rejected';
  end if;

  return result_state;
end;
$$;

create or replace function private.worker_finish_transfer_message(
  target_queue_name text,
  target_message_id bigint,
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
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_accepted boolean;
  result_state text;
  visibility_delay integer;
begin
  if target_queue_name not in (
    'reway_transfer_mutating',
    'reway_transfer_export'
  ) then
    raise exception using errcode = '22023', message = 'Invalid queue.';
  end if;

  perform 1
  from private.transfer_jobs as job
  where job.id = target_job_id
    and job.queue_message_id = target_message_id
    and private.transfer_queue_name(job.kind) = target_queue_name
    and job.lease_token = target_lease_token
    and job.state = 'running'
    and job.lease_expires_at > clock_timestamp()
  for update;

  if not found then
    return 'rejected';
  end if;

  select private.finish_transfer_job(
    target_job_id,
    target_lease_token,
    target_state,
    target_processed_count,
    target_succeeded_count,
    target_failed_count,
    target_public_error_code,
    target_internal_error,
    target_retry_at
  )
  into result_accepted;

  select job.state
  into strict result_state
  from private.transfer_jobs as job
  where job.id = target_job_id;

  if result_state = 'queued' then
    visibility_delay := greatest(
      0,
      ceil(extract(epoch from target_retry_at - clock_timestamp()))
    )::integer;
    perform pgmq.set_vt(
      target_queue_name,
      target_message_id,
      visibility_delay
    );
  end if;

  if not result_accepted then
    return 'rejected';
  end if;

  return result_state;
end;
$$;

create or replace function private.worker_delete_terminal_message(
  target_queue_name text,
  target_message_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_message boolean;
  active_binding_exists boolean;
  terminal_binding_exists boolean;
begin
  if not private.is_worker_queue_name(target_queue_name)
    or target_message_id is null
  then
    raise exception using errcode = '22023', message = 'Invalid message.';
  end if;

  select exists (
    select 1
    from private.enrichment_requests as request
    where private.enrichment_queue_name(request.queue_name) = target_queue_name
      and request.queue_message_id = target_message_id
      and request.state not in ('completed', 'failed', 'cancelled')
    union all
    select 1
    from private.transfer_jobs as job
    where private.transfer_queue_name(job.kind) = target_queue_name
      and job.queue_message_id = target_message_id
      and job.state not in (
        'completed',
        'completed_with_failures',
        'failed',
        'cancelled'
      )
  )
  into active_binding_exists;

  if active_binding_exists then
    raise exception using errcode = '55000', message = 'Message is not terminal.';
  end if;

  select exists (
    select 1
    from private.enrichment_requests as request
    where private.enrichment_queue_name(request.queue_name) = target_queue_name
      and request.queue_message_id = target_message_id
      and request.state in ('completed', 'failed', 'cancelled')
    union all
    select 1
    from private.transfer_jobs as job
    where private.transfer_queue_name(job.kind) = target_queue_name
      and job.queue_message_id = target_message_id
      and job.state in (
        'completed',
        'completed_with_failures',
        'failed',
        'cancelled'
      )
  )
  into terminal_binding_exists;

  if not terminal_binding_exists then
    return false;
  end if;

  select pgmq.delete(target_queue_name, target_message_id)
  into deleted_message;

  update private.enrichment_requests
  set queue_message_id = null
  where queue_message_id = target_message_id
    and private.enrichment_queue_name(queue_name) = target_queue_name
    and state in ('completed', 'failed', 'cancelled');

  update private.transfer_jobs
  set queue_message_id = null
  where queue_message_id = target_message_id
    and private.transfer_queue_name(kind) = target_queue_name
    and state in (
      'completed',
      'completed_with_failures',
      'failed',
      'cancelled'
    );

  return coalesce(deleted_message, false);
end;
$$;

create or replace function private.worker_reject_poison_message(
  target_queue_name text,
  target_message_id bigint,
  target_delivery_count integer,
  target_reason_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_request record;
  deleted_message boolean;
  terminal_time timestamptz := clock_timestamp();
begin
  if not private.is_worker_queue_name(target_queue_name)
    or target_message_id is null
    or target_delivery_count <= 0
    or target_reason_code not in (
      'invalid_identifier',
      'malformed_envelope',
      'missing_request',
      'stale_message',
      'unknown_work_kind',
      'unsupported_payload_version'
    )
  then
    raise exception using errcode = '22023', message = 'Invalid incident.';
  end if;

  insert into private.worker_queue_incidents (
    queue_name,
    message_id,
    delivery_count,
    reason_code
  )
  values (
    target_queue_name,
    target_message_id,
    target_delivery_count,
    target_reason_code
  )
  on conflict (queue_name, message_id) do nothing;

  for affected_request in
    update private.enrichment_requests as request
    set state = 'failed',
      lease_token = null,
      lease_expires_at = null,
      heartbeat_at = null,
      failure_class = 'permanent',
      public_error_code = target_reason_code,
      internal_error = null,
      completed_at = terminal_time,
      expires_at = terminal_time + interval '7 days'
    where request.queue_message_id = target_message_id
      and private.enrichment_queue_name(request.queue_name) = target_queue_name
      and request.state not in ('completed', 'failed', 'cancelled')
    returning request.user_id, request.bookmark_id, request.generation
  loop
    update public.bookmarks as bookmark
    set metadata_status = 'failed'
    where bookmark.user_id = affected_request.user_id
      and bookmark.id = affected_request.bookmark_id
      and bookmark.metadata_generation = affected_request.generation;
  end loop;

  update private.transfer_jobs as job
  set state = 'failed',
    lease_token = null,
    lease_expires_at = null,
    heartbeat_at = null,
    public_error_code = target_reason_code,
    internal_error = null,
    terminal_at = terminal_time,
    expires_at = terminal_time + interval '30 days'
  where job.queue_message_id = target_message_id
    and private.transfer_queue_name(job.kind) = target_queue_name
    and job.state not in (
      'completed',
      'completed_with_failures',
      'failed',
      'cancelled'
    );

  select pgmq.delete(target_queue_name, target_message_id)
  into deleted_message;

  update private.enrichment_requests
  set queue_message_id = null
  where queue_message_id = target_message_id
    and private.enrichment_queue_name(queue_name) = target_queue_name;

  update private.transfer_jobs
  set queue_message_id = null
  where queue_message_id = target_message_id
    and private.transfer_queue_name(kind) = target_queue_name;

  return coalesce(deleted_message, false);
end;
$$;

create or replace function private.repair_durable_work(
  batch_size integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  expired_requeued_count integer := 0;
  exhausted_failed_count integer := 0;
  missing_messages_replaced_count integer := 0;
  terminal_messages_deleted_count integer := 0;
  incidents_deleted_count integer := 0;
  physical_queue_name text;
  repair_started_at timestamptz := clock_timestamp();
  terminal_time timestamptz;
begin
  if batch_size not between 1 and 500 then
    raise exception using errcode = '22023', message = 'Invalid repair bound.';
  end if;

  for candidate in
    select request.id, request.attempt_count, request.max_attempts,
      request.user_id, request.bookmark_id, request.generation
    from private.enrichment_requests as request
    where request.state = 'running'
      and request.lease_expires_at <= clock_timestamp()
    order by request.id
    limit batch_size
    for update skip locked
  loop
    if candidate.attempt_count >= candidate.max_attempts then
      terminal_time := clock_timestamp();
      update private.enrichment_requests
      set state = 'failed',
        lease_token = null,
        lease_expires_at = null,
        heartbeat_at = null,
        failure_class = 'transient',
        public_error_code = 'attempts_exhausted',
        internal_error = null,
        completed_at = terminal_time,
        expires_at = terminal_time + interval '7 days'
      where id = candidate.id;

      update public.bookmarks as bookmark
      set metadata_status = 'failed'
      where bookmark.user_id = candidate.user_id
        and bookmark.id = candidate.bookmark_id
        and bookmark.metadata_generation = candidate.generation;

      exhausted_failed_count := exhausted_failed_count + 1;
    else
      update private.enrichment_requests
      set state = 'queued',
        lease_token = null,
        lease_expires_at = null,
        heartbeat_at = null,
        next_attempt_at = clock_timestamp()
      where id = candidate.id;

      expired_requeued_count := expired_requeued_count + 1;
    end if;
  end loop;

  for candidate in
    select job.id, job.attempt_count, job.max_attempts
    from private.transfer_jobs as job
    where job.state = 'running'
      and job.lease_expires_at <= clock_timestamp()
    order by job.id
    limit batch_size
    for update skip locked
  loop
    if candidate.attempt_count >= candidate.max_attempts then
      terminal_time := clock_timestamp();
      update private.transfer_jobs
      set state = 'failed',
        lease_token = null,
        lease_expires_at = null,
        heartbeat_at = null,
        public_error_code = 'attempts_exhausted',
        internal_error = null,
        terminal_at = terminal_time,
        expires_at = terminal_time + interval '30 days'
      where id = candidate.id;

      exhausted_failed_count := exhausted_failed_count + 1;
    else
      update private.transfer_jobs
      set state = 'queued',
        lease_token = null,
        lease_expires_at = null,
        heartbeat_at = null,
        next_attempt_at = clock_timestamp()
      where id = candidate.id;

      expired_requeued_count := expired_requeued_count + 1;
    end if;
  end loop;

  for candidate in
    select request.id, request.queue_name, request.queue_message_id
    from private.enrichment_requests as request
    where request.state = 'queued'
    order by request.id
    limit batch_size
    for update skip locked
  loop
    physical_queue_name := private.enrichment_queue_name(candidate.queue_name);
    if candidate.queue_message_id is null
      or not private.queue_message_exists(
        physical_queue_name,
        candidate.queue_message_id
      )
    then
      update private.enrichment_requests
      set queue_message_id = null
      where id = candidate.id;
      perform private.send_enrichment_message(candidate.id);
      missing_messages_replaced_count := missing_messages_replaced_count + 1;
    end if;
  end loop;

  for candidate in
    select job.id, job.kind, job.queue_message_id
    from private.transfer_jobs as job
    where job.state = 'queued'
    order by job.id
    limit batch_size
    for update skip locked
  loop
    physical_queue_name := private.transfer_queue_name(candidate.kind);
    if candidate.queue_message_id is null
      or not private.queue_message_exists(
        physical_queue_name,
        candidate.queue_message_id
      )
    then
      update private.transfer_jobs
      set queue_message_id = null
      where id = candidate.id;
      perform private.send_transfer_message(candidate.id);
      missing_messages_replaced_count := missing_messages_replaced_count + 1;
    end if;
  end loop;

  for candidate in
    select request.id, request.queue_name, request.queue_message_id
    from private.enrichment_requests as request
    where request.state in ('completed', 'failed', 'cancelled')
      and request.queue_message_id is not null
    order by request.id
    limit batch_size
    for update skip locked
  loop
    physical_queue_name := private.enrichment_queue_name(candidate.queue_name);
    if pgmq.delete(physical_queue_name, candidate.queue_message_id) then
      terminal_messages_deleted_count := terminal_messages_deleted_count + 1;
    end if;
    update private.enrichment_requests
    set queue_message_id = null
    where id = candidate.id;
  end loop;

  for candidate in
    select job.id, job.kind, job.queue_message_id
    from private.transfer_jobs as job
    where job.state in (
      'completed',
      'completed_with_failures',
      'failed',
      'cancelled'
    )
      and job.queue_message_id is not null
    order by job.id
    limit batch_size
    for update skip locked
  loop
    physical_queue_name := private.transfer_queue_name(candidate.kind);
    if pgmq.delete(physical_queue_name, candidate.queue_message_id) then
      terminal_messages_deleted_count := terminal_messages_deleted_count + 1;
    end if;
    update private.transfer_jobs
    set queue_message_id = null
    where id = candidate.id;
  end loop;

  with expired as (
    select incident.id
    from private.worker_queue_incidents as incident
    where incident.expires_at <= clock_timestamp()
    order by incident.expires_at, incident.id
    limit batch_size
    for update skip locked
  ), deleted as (
    delete from private.worker_queue_incidents as incident
    using expired
    where incident.id = expired.id
    returning incident.id
  )
  select count(*)::integer into incidents_deleted_count from deleted;

  with expired as (
    select run.id
    from private.durable_repair_runs as run
    where run.expires_at <= clock_timestamp()
    order by run.expires_at, run.id
    limit batch_size
    for update skip locked
  )
  delete from private.durable_repair_runs as run
  using expired
  where run.id = expired.id;

  insert into private.durable_repair_runs (
    expired_requeued,
    exhausted_failed,
    missing_messages_replaced,
    terminal_messages_deleted,
    incidents_deleted,
    started_at,
    completed_at,
    expires_at
  )
  values (
    expired_requeued_count,
    exhausted_failed_count,
    missing_messages_replaced_count,
    terminal_messages_deleted_count,
    incidents_deleted_count,
    repair_started_at,
    clock_timestamp(),
    clock_timestamp() + interval '7 days'
  );

  return jsonb_build_object(
    'expired_requeued', expired_requeued_count,
    'exhausted_failed', exhausted_failed_count,
    'missing_messages_replaced', missing_messages_replaced_count,
    'terminal_messages_deleted', terminal_messages_deleted_count,
    'incidents_deleted', incidents_deleted_count
  );
end;
$$;

create or replace function private.read_worker_queue_metrics()
returns table (
  queue_name text,
  total_messages bigint,
  visible_messages bigint,
  oldest_message_age_seconds bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_queue_name text;
begin
  foreach candidate_queue_name in array array[
    'reway_enrichment_interactive',
    'reway_enrichment_bulk',
    'reway_transfer_mutating',
    'reway_transfer_export'
  ]
  loop
    return query execute format(
      'select %L::text,
        count(*)::bigint,
        count(*) filter (where vt <= clock_timestamp())::bigint,
        coalesce(
          floor(extract(epoch from clock_timestamp() - min(enqueued_at)))::bigint,
          0::bigint
        )
      from pgmq.%I',
      candidate_queue_name,
      'q_' || candidate_queue_name
    );
  end loop;
end;
$$;

create or replace function private.read_worker_operator_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrichment_states jsonb;
  transfer_states jsonb;
  queue_metrics jsonb;
  latest_repair jsonb;
  poison_message_count bigint;
  expired_lease_count bigint;
  near_expiry_lease_count bigint;
  terminal_binding_count bigint;
begin
  select coalesce(jsonb_object_agg(grouped.state, grouped.count), '{}'::jsonb)
  into enrichment_states
  from (
    select request.state, count(*)::bigint as count
    from private.enrichment_requests as request
    group by request.state
  ) as grouped;

  select coalesce(jsonb_object_agg(grouped.state, grouped.count), '{}'::jsonb)
  into transfer_states
  from (
    select job.state, count(*)::bigint as count
    from private.transfer_jobs as job
    group by job.state
  ) as grouped;

  select coalesce(jsonb_agg(to_jsonb(metric) order by metric.queue_name), '[]'::jsonb)
  into queue_metrics
  from private.read_worker_queue_metrics() as metric;

  select to_jsonb(run) - 'id' - 'expires_at'
  into latest_repair
  from private.durable_repair_runs as run
  order by run.completed_at desc, run.id desc
  limit 1;

  select count(*)::bigint
  into poison_message_count
  from private.worker_queue_incidents;

  select count(*)::bigint
  into expired_lease_count
  from (
    select request.id
    from private.enrichment_requests as request
    where request.state = 'running'
      and request.lease_expires_at <= clock_timestamp()
    union all
    select job.id
    from private.transfer_jobs as job
    where job.state = 'running'
      and job.lease_expires_at <= clock_timestamp()
  ) as expired;

  select count(*)::bigint
  into near_expiry_lease_count
  from (
    select request.id
    from private.enrichment_requests as request
    where request.state = 'running'
      and request.lease_expires_at > clock_timestamp()
      and request.lease_expires_at <= clock_timestamp() + interval '60 seconds'
    union all
    select job.id
    from private.transfer_jobs as job
    where job.state = 'running'
      and job.lease_expires_at > clock_timestamp()
      and job.lease_expires_at <= clock_timestamp() + interval '60 seconds'
  ) as near_expiry;

  select count(*)::bigint
  into terminal_binding_count
  from (
    select request.id
    from private.enrichment_requests as request
    where request.state in ('completed', 'failed', 'cancelled')
      and request.queue_message_id is not null
    union all
    select job.id
    from private.transfer_jobs as job
    where job.state in (
      'completed',
      'completed_with_failures',
      'failed',
      'cancelled'
    )
      and job.queue_message_id is not null
  ) as terminal_bindings;

  return jsonb_build_object(
    'queues', queue_metrics,
    'enrichment_states', enrichment_states,
    'transfer_states', transfer_states,
    'expired_leases', expired_lease_count,
    'near_expiry_leases', near_expiry_lease_count,
    'poison_messages', poison_message_count,
    'terminal_message_bindings', terminal_binding_count,
    'latest_repair', coalesce(latest_repair, '{}'::jsonb)
  );
end;
$$;

create or replace function public.worker_read_queue(
  target_queue_name text,
  visibility_seconds integer,
  batch_size integer
)
returns table (
  message_id bigint,
  delivery_count integer,
  enqueued_at timestamptz,
  visible_at timestamptz,
  envelope jsonb
)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.worker_read_queue(
    target_queue_name,
    visibility_seconds,
    batch_size
  );
$$;

create or replace function public.worker_claim_enrichment_message(
  target_queue_name text,
  target_message_id bigint,
  target_request_id uuid,
  target_generation bigint,
  lease_seconds integer
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_claim_enrichment_message(
    target_queue_name,
    target_message_id,
    target_request_id,
    target_generation,
    lease_seconds
  );
$$;

create or replace function public.worker_claim_transfer_message(
  target_queue_name text,
  target_message_id bigint,
  target_job_id uuid,
  target_work_kind text,
  lease_seconds integer
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_claim_transfer_message(
    target_queue_name,
    target_message_id,
    target_job_id,
    target_work_kind,
    lease_seconds
  );
$$;

create or replace function public.worker_start_enrichment_attempt(
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_start_enrichment_attempt(
    target_request_id,
    target_generation,
    target_lease_token
  );
$$;

create or replace function public.worker_start_transfer_attempt(
  target_job_id uuid,
  target_lease_token uuid
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_start_transfer_attempt(
    target_job_id,
    target_lease_token
  );
$$;

create or replace function public.worker_renew_enrichment_lease(
  target_queue_name text,
  target_message_id bigint,
  target_request_id uuid,
  target_generation bigint,
  target_lease_token uuid,
  lease_seconds integer,
  visibility_seconds integer
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_renew_enrichment_lease(
    target_queue_name,
    target_message_id,
    target_request_id,
    target_generation,
    target_lease_token,
    lease_seconds,
    visibility_seconds
  );
$$;

create or replace function public.worker_renew_transfer_lease(
  target_queue_name text,
  target_message_id bigint,
  target_job_id uuid,
  target_lease_token uuid,
  lease_seconds integer,
  visibility_seconds integer
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_renew_transfer_lease(
    target_queue_name,
    target_message_id,
    target_job_id,
    target_lease_token,
    lease_seconds,
    visibility_seconds
  );
$$;

create or replace function public.worker_finish_enrichment_message(
  target_queue_name text,
  target_message_id bigint,
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
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_finish_enrichment_message(
    target_queue_name,
    target_message_id,
    target_request_id,
    target_generation,
    target_lease_token,
    succeeded,
    result_title,
    result_favicon_url,
    result_og_image_url,
    result_failure_class,
    result_public_error_code,
    result_internal_error,
    retry_at
  );
$$;

create or replace function public.worker_finish_transfer_message(
  target_queue_name text,
  target_message_id bigint,
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
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_finish_transfer_message(
    target_queue_name,
    target_message_id,
    target_job_id,
    target_lease_token,
    target_state,
    target_processed_count,
    target_succeeded_count,
    target_failed_count,
    target_public_error_code,
    target_internal_error,
    target_retry_at
  );
$$;

create or replace function public.worker_delete_terminal_message(
  target_queue_name text,
  target_message_id bigint
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_delete_terminal_message(
    target_queue_name,
    target_message_id
  );
$$;

create or replace function public.worker_reject_poison_message(
  target_queue_name text,
  target_message_id bigint,
  target_delivery_count integer,
  target_reason_code text
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_reject_poison_message(
    target_queue_name,
    target_message_id,
    target_delivery_count,
    target_reason_code
  );
$$;

create or replace function public.worker_operator_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.read_worker_operator_snapshot();
$$;

select cron.schedule(
  'reway-durable-work-repair',
  '30 seconds',
  'select private.repair_durable_work(100);'
);

revoke all on table private.worker_queue_incidents from public, anon,
  authenticated, service_role;
revoke all on table private.durable_repair_runs from public, anon,
  authenticated, service_role;
revoke all on sequence private.worker_queue_incidents_id_seq from public, anon,
  authenticated, service_role;
revoke all on sequence private.durable_repair_runs_id_seq from public, anon,
  authenticated, service_role;

revoke all on function private.is_worker_queue_name(text)
  from public, anon, authenticated, service_role;
revoke all on function private.enrichment_queue_name(text)
  from public, anon, authenticated, service_role;
revoke all on function private.transfer_queue_name(text)
  from public, anon, authenticated, service_role;
revoke all on function private.queue_message_exists(text, bigint)
  from public, anon, authenticated, service_role;
revoke all on function private.send_enrichment_message(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.send_transfer_message(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.start_transfer_attempt(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.repair_durable_work(integer)
  from public, anon, authenticated, service_role;
revoke all on function private.read_worker_queue_metrics()
  from public, anon, authenticated, service_role;
revoke all on function private.worker_read_queue(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.worker_claim_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  integer
) from public, anon, authenticated, service_role;
revoke all on function private.worker_claim_transfer_message(
  text,
  bigint,
  uuid,
  text,
  integer
) from public, anon, authenticated, service_role;
revoke all on function private.worker_start_enrichment_attempt(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.worker_start_transfer_attempt(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.worker_renew_enrichment_lease(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  integer,
  integer
) from public, anon, authenticated, service_role;
revoke all on function private.worker_renew_transfer_lease(
  text,
  bigint,
  uuid,
  uuid,
  integer,
  integer
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
  text,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.worker_finish_transfer_message(
  text,
  bigint,
  uuid,
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function private.worker_delete_terminal_message(text, bigint)
  from public, anon, authenticated, service_role;
revoke all on function private.worker_reject_poison_message(
  text,
  bigint,
  integer,
  text
) from public, anon, authenticated, service_role;
revoke all on function private.read_worker_operator_snapshot()
  from public, anon, authenticated, service_role;

revoke execute on function private.claim_enrichment_requests(
  text,
  integer,
  integer
) from service_role;
revoke execute on function private.start_enrichment_attempt(
  uuid,
  bigint,
  uuid
) from service_role;
revoke execute on function private.finish_enrichment_request(
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
) from service_role;
revoke execute on function private.claim_transfer_jobs(
  text,
  integer,
  integer
) from service_role;
revoke execute on function private.finish_transfer_job(
  uuid,
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  text,
  text,
  timestamptz
) from service_role;

grant execute on function private.worker_read_queue(text, integer, integer)
  to service_role;
grant execute on function private.worker_claim_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  integer
) to service_role;
grant execute on function private.worker_claim_transfer_message(
  text,
  bigint,
  uuid,
  text,
  integer
) to service_role;
grant execute on function private.worker_start_enrichment_attempt(uuid, bigint, uuid)
  to service_role;
grant execute on function private.worker_start_transfer_attempt(uuid, uuid)
  to service_role;
grant execute on function private.worker_renew_enrichment_lease(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function private.worker_renew_transfer_lease(
  text,
  bigint,
  uuid,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function private.worker_finish_enrichment_message(
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
) to service_role;
grant execute on function private.worker_finish_transfer_message(
  text,
  bigint,
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
grant execute on function private.worker_delete_terminal_message(text, bigint)
  to service_role;
grant execute on function private.worker_reject_poison_message(
  text,
  bigint,
  integer,
  text
) to service_role;
grant execute on function private.read_worker_operator_snapshot()
  to service_role;

revoke all on function public.worker_read_queue(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.worker_claim_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_claim_transfer_message(
  text,
  bigint,
  uuid,
  text,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_start_enrichment_attempt(uuid, bigint, uuid)
  from public, anon, authenticated;
revoke all on function public.worker_start_transfer_attempt(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.worker_renew_enrichment_lease(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_renew_transfer_lease(
  text,
  bigint,
  uuid,
  uuid,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_finish_enrichment_message(
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
) from public, anon, authenticated;
revoke all on function public.worker_finish_transfer_message(
  text,
  bigint,
  uuid,
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  text,
  text,
  timestamptz
) from public, anon, authenticated;
revoke all on function public.worker_delete_terminal_message(text, bigint)
  from public, anon, authenticated;
revoke all on function public.worker_reject_poison_message(
  text,
  bigint,
  integer,
  text
) from public, anon, authenticated;
revoke all on function public.worker_operator_snapshot()
  from public, anon, authenticated;

grant execute on function public.worker_read_queue(text, integer, integer)
  to service_role;
grant execute on function public.worker_claim_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  integer
) to service_role;
grant execute on function public.worker_claim_transfer_message(
  text,
  bigint,
  uuid,
  text,
  integer
) to service_role;
grant execute on function public.worker_start_enrichment_attempt(uuid, bigint, uuid)
  to service_role;
grant execute on function public.worker_start_transfer_attempt(uuid, uuid)
  to service_role;
grant execute on function public.worker_renew_enrichment_lease(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function public.worker_renew_transfer_lease(
  text,
  bigint,
  uuid,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function public.worker_finish_enrichment_message(
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
) to service_role;
grant execute on function public.worker_finish_transfer_message(
  text,
  bigint,
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
grant execute on function public.worker_delete_terminal_message(text, bigint)
  to service_role;
grant execute on function public.worker_reject_poison_message(
  text,
  bigint,
  integer,
  text
) to service_role;
grant execute on function public.worker_operator_snapshot()
  to service_role;

revoke all on all tables in schema pgmq from public, anon, authenticated,
  service_role;
revoke all on all sequences in schema pgmq from public, anon, authenticated,
  service_role;
revoke all on all functions in schema pgmq from public, anon, authenticated,
  service_role;
revoke usage on schema pgmq from public, anon, authenticated, service_role;
