alter function private.worker_finish_enrichment_message(
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
) rename to worker_finish_enrichment_message_unchecked;

alter function private.worker_finish_transfer_message(
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
) rename to worker_finish_transfer_message_unchecked;

create function private.worker_finish_enrichment_message(
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
  result_state text;
begin
  select private.worker_finish_enrichment_message_unchecked(
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
  )
  into result_state;

  if result_state = 'queued'
    and not private.queue_message_exists(
      target_queue_name,
      target_message_id
    )
  then
    raise exception using errcode = '55000', message = 'Queue message missing.';
  end if;

  return result_state;
end;
$$;

create function private.worker_finish_transfer_message(
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
  result_state text;
begin
  select private.worker_finish_transfer_message_unchecked(
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
  )
  into result_state;

  if result_state = 'queued'
    and not private.queue_message_exists(
      target_queue_name,
      target_message_id
    )
  then
    raise exception using errcode = '55000', message = 'Queue message missing.';
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
    target_message_id::bigint,
    target_request_id,
    target_generation::bigint,
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
  target_message_id text,
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
    target_message_id::bigint,
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

revoke all on function private.worker_finish_enrichment_message_unchecked(
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
revoke all on function private.worker_finish_transfer_message_unchecked(
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
