drop function public.worker_read_queue(text, integer, integer);
drop function public.worker_claim_enrichment_message(
  text,
  bigint,
  uuid,
  bigint,
  integer
);
drop function public.worker_claim_transfer_message(
  text,
  bigint,
  uuid,
  text,
  integer
);
drop function public.worker_start_enrichment_attempt(uuid, bigint, uuid);
drop function public.worker_renew_enrichment_lease(
  text,
  bigint,
  uuid,
  bigint,
  uuid,
  integer,
  integer
);
drop function public.worker_renew_transfer_lease(
  text,
  bigint,
  uuid,
  uuid,
  integer,
  integer
);
drop function public.worker_finish_enrichment_message(
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
drop function public.worker_finish_transfer_message(
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
);
drop function public.worker_delete_terminal_message(text, bigint);
drop function public.worker_reject_poison_message(text, bigint, integer, text);

create function public.worker_read_queue(
  target_queue_name text,
  visibility_seconds integer,
  batch_size integer
)
returns table (
  message_id text,
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
  select
    message.message_id::text,
    message.delivery_count,
    message.enqueued_at,
    message.visible_at,
    message.envelope
  from private.worker_read_queue(
    target_queue_name,
    visibility_seconds,
    batch_size
  ) as message;
$$;

create function public.worker_claim_enrichment_message(
  target_queue_name text,
  target_message_id text,
  target_request_id uuid,
  target_generation text,
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
    target_message_id::bigint,
    target_request_id,
    target_generation::bigint,
    lease_seconds
  );
$$;

create function public.worker_claim_transfer_message(
  target_queue_name text,
  target_message_id text,
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
    target_message_id::bigint,
    target_job_id,
    target_work_kind,
    lease_seconds
  );
$$;

create function public.worker_start_enrichment_attempt(
  target_request_id uuid,
  target_generation text,
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
    target_generation::bigint,
    target_lease_token
  );
$$;

create function public.worker_renew_enrichment_lease(
  target_queue_name text,
  target_message_id text,
  target_request_id uuid,
  target_generation text,
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
    target_message_id::bigint,
    target_request_id,
    target_generation::bigint,
    target_lease_token,
    lease_seconds,
    visibility_seconds
  );
$$;

create function public.worker_renew_transfer_lease(
  target_queue_name text,
  target_message_id text,
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
    target_message_id::bigint,
    target_job_id,
    target_lease_token,
    lease_seconds,
    visibility_seconds
  );
$$;

create function public.worker_finish_enrichment_message(
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

create function public.worker_finish_transfer_message(
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

create function public.worker_delete_terminal_message(
  target_queue_name text,
  target_message_id text
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.worker_delete_terminal_message(
    target_queue_name,
    target_message_id::bigint
  );
$$;

create function public.worker_reject_poison_message(
  target_queue_name text,
  target_message_id text,
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
    target_message_id::bigint,
    target_delivery_count,
    target_reason_code
  );
$$;

revoke all on function public.worker_read_queue(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.worker_claim_enrichment_message(
  text,
  text,
  uuid,
  text,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_claim_transfer_message(
  text,
  text,
  uuid,
  text,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_start_enrichment_attempt(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.worker_renew_enrichment_lease(
  text,
  text,
  uuid,
  text,
  uuid,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_renew_transfer_lease(
  text,
  text,
  uuid,
  uuid,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.worker_finish_enrichment_message(
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
) from public, anon, authenticated;
revoke all on function public.worker_finish_transfer_message(
  text,
  text,
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
revoke all on function public.worker_delete_terminal_message(text, text)
  from public, anon, authenticated;
revoke all on function public.worker_reject_poison_message(
  text,
  text,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.worker_read_queue(text, integer, integer)
  to service_role;
grant execute on function public.worker_claim_enrichment_message(
  text,
  text,
  uuid,
  text,
  integer
) to service_role;
grant execute on function public.worker_claim_transfer_message(
  text,
  text,
  uuid,
  text,
  integer
) to service_role;
grant execute on function public.worker_start_enrichment_attempt(uuid, text, uuid)
  to service_role;
grant execute on function public.worker_renew_enrichment_lease(
  text,
  text,
  uuid,
  text,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function public.worker_renew_transfer_lease(
  text,
  text,
  uuid,
  uuid,
  integer,
  integer
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
  text,
  text,
  text,
  text,
  timestamptz
) to service_role;
grant execute on function public.worker_finish_transfer_message(
  text,
  text,
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
grant execute on function public.worker_delete_terminal_message(text, text)
  to service_role;
grant execute on function public.worker_reject_poison_message(
  text,
  text,
  integer,
  text
) to service_role;
