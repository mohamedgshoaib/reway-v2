-- Run only after the Phase 8E durable-jobs migration exists.
-- The final expected exception rolls back every fixture in this transaction.

begin;
set local reway.suppress_broadcast = 'on';

insert into auth.users (id, email)
values ('55555555-5555-4555-8555-555555555555', 'phase8e@example.invalid');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

select public.create_bookmark(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'https://example.invalid/phase8e',
  'Phase 8E'
);
select public.create_bookmark(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'https://example.invalid/phase8e-complete',
  'Phase 8E complete'
);

reset role;

do $extension_checks$
begin
  if (
    select count(*)
    from pg_extension
    where extname in ('pgmq', 'pg_cron', 'pg_net')
  ) <> 3 then
    raise exception 'Phase 8E extensions are missing.';
  end if;

  if to_regclass('pgmq.q_reway_enrichment_interactive') is null
    or to_regclass('pgmq.q_reway_enrichment_bulk') is null
    or to_regclass('pgmq.q_reway_transfer_mutating') is null
    or to_regclass('pgmq.q_reway_transfer_export') is null
  then
    raise exception 'Phase 8E queues are missing.';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'reway-durable-work-repair'
      and schedule = '30 seconds'
  ) then
    raise exception 'Phase 8E repair schedule is missing.';
  end if;
end;
$extension_checks$;

set local role service_role;

do $worker_checks$
declare
  claimed jsonb;
  deleted boolean;
  delivery record;
  finished text;
  position integer := 0;
  remaining integer;
  renewed boolean;
  request_id uuid;
  request_generation text;
  started boolean;
begin
  for delivery in
    select *
    from public.worker_read_queue(
      'reway_enrichment_interactive',
      90,
      2
    )
    order by message_id::bigint
  loop
    position := position + 1;
    request_id := (delivery.envelope ->> 'request_id')::uuid;
    request_generation := delivery.envelope ->> 'generation';

    select public.worker_claim_enrichment_message(
      'reway_enrichment_interactive',
      delivery.message_id,
      request_id,
      request_generation,
      60
    ) into claimed;

    if claimed ->> 'status' <> 'claimed' then
      raise exception 'Phase 8E message was not claimed.';
    end if;

    select public.worker_renew_enrichment_lease(
      'reway_enrichment_interactive',
      delivery.message_id,
      request_id,
      request_generation,
      (claimed ->> 'lease_token')::uuid,
      60,
      90
    ) into renewed;

    select public.worker_start_enrichment_attempt(
      request_id,
      request_generation,
      (claimed ->> 'lease_token')::uuid
    ) into started;

    if position = 1 then
      select public.worker_finish_enrichment_message(
        'reway_enrichment_interactive',
        delivery.message_id,
        request_id,
        request_generation,
        (claimed ->> 'lease_token')::uuid,
        false,
        null,
        null,
        null,
        'transient',
        'temporary_failure',
        null,
        clock_timestamp() + interval '2 minutes'
      ) into finished;

      if not renewed or not started or finished <> 'queued' then
        raise exception 'Phase 8E retry flow failed.';
      end if;
    else
      select public.worker_finish_enrichment_message(
        'reway_enrichment_interactive',
        delivery.message_id,
        request_id,
        request_generation,
        (claimed ->> 'lease_token')::uuid,
        true,
        'Phase 8E enriched'
      ) into finished;

      select public.worker_delete_terminal_message(
        'reway_enrichment_interactive',
        delivery.message_id
      ) into deleted;

      if not renewed or not started or finished <> 'completed' or not deleted then
        raise exception 'Phase 8E completion flow failed.';
      end if;
    end if;
  end loop;

  if position <> 2 then
    raise exception 'Phase 8E queue batch was incomplete.';
  end if;

  select count(*)::integer
  into remaining
  from public.worker_read_queue('reway_enrichment_interactive', 90, 2);

  if remaining <> 0 then
    raise exception 'Phase 8E retry visibility was not delayed.';
  end if;
end;
$worker_checks$;

select public.worker_operator_snapshot();

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

do $authenticated_denial$
declare
  rejected boolean := false;
begin
  begin
    perform public.worker_operator_snapshot();
  exception when insufficient_privilege then
    rejected := true;
  end;

  if not rejected then
    raise exception 'Authenticated role called a worker function.';
  end if;
end;
$authenticated_denial$;

reset role;

do $finish$
begin
  raise exception 'phase8e_rollback hosted_checks=passed';
end;
$finish$;
