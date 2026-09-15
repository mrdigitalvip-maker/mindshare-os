-- KIVRYN Edition 12 — Background Runs Integration
-- Adds retry/lease metadata and separates due-schedule enqueueing from worker claims.

alter table public.agent_runs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists worker_claimed_at timestamptz,
  add column if not exists retry_after timestamptz,
  add column if not exists context_scopes text[] not null default '{}'::text[];

alter table public.agent_runs
  drop constraint if exists agent_runs_attempt_count_check,
  add constraint agent_runs_attempt_count_check check (attempt_count between 0 and 10),
  drop constraint if exists agent_runs_context_scopes_check,
  add constraint agent_runs_context_scopes_check
    check (context_scopes <@ array['profile','preferences','tasks','projects','studies','passport']::text[]);

create index if not exists agent_runs_background_queue_idx
  on public.agent_runs (retry_after, scheduled_for, created_at)
  where trigger in ('scheduled','system') and status in ('queued','retry_wait');

create index if not exists agent_runs_background_running_idx
  on public.agent_runs (heartbeat_at)
  where trigger in ('scheduled','system') and status = 'running';

create or replace function public.enqueue_due_agent_runs(p_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  inserted_count integer := 0;
begin
  if coalesce(p_limit, 0) < 1 or p_limit > 100 then
    raise exception 'invalid_enqueue_limit';
  end if;

  if not pg_try_advisory_xact_lock(hashtext('kivryn_agent_schedule_enqueue')) then
    return 0;
  end if;

  with due as (
    select a.id,
           a.user_id,
           a.next_run_at as scheduled_for,
           a.schedule_prompt,
           a.schedule_frequency,
           a.schedule_time,
           a.schedule_weekdays,
           a.schedule_timezone
      from public.agents a
     where a.active is true
       and a.schedule_frequency is not null
       and a.next_run_at is not null
       and a.next_run_at <= now()
     order by a.next_run_at
     for update skip locked
     limit p_limit
  ), inserted as (
    insert into public.agent_runs (
      user_id, agent_id, input, status, trigger, scheduled_for,
      started_at, attempt_count, heartbeat_at, worker_claimed_at,
      retry_after, context_scopes
    )
    select d.user_id,
           d.id,
           d.schedule_prompt,
           'queued',
           'scheduled',
           d.scheduled_for,
           null,
           0,
           null,
           null,
           null,
           '{}'::text[]
      from due d
    on conflict (agent_id, scheduled_for)
      where trigger = 'scheduled' and scheduled_for is not null
    do nothing
    returning id
  ), advanced as (
    update public.agents a
       set last_run_at = d.scheduled_for,
           next_run_at = public.kivryn_next_agent_run(
             d.schedule_frequency,
             d.schedule_time,
             d.schedule_weekdays,
             d.schedule_timezone,
             greatest(now(), d.scheduled_for)
           ),
           updated_at = now()
      from due d
     where a.id = d.id
    returning a.id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

create or replace function public.claim_background_agent_runs(
  p_limit integer default 10,
  p_stale_after interval default interval '15 minutes'
)
returns table (
  run_id uuid,
  agent_id uuid,
  user_id uuid,
  scheduled_for timestamptz,
  prompt text,
  notify_on_run boolean,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce(p_limit, 0) < 1 or p_limit > 50 then
    raise exception 'invalid_claim_limit';
  end if;
  if p_stale_after < interval '5 minutes' or p_stale_after > interval '2 hours' then
    raise exception 'invalid_stale_window';
  end if;

  -- Recover worker crashes without creating duplicate schedule occurrences.
  update public.agent_runs
     set status = case when attempt_count >= 3 then 'failed' else 'retry_wait' end,
         error_code = 'stale_worker',
         retry_after = case when attempt_count >= 3 then null else now() end,
         heartbeat_at = null,
         worker_claimed_at = null,
         finished_at = case when attempt_count >= 3 then now() else null end
   where trigger in ('scheduled','system')
     and status = 'running'
     and coalesce(heartbeat_at, worker_claimed_at, started_at, created_at) <= now() - p_stale_after;

  update public.agent_runs
     set status = 'queued', retry_after = null
   where trigger in ('scheduled','system')
     and status = 'retry_wait'
     and retry_after is not null
     and retry_after <= now()
     and attempt_count < 3;

  return query
  with candidates as (
    select r.id
      from public.agent_runs r
      join public.agents a on a.id = r.agent_id
     where r.trigger in ('scheduled','system')
       and r.status = 'queued'
       and r.attempt_count < 3
       and a.active is true
     order by r.scheduled_for nulls last, r.created_at
     for update of r skip locked
     limit p_limit
  ), claimed as (
    update public.agent_runs r
       set status = 'running',
           attempt_count = r.attempt_count + 1,
           started_at = coalesce(r.started_at, now()),
           worker_claimed_at = now(),
           heartbeat_at = now(),
           retry_after = null,
           error_code = null,
           finished_at = null
      from candidates c
     where r.id = c.id
    returning r.id, r.agent_id, r.user_id, r.scheduled_for, r.input, r.attempt_count
  )
  select c.id,
         c.agent_id,
         c.user_id,
         c.scheduled_for,
         c.input,
         coalesce(a.notify_on_run, true),
         c.attempt_count
    from claimed c
    join public.agents a on a.id = c.agent_id;
end;
$$;

-- Compatibility bridge for the Edition 8 worker during rolling deployment.
-- It now uses the same enqueue/lease lifecycle instead of retaining a second claim implementation.
create or replace function public.claim_due_agent_runs(p_limit integer default 10)
returns table (
  run_id uuid,
  agent_id uuid,
  user_id uuid,
  scheduled_for timestamptz,
  prompt text,
  notify_on_run boolean
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.enqueue_due_agent_runs(least(greatest(coalesce(p_limit, 10), 1), 50));
  return query
  select c.run_id,
         c.agent_id,
         c.user_id,
         c.scheduled_for,
         c.prompt,
         c.notify_on_run
    from public.claim_background_agent_runs(
      least(greatest(coalesce(p_limit, 10), 1), 50),
      interval '15 minutes'
    ) c;
end;
$$;

revoke all on function public.enqueue_due_agent_runs(integer) from public, anon, authenticated;
revoke all on function public.claim_background_agent_runs(integer, interval) from public, anon, authenticated;
revoke all on function public.claim_due_agent_runs(integer) from public, anon, authenticated;
grant execute on function public.enqueue_due_agent_runs(integer) to service_role;
grant execute on function public.claim_background_agent_runs(integer, interval) to service_role;
grant execute on function public.claim_due_agent_runs(integer) to service_role;
