import { readdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const MIGRATIONS_DIRECTORY = resolve("supabase/migrations")

const omitHostedExtensions = (migration) =>
  migration
    .replace(/^create extension if not exists pgmq;\r?$/gm, "")
    .replace(/^create extension if not exists pg_cron;\r?$/gm, "")
    .replace(
      /^create extension if not exists pg_net with schema extensions;\r?$/gm,
      ""
    )

export const installPhase8ExternalStubs = async (database) => {
  await database.exec(`
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create function public.rls_auto_enable()
    returns void
    language plpgsql
    as $$
    begin
      return;
    end;
    $$;

    create schema pgmq;
    create sequence pgmq.message_id_seq;

    create function pgmq.create(target_queue_name text)
    returns void
    language plpgsql
    as $$
    begin
      execute format(
        'create table if not exists pgmq.%I (
          msg_id bigint primary key default nextval(''pgmq.message_id_seq''),
          read_ct integer not null default 0,
          enqueued_at timestamptz not null default clock_timestamp(),
          vt timestamptz not null default clock_timestamp(),
          message jsonb not null
        )',
        'q_' || target_queue_name
      );
    end;
    $$;

    create function pgmq.send(
      target_queue_name text,
      target_message jsonb,
      delay_seconds integer default 0
    )
    returns bigint
    language plpgsql
    as $$
    declare
      sent_message_id bigint;
    begin
      execute format(
        'insert into pgmq.%I (vt, message)
        values (clock_timestamp() + make_interval(secs => $1), $2)
        returning msg_id',
        'q_' || target_queue_name
      )
      into sent_message_id
      using delay_seconds, target_message;

      return sent_message_id;
    end;
    $$;

    create function pgmq.read(
      target_queue_name text,
      visibility_seconds integer,
      batch_size integer
    )
    returns table (
      msg_id bigint,
      read_ct integer,
      enqueued_at timestamptz,
      vt timestamptz,
      message jsonb
    )
    language plpgsql
    as $$
    begin
      return query execute format(
        'with selected as (
          select queued.msg_id
          from pgmq.%I as queued
          where queued.vt <= clock_timestamp()
          order by queued.msg_id
          limit $1
          for update skip locked
        )
        update pgmq.%I as queued
        set read_ct = queued.read_ct + 1,
          vt = clock_timestamp() + make_interval(secs => $2)
        from selected
        where queued.msg_id = selected.msg_id
        returning queued.msg_id, queued.read_ct, queued.enqueued_at,
          queued.vt, queued.message',
        'q_' || target_queue_name,
        'q_' || target_queue_name
      )
      using batch_size, visibility_seconds;
    end;
    $$;

    create function pgmq.set_vt(
      target_queue_name text,
      target_message_id bigint,
      visibility_seconds integer
    )
    returns table (
      msg_id bigint,
      read_ct integer,
      enqueued_at timestamptz,
      vt timestamptz,
      message jsonb
    )
    language plpgsql
    as $$
    begin
      return query execute format(
        'update pgmq.%I as queued
        set vt = clock_timestamp() + make_interval(secs => $1)
        where queued.msg_id = $2
        returning queued.msg_id, queued.read_ct, queued.enqueued_at,
          queued.vt, queued.message',
        'q_' || target_queue_name
      )
      using visibility_seconds, target_message_id;
    end;
    $$;

    create function pgmq.delete(
      target_queue_name text,
      target_message_id bigint
    )
    returns boolean
    language plpgsql
    as $$
    declare
      deleted_count integer;
    begin
      execute format(
        'delete from pgmq.%I where msg_id = $1',
        'q_' || target_queue_name
      )
      using target_message_id;
      get diagnostics deleted_count = row_count;
      return deleted_count = 1;
    end;
    $$;

    create schema vault;
    create table vault.secrets (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      secret text not null
    );
    create view vault.decrypted_secrets as
    select id, name, secret as decrypted_secret
    from vault.secrets;

    create schema net;
    create sequence net.http_request_id_seq;
    create table net.http_request_queue (
      id bigint primary key,
      url text not null,
      headers jsonb not null,
      body jsonb not null,
      timeout_milliseconds integer not null
    );
    create function net.http_post(
      url text,
      body jsonb default '{}'::jsonb,
      params jsonb default '{}'::jsonb,
      headers jsonb default '{}'::jsonb,
      timeout_milliseconds integer default 1000
    )
    returns bigint
    language plpgsql
    as $$
    declare
      request_id bigint := nextval('net.http_request_id_seq');
    begin
      insert into net.http_request_queue (
        id,
        url,
        headers,
        body,
        timeout_milliseconds
      ) values (
        request_id,
        url,
        headers,
        body,
        timeout_milliseconds
      );
      return request_id;
    end;
    $$;

    create schema cron;
    create table cron.job (
      jobid bigint generated always as identity primary key,
      jobname text not null unique,
      schedule text not null,
      command text not null
    );
    create function cron.schedule(
      target_job_name text,
      target_schedule text,
      target_command text
    )
    returns bigint
    language plpgsql
    as $$
    declare
      scheduled_job_id bigint;
    begin
      insert into cron.job (jobname, schedule, command)
      values (target_job_name, target_schedule, target_command)
      on conflict (jobname) do update
      set schedule = excluded.schedule,
        command = excluded.command
      returning jobid into scheduled_job_id;
      return scheduled_job_id;
    end;
    $$;
  `)
}

export const applyPhase8Migrations = async (database) => {
  const migrationNames = (await readdir(MIGRATIONS_DIRECTORY))
    .filter((name) => name.endsWith(".sql"))
    .sort()

  for (const migrationName of migrationNames) {
    const migration = await readFile(
      resolve(MIGRATIONS_DIRECTORY, migrationName),
      "utf8"
    )
    await database.exec(omitHostedExtensions(migration))
  }
}
