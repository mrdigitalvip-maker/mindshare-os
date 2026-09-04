-- NEXORA pre-v6 remote schema hardening.
-- Forward-only fixes discovered by `supabase db lint --linked`.
-- Historical migrations remain immutable.

-- ============================================================
-- 1. CREATOR WORKER FAILURE STATE
-- ============================================================

create or replace function public.creator_worker_fail(
  p_job_id uuid,
  p_lease_owner text,
  p_error_code text,
  p_retryable boolean,
  p_max_attempts integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  update public.creator_jobs
  set
    status = (
      case
        when cancellation_requested_at is not null
          or p_error_code = 'CANCELLED'
          then 'cancelled'
        when p_retryable
          and attempt_count < p_max_attempts
          then 'queued'
        else 'failed'
      end
    )::public.creator_job_status,

    progress_stage = case
      when p_retryable
        and attempt_count < p_max_attempts
        then 'queued'
      else 'failed'
    end,

    error_code = left(p_error_code, 80),

    completed_at = case
      when p_retryable
        and attempt_count < p_max_attempts
        then null
      else now()
    end,

    lease_owner = null,
    lease_expires_at = null

  where id = p_job_id
    and lease_owner = p_lease_owner

  returning project_id into pid;

  if pid is not null
     and exists (
       select 1
       from public.creator_jobs
       where id = p_job_id
         and status in ('failed', 'cancelled')
     )
  then
    update public.creator_projects
    set
      status = (
        select status::text::public.creator_project_status
        from public.creator_jobs
        where id = p_job_id
      ),
      updated_at = now()
    where id = pid;
  end if;

  return pid is not null;
end
$$;

revoke all on function public.creator_worker_fail(
  uuid,
  text,
  text,
  boolean,
  integer
) from public;


-- ============================================================
-- 2. ASSISTANT HISTORY RETENTION
-- ============================================================
-- Preserve the original candidate set without relying on a temporary
-- relation that cannot be resolved by static database linting.

create or replace function public.purge_expired_ai_history(
  retention_days integer default 30
)
returns table (
  deleted_conversations integer,
  deleted_messages integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed_conversations integer := 0;
  removed_messages integer := 0;
  expired_ids uuid[] := '{}'::uuid[];
begin
  if retention_days < 1 then
    raise exception 'retention_days must be positive';
  end if;

  select coalesce(array_agg(candidate.id), '{}'::uuid[])
  into expired_ids
  from (
    select c.id
    from public.ai_conversations c
    where coalesce(
            c.updated_at,
            c.created_at,
            '-infinity'::timestamptz
          ) < now() - make_interval(days => retention_days)

      and not exists (
        select 1
        from public.ai_messages m
        where m.conversation_id = c.id
          and m.created_at >=
            now() - make_interval(days => retention_days)
      )

      and not exists (
        select 1
        from public.subscriptions s
        where s.user_id = c.user_id
          and s.status in ('active', 'trialing')
          and s.current_period_end is not null
          and s.current_period_end > now()
      )

    for update of c skip locked
  ) candidate;

  if cardinality(expired_ids) > 0 then
    delete from public.ai_messages m
    where m.conversation_id = any(expired_ids);

    get diagnostics removed_messages = row_count;

    delete from public.ai_conversations c
    where c.id = any(expired_ids);

    get diagnostics removed_conversations = row_count;
  end if;

  insert into public.ai_history_retention_runs(
    deleted_conversations,
    deleted_messages
  )
  values (
    removed_conversations,
    removed_messages
  );

  return query
  select removed_conversations, removed_messages;
end
$$;

revoke all on function public.purge_expired_ai_history(integer)
from public, anon, authenticated;


-- ============================================================
-- 3. DAILY MISSION CANDIDATE
-- ============================================================
-- Preserve task -> study fallback while replacing the dynamically-shaped
-- record with typed variables.

create or replace function public.ensure_daily_journey_mission(
  p_local_date date
)
returns public.journey_missions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  found public.journey_missions;

  candidate_source_type text;
  candidate_source_id uuid;
  candidate_title text;
  candidate_description text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  if p_local_date is null
     or p_local_date < current_date - 1
     or p_local_date > current_date + 1
  then
    raise exception 'invalid_mission_date';
  end if;

  select *
  into found
  from public.journey_missions
  where user_id = uid
    and scheduled_date = p_local_date;

  if found.id is not null then
    return found;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(uid::text || p_local_date::text, 0)
  );

  select *
  into found
  from public.journey_missions
  where user_id = uid
    and scheduled_date = p_local_date;

  if found.id is not null then
    return found;
  end if;

  select
    'task'::text,
    t.id,
    t.title,
    coalesce(t.next_action, t.description)
  into
    candidate_source_type,
    candidate_source_id,
    candidate_title,
    candidate_description
  from public.tasks t
  left join public.projects p
    on p.id = t.project_id
  where t.user_id = uid
    and not t.completed
    and (
      t.project_id is null
      or p.status = 'active'
    )
  order by
    case
      when t.due_date < p_local_date then 0
      when t.due_date = p_local_date then 10
      when t.next_action is not null then 20
      when t.due_date is not null then 40
      else 60
    end,
    t.title,
    t.id
  limit 1;

  if candidate_source_id is null then
    select
      'study_session'::text,
      s.id,
      ('Estudar ' || s.name),
      s.next_action
    into
      candidate_source_type,
      candidate_source_id,
      candidate_title,
      candidate_description
    from public.study_subjects s
    where s.user_id = uid
      and s.status = 'active'
      and nullif(btrim(s.next_action), '') is not null
    order by
      s.updated_at desc,
      s.id
    limit 1;
  end if;

  if candidate_source_id is null then
    return null;
  end if;

  insert into public.journey_missions(
    user_id,
    source_type,
    source_id,
    title,
    description,
    status,
    scheduled_date
  )
  values (
    uid,
    candidate_source_type,
    candidate_source_id,
    candidate_title,
    candidate_description,
    'active',
    p_local_date
  )
  returning * into found;

  return found;
end
$$;

revoke all on function public.ensure_daily_journey_mission(date)
from public;

grant execute on function public.ensure_daily_journey_mission(date)
to authenticated;