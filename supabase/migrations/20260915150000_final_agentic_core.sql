-- KIVRYN Final Agentic Core
-- Persists bounded runtime metadata, meters Agent usage atomically and makes
-- Agent run history read-only to clients.

alter table public.agent_runs
  add column if not exists connector_ids text[] not null default '{}'::text[],
  add column if not exists subagent_ids text[] not null default '{}'::text[],
  add column if not exists action_plan jsonb,
  add column if not exists action_plan_fingerprint text,
  add column if not exists action_plan_status text not null default 'none',
  add column if not exists applied_step_ids text[] not null default '{}'::text[],
  add column if not exists openai_response_id text,
  add column if not exists agentic_runtime_version integer not null default 1;

alter table public.agent_runs
  drop constraint if exists agent_runs_connector_ids_check,
  add constraint agent_runs_connector_ids_check
    check (
      connector_ids <@ array[
        'workspace.tasks',
        'workspace.projects',
        'workspace.studies'
      ]::text[]
    ),
  drop constraint if exists agent_runs_subagent_ids_check,
  add constraint agent_runs_subagent_ids_check
    check (
      subagent_ids <@ array[
        'editor.v1',
        'planner.v1',
        'analyst.v1',
        'tutor.v1',
        'operator.v1'
      ]::text[]
      and cardinality(subagent_ids) <= 3
    ),
  drop constraint if exists agent_runs_action_plan_status_check,
  add constraint agent_runs_action_plan_status_check
    check (
      action_plan_status in (
        'none',
        'pending_approval',
        'partially_applied',
        'applied',
        'rejected'
      )
    ),
  drop constraint if exists agent_runs_action_plan_coherence_check,
  add constraint agent_runs_action_plan_coherence_check
    check (
      (
        action_plan_status = 'none'
        and action_plan is null
        and action_plan_fingerprint is null
        and cardinality(applied_step_ids) = 0
      )
      or
      (
        action_plan_status <> 'none'
        and action_plan is not null
        and jsonb_typeof(action_plan) = 'object'
        and nullif(btrim(action_plan_fingerprint), '') is not null
      )
    ),
  drop constraint if exists agent_runs_runtime_version_check,
  add constraint agent_runs_runtime_version_check
    check (agentic_runtime_version between 1 and 100);

create index if not exists agent_runs_pending_approval_idx
  on public.agent_runs (user_id, created_at desc)
  where action_plan_status in ('pending_approval', 'partially_applied');

-- One logical Agent run consumes one daily usage unit even when a background
-- worker retries. The advisory lock makes the daily ceiling concurrency-safe.
create or replace function public.claim_agent_run_usage(
  p_user uuid,
  p_request_id text,
  p_limit integer default 30
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  used_count integer;
begin
  if p_user is null or nullif(btrim(coalesce(p_request_id, '')), '') is null then
    raise exception 'invalid_usage_claim';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid_usage_limit';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user::text || ':agent_run:' || current_date::text, 0)
  );

  if exists (
    select 1
      from public.ai_usage
     where user_id = p_user
       and request_id = p_request_id
  ) then
    return true;
  end if;

  select count(*)::integer
    into used_count
    from public.ai_usage
   where user_id = p_user
     and action = 'agent_run'
     and usage_date = current_date;

  if used_count >= p_limit then
    return false;
  end if;

  insert into public.ai_usage(user_id, action, usage_date, request_id)
  values (p_user, 'agent_run', current_date, p_request_id);
  return true;
end;
$$;

revoke all on function public.claim_agent_run_usage(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_agent_run_usage(uuid, text, integer)
  to service_role;

-- Agent runs are written only by server-owned Edge Functions. Authenticated clients
-- may inspect their own history but cannot forge run state, plans, approvals or audit data.
alter table public.agent_runs enable row level security;
drop policy if exists "Owners manage agent runs" on public.agent_runs;
drop policy if exists "Owners read agent runs" on public.agent_runs;
create policy "Owners read agent runs"
  on public.agent_runs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.agent_runs from anon, authenticated;
grant select on public.agent_runs to authenticated;
