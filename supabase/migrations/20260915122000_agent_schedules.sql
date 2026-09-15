alter table public.agents
  add column if not exists schedule_frequency text,
  add column if not exists schedule_time time without time zone,
  add column if not exists schedule_weekdays smallint[],
  add column if not exists schedule_timezone text,
  add column if not exists schedule_prompt text,
  add column if not exists notify_on_run boolean not null default true,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz;

alter table public.agents
  drop constraint if exists agents_schedule_frequency_check,
  add constraint agents_schedule_frequency_check
    check (schedule_frequency is null or schedule_frequency in ('daily', 'weekly'));

alter table public.agents
  drop constraint if exists agents_schedule_prompt_length_check,
  add constraint agents_schedule_prompt_length_check
    check (schedule_prompt is null or char_length(schedule_prompt) between 1 and 12000);

alter table public.agents
  drop constraint if exists agents_schedule_weekdays_check,
  add constraint agents_schedule_weekdays_check
    check (
      schedule_weekdays is null
      or schedule_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
    );

alter table public.agent_runs
  add column if not exists trigger text not null default 'manual',
  add column if not exists scheduled_for timestamptz;

alter table public.agent_runs
  drop constraint if exists agent_runs_trigger_check,
  add constraint agent_runs_trigger_check
    check (trigger in ('manual', 'scheduled', 'system'));

create unique index if not exists agent_runs_scheduled_occurrence_unique
  on public.agent_runs (agent_id, scheduled_for)
  where trigger = 'scheduled' and scheduled_for is not null;

create index if not exists agents_due_schedule_idx
  on public.agents (next_run_at)
  where active is true and schedule_frequency is not null and next_run_at is not null;

create or replace function public.kivryn_next_agent_run(
  p_frequency text,
  p_local_time time without time zone,
  p_weekdays smallint[],
  p_timezone text,
  p_after timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_catalog
as $$
declare
  local_after timestamp without time zone;
  candidate timestamp without time zone;
  offset_days integer;
  candidate_day smallint;
begin
  if p_frequency not in ('daily', 'weekly') then
    raise exception 'invalid_schedule_frequency';
  end if;
  if p_local_time is null then
    raise exception 'schedule_time_required';
  end if;
  if p_timezone is null or not exists (
    select 1 from pg_timezone_names where name = p_timezone
  ) then
    raise exception 'invalid_schedule_timezone';
  end if;
  if p_frequency = 'weekly' and (
    p_weekdays is null
    or cardinality(p_weekdays) = 0
    or not (p_weekdays <@ array[1,2,3,4,5,6,7]::smallint[])
  ) then
    raise exception 'schedule_weekdays_required';
  end if;

  local_after := p_after at time zone p_timezone;

  if p_frequency = 'daily' then
    candidate := date_trunc('day', local_after) + p_local_time;
    if candidate <= local_after then
      candidate := candidate + interval '1 day';
    end if;
    return candidate at time zone p_timezone;
  end if;

  for offset_days in 0..7 loop
    candidate := date_trunc('day', local_after + make_interval(days => offset_days)) + p_local_time;
    candidate_day := extract(isodow from candidate)::smallint;
    if candidate_day = any(p_weekdays) and candidate > local_after then
      return candidate at time zone p_timezone;
    end if;
  end loop;

  raise exception 'next_schedule_not_found';
end;
$$;

create or replace function public.configure_agent_schedule(
  p_agent_id uuid,
  p_frequency text,
  p_local_time time without time zone,
  p_weekdays smallint[],
  p_timezone text,
  p_prompt text,
  p_notify boolean default true
)
returns table (
  agent_id uuid,
  next_run_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  next_at timestamptz;
  clean_prompt text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  clean_prompt := btrim(coalesce(p_prompt, ''));
  if char_length(clean_prompt) < 1 or char_length(clean_prompt) > 12000 then
    raise exception 'invalid_schedule_prompt';
  end if;

  next_at := public.kivryn_next_agent_run(
    p_frequency,
    p_local_time,
    case when p_frequency = 'weekly' then p_weekdays else null end,
    p_timezone,
    now()
  );

  return query
  update public.agents a
     set schedule_frequency = p_frequency,
         schedule_time = p_local_time,
         schedule_weekdays = case when p_frequency = 'weekly' then p_weekdays else null end,
         schedule_timezone = p_timezone,
         schedule_prompt = clean_prompt,
         notify_on_run = coalesce(p_notify, true),
         next_run_at = next_at,
         updated_at = now()
   where a.id = p_agent_id
     and a.user_id = auth.uid()
  returning a.id, a.next_run_at;

  if not found then
    raise exception 'agent_not_found';
  end if;
end;
$$;

create or replace function public.clear_agent_schedule(p_agent_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  update public.agents
     set schedule_frequency = null,
         schedule_time = null,
         schedule_weekdays = null,
         schedule_timezone = null,
         schedule_prompt = null,
         next_run_at = null,
         updated_at = now()
   where id = p_agent_id
     and user_id = auth.uid();

  return found;
end;
$$;

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
  if coalesce(p_limit, 0) < 1 or p_limit > 50 then
    raise exception 'invalid_claim_limit';
  end if;

  -- Serialize the very small scheduler claim window. The unique occurrence index
  -- remains the final idempotency guard if an invocation overlaps or retries.
  if not pg_try_advisory_xact_lock(hashtext('kivryn_agent_schedule_claim')) then
    return;
  end if;

  with due as (
    select a.id,
           a.user_id,
           a.next_run_at as scheduled_for,
           a.schedule_prompt,
           a.notify_on_run,
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
      user_id, agent_id, input, status, trigger, scheduled_for, started_at
    )
    select d.user_id,
           d.id,
           d.schedule_prompt,
           'queued',
           'scheduled',
           d.scheduled_for,
           null
      from due d
    on conflict (agent_id, scheduled_for)
      where trigger = 'scheduled' and scheduled_for is not null
    do nothing
    returning id, agent_id, user_id, scheduled_for
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
  ), candidates as (
    select r.id
      from public.agent_runs r
      join public.agents a on a.id = r.agent_id
     where r.trigger = 'scheduled'
       and r.status = 'queued'
       and a.active is true
     order by r.scheduled_for nulls last, r.created_at
     for update of r skip locked
     limit p_limit
  ), claimed as (
    update public.agent_runs r
       set status = 'running', started_at = now(), error_code = null
      from candidates c
     where r.id = c.id
    returning r.id, r.agent_id, r.user_id, r.scheduled_for, r.input
  )
  return query
  select c.id,
         c.agent_id,
         c.user_id,
         c.scheduled_for,
         c.input,
         a.notify_on_run
    from claimed c
    join public.agents a on a.id = c.agent_id;
end;
$$;

revoke all on function public.kivryn_next_agent_run(text, time without time zone, smallint[], text, timestamptz) from public, anon, authenticated;
revoke all on function public.configure_agent_schedule(uuid, text, time without time zone, smallint[], text, text, boolean) from public, anon;
revoke all on function public.clear_agent_schedule(uuid) from public, anon;
revoke all on function public.claim_due_agent_runs(integer) from public, anon, authenticated;

grant execute on function public.configure_agent_schedule(uuid, text, time without time zone, smallint[], text, text, boolean) to authenticated;
grant execute on function public.clear_agent_schedule(uuid) to authenticated;
grant execute on function public.claim_due_agent_runs(integer) to service_role;
