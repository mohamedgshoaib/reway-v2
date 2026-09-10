-- Keep the asynchronous wake request alive long enough to observe the approved
-- 10-second enrichment gate while staying below the Edge request timeout.
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
      timeout_milliseconds := 15000
    );
  exception when others then
    return null;
  end;
end;
$$;

revoke all on function private.request_enrichment_worker_wake(text)
  from public, anon, authenticated, service_role;
