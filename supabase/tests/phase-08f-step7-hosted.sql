-- Run before Phase 8F activates a producer or applies the asset migration.
-- The final expected exception rolls back every fixture in this transaction.

begin;
set local reway.suppress_broadcast = 'on';

create temporary table phase_08f_publication_samples (
  sample_number integer primary key,
  elapsed_ms double precision not null
) on commit drop;
grant insert, select on phase_08f_publication_samples to authenticated;

insert into auth.users (id, email)
values (
  '88888888-8888-4888-8888-888888888888',
  'phase8f-step7@example.invalid'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888888',
  true
);

do $benchmark$
declare
  item_number integer;
  sample_number integer;
  sample_started_at timestamptz;
begin
  for sample_number in 1..20 loop
    sample_started_at := clock_timestamp();

    for item_number in 1..50 loop
      perform public.create_bookmark(
        md5(format('phase8f-step7-%s-%s', sample_number, item_number))::uuid,
        format(
          'https://phase8f-step7.example.invalid/%s/%s',
          sample_number,
          item_number
        ),
        format('Phase 8F step 7 %s %s', sample_number, item_number),
        'bulk',
        null
      );
    end loop;

    insert into phase_08f_publication_samples (sample_number, elapsed_ms)
    values (
      sample_number,
      extract(epoch from clock_timestamp() - sample_started_at) * 1000
    );

  end loop;
end;
$benchmark$;

reset role;

do $cleanup$
declare
  message record;
begin
  for message in
    select request.queue_message_id
    from private.enrichment_requests as request
    where request.user_id = '88888888-8888-4888-8888-888888888888'
      and request.queue_message_id is not null
  loop
    perform pgmq.delete(
      'reway_enrichment_bulk',
      message.queue_message_id
    );
  end loop;
end;
$cleanup$;

do $result$
declare
  p50_ms double precision;
  p95_ms double precision;
  p99_ms double precision;
begin
  select
    percentile_cont(0.50) within group (order by elapsed_ms),
    percentile_cont(0.95) within group (order by elapsed_ms),
    percentile_cont(0.99) within group (order by elapsed_ms)
  into p50_ms, p95_ms, p99_ms
  from phase_08f_publication_samples;

  if p95_ms > 1000 then
    raise exception
      'phase8f_step7_rollback hosted_publication_benchmark=failed samples=20 p50_ms=% p95_ms=% p99_ms=%',
      round(p50_ms::numeric, 2),
      round(p95_ms::numeric, 2),
      round(p99_ms::numeric, 2);
  end if;

  raise exception
    'phase8f_step7_rollback hosted_publication_benchmark=passed samples=20 p50_ms=% p95_ms=% p99_ms=%',
    round(p50_ms::numeric, 2),
    round(p95_ms::numeric, 2),
    round(p99_ms::numeric, 2);
end;
$result$;
