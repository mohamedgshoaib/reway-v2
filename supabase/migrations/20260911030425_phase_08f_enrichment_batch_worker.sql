create or replace function private.worker_prepare_enrichment_batch(
  target_queue_name text,
  target_messages jsonb,
  lease_seconds integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  allowed_batch_size integer;
  claim_result jsonb;
  claimed_lease_token uuid;
  input_title text;
  input_url text;
  message record;
  message_count integer;
  prepared jsonb := '[]'::jsonb;
  valid_messages boolean;
begin
  allowed_batch_size := case target_queue_name
    when 'reway_enrichment_interactive' then 2
    when 'reway_enrichment_bulk' then 6
    else 0
  end;

  if allowed_batch_size = 0
    or lease_seconds not between 1 and 600
    or target_messages is null
    or jsonb_typeof(target_messages) <> 'array'
  then
    raise exception using errcode = '22023', message = 'Invalid batch preparation.';
  end if;

  message_count := jsonb_array_length(target_messages);
  if message_count not between 1 and allowed_batch_size then
    raise exception using errcode = '22023', message = 'Invalid batch preparation.';
  end if;

  select bool_and(
    coalesce(
      jsonb_typeof(item.value) = 'object'
      and jsonb_typeof(item.value -> 'message_id') = 'string'
      and (item.value ->> 'message_id') ~ '^[1-9][0-9]*$'
      and char_length(item.value ->> 'message_id') <= 19
      and jsonb_typeof(item.value -> 'request_id') = 'string'
      and (item.value ->> 'request_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and jsonb_typeof(item.value -> 'generation') = 'string'
      and (item.value ->> 'generation') ~ '^[1-9][0-9]*$'
      and char_length(item.value ->> 'generation') <= 19,
      false
    )
  )
  into valid_messages
  from jsonb_array_elements(target_messages) as item(value);

  if not valid_messages
    or (
      select count(distinct item.value ->> 'message_id')
      from jsonb_array_elements(target_messages) as item(value)
    ) <> message_count
    or (
      select count(distinct item.value ->> 'request_id')
      from jsonb_array_elements(target_messages) as item(value)
    ) <> message_count
  then
    raise exception using errcode = '22023', message = 'Invalid batch preparation.';
  end if;

  perform bookmark.id
  from public.bookmarks as bookmark
  join private.enrichment_requests as request
    on request.bookmark_id = bookmark.id
    and request.user_id = bookmark.user_id
  join jsonb_array_elements(target_messages) as item(value)
    on request.id = (item.value ->> 'request_id')::uuid
    and request.generation = (item.value ->> 'generation')::bigint
  order by bookmark.id
  for update of bookmark;

  for message in
    select
      item.ordinality,
      (item.value ->> 'message_id')::bigint as message_id,
      (item.value ->> 'request_id')::uuid as request_id,
      (item.value ->> 'generation')::bigint as generation
    from jsonb_array_elements(target_messages) with ordinality as item(value, ordinality)
    order by item.ordinality
  loop
    claim_result := private.worker_claim_enrichment_message(
      target_queue_name,
      message.message_id,
      message.request_id,
      message.generation,
      lease_seconds
    );

    if claim_result ->> 'status' <> 'claimed' then
      prepared := prepared || jsonb_build_array(jsonb_build_object(
        'message_id', message.message_id::text,
        'status', claim_result ->> 'status'
      ));
      continue;
    end if;

    claimed_lease_token := (claim_result ->> 'lease_token')::uuid;
    if not private.worker_start_enrichment_attempt(
      message.request_id,
      message.generation,
      claimed_lease_token
    ) then
      raise exception using errcode = '55000', message = 'Could not start claimed batch item.';
    end if;

    input_title := null;
    input_url := null;
    select bookmark.title, bookmark.url
    into input_title, input_url
    from private.enrichment_requests as request
    join public.bookmarks as bookmark
      on bookmark.user_id = request.user_id
      and bookmark.id = request.bookmark_id
    where request.id = message.request_id
      and request.generation = message.generation
      and request.lease_token = claimed_lease_token
      and request.state = 'running'
      and request.lease_expires_at > clock_timestamp()
      and bookmark.metadata_generation = message.generation;

    prepared := prepared || jsonb_build_array(jsonb_build_object(
      'attempt_count', (claim_result ->> 'attempt_count')::integer + 1,
      'fallback_title', input_title,
      'lease_token', claimed_lease_token,
      'max_attempts', (claim_result ->> 'max_attempts')::integer,
      'message_id', message.message_id::text,
      'status', 'claimed',
      'url', input_url
    ));
  end loop;

  return prepared;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid batch preparation.';
end;
$$;

create or replace function public.worker_prepare_enrichment_batch(
  target_queue_name text,
  target_messages jsonb,
  lease_seconds integer
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_prepare_enrichment_batch(
    target_queue_name,
    target_messages,
    lease_seconds
  );
$$;

create or replace function private.worker_finish_enrichment_batch(
  target_queue_name text,
  target_results jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  allowed_batch_size integer;
  delete_outcome text;
  finish_state text;
  finished jsonb := '[]'::jsonb;
  result record;
  result_count integer;
  valid_results boolean;
begin
  allowed_batch_size := case target_queue_name
    when 'reway_enrichment_interactive' then 2
    when 'reway_enrichment_bulk' then 6
    else 0
  end;

  if allowed_batch_size = 0
    or target_results is null
    or jsonb_typeof(target_results) <> 'array'
  then
    raise exception using errcode = '22023', message = 'Invalid batch completion.';
  end if;

  result_count := jsonb_array_length(target_results);
  if result_count not between 1 and allowed_batch_size then
    raise exception using errcode = '22023', message = 'Invalid batch completion.';
  end if;

  select bool_and(
    coalesce(
      jsonb_typeof(item.value) = 'object'
      and jsonb_typeof(item.value -> 'message_id') = 'string'
      and (item.value ->> 'message_id') ~ '^[1-9][0-9]*$'
      and char_length(item.value ->> 'message_id') <= 19
      and jsonb_typeof(item.value -> 'request_id') = 'string'
      and (item.value ->> 'request_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and jsonb_typeof(item.value -> 'generation') = 'string'
      and (item.value ->> 'generation') ~ '^[1-9][0-9]*$'
      and char_length(item.value ->> 'generation') <= 19
      and jsonb_typeof(item.value -> 'lease_token') = 'string'
      and (item.value ->> 'lease_token') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and jsonb_typeof(item.value -> 'succeeded') = 'boolean',
      false
    )
  )
  into valid_results
  from jsonb_array_elements(target_results) as item(value);

  if not valid_results
    or (
      select count(distinct item.value ->> 'message_id')
      from jsonb_array_elements(target_results) as item(value)
    ) <> result_count
    or (
      select count(distinct item.value ->> 'request_id')
      from jsonb_array_elements(target_results) as item(value)
    ) <> result_count
  then
    raise exception using errcode = '22023', message = 'Invalid batch completion.';
  end if;

  perform bookmark.id
  from public.bookmarks as bookmark
  join private.enrichment_requests as request
    on request.bookmark_id = bookmark.id
    and request.user_id = bookmark.user_id
  join jsonb_array_elements(target_results) as item(value)
    on request.id = (item.value ->> 'request_id')::uuid
    and request.generation = (item.value ->> 'generation')::bigint
  order by bookmark.id
  for update of bookmark;

  for result in
    select item.value, item.ordinality
    from jsonb_array_elements(target_results) with ordinality as item(value, ordinality)
    order by item.ordinality
  loop
    begin
      finish_state := private.worker_finish_enrichment_message(
        target_queue_name,
        (result.value ->> 'message_id')::bigint,
        (result.value ->> 'request_id')::uuid,
        (result.value ->> 'generation')::bigint,
        (result.value ->> 'lease_token')::uuid,
        (result.value ->> 'succeeded')::boolean,
        nullif(result.value ->> 'result_title', ''),
        nullif(result.value ->> 'result_domain', ''),
        nullif(result.value ->> 'result_favicon_asset_id', '')::uuid,
        nullif(result.value ->> 'result_og_image_asset_id', '')::uuid,
        nullif(result.value ->> 'result_failure_class', ''),
        nullif(result.value ->> 'result_public_error_code', ''),
        nullif(result.value ->> 'result_internal_error', ''),
        nullif(result.value ->> 'retry_at', '')::timestamptz
      );

      delete_outcome := null;
      if finish_state in ('cancelled', 'completed', 'completed_with_failures', 'failed') then
        delete_outcome := case when private.worker_delete_terminal_message(
          target_queue_name,
          (result.value ->> 'message_id')::bigint
        ) then 'deleted' else 'already_deleted' end;
      end if;
    exception
      when others then
        finish_state := 'rejected';
        delete_outcome := null;
    end;

    finished := finished || jsonb_build_array(jsonb_build_object(
      'finish_state', finish_state,
      'message_id', result.value ->> 'message_id',
      'terminal_delete_outcome', delete_outcome
    ));
  end loop;

  return finished;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid batch completion.';
end;
$$;

create or replace function public.worker_finish_enrichment_batch(
  target_queue_name text,
  target_results jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_finish_enrichment_batch(
    target_queue_name,
    target_results
  );
$$;

revoke all on function private.worker_prepare_enrichment_batch(text, jsonb, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.worker_finish_enrichment_batch(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.worker_prepare_enrichment_batch(text, jsonb, integer)
  from public, anon, authenticated;
revoke all on function public.worker_finish_enrichment_batch(text, jsonb)
  from public, anon, authenticated;

grant execute on function public.worker_prepare_enrichment_batch(text, jsonb, integer)
  to service_role;
grant execute on function public.worker_finish_enrichment_batch(text, jsonb)
  to service_role;
grant execute on function private.worker_prepare_enrichment_batch(text, jsonb, integer)
  to service_role;
grant execute on function private.worker_finish_enrichment_batch(text, jsonb)
  to service_role;
