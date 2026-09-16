-- Fix scheduled Agent worker claims under plpgsql.variable_conflict = error.
-- RETURNS TABLE exposes attempt_count as a PL/pgSQL output variable, so every
-- reference to the agent_runs column must be explicitly qualified.

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
  update public.agent_runs as r
     set status = case when r.attempt_count >= 3 then 'failed' else 'retry_wait' end,
         error_code = 'stale_worker',
         retry_after = case when r.attempt_count >= 3 then null else now() end,
         heartbeat_at = null,
         worker_claimed_at = null,
         finished_at = case when r.attempt_count >= 3 then now() else null end
   where r.trigger in ('scheduled','system')
     and r.status = 'running'
     and coalesce(r.heartbeat_at, r.worker_claimed_at, r.started_at, r.created_at) <= now() - p_stale_after;

  update public.agent_runs as r
     set status = 'queued', retry_after = null
   where r.trigger in ('scheduled','system')
     and r.status = 'retry_wait'
     and r.retry_after is not null
     and r.retry_after <= now()
     and r.attempt_count < 3;

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

revoke all on function public.claim_background_agent_runs(integer, interval)
  from public, anon, authenticated;
grant execute on function public.claim_background_agent_runs(integer, interval)
  to service_role;
