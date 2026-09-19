-- E65 — persisted Creator transcript + truthful processing milestones.
-- Heavy-media writes remain service-role/worker only; owners receive read-only visibility.

create table if not exists public.creator_transcripts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.creator_jobs(id) on delete cascade,
  project_id uuid not null references public.creator_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openai',
  language text not null,
  full_text text not null,
  segments jsonb not null,
  segment_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_transcripts_provider_check
    check (provider in ('openai')),
  constraint creator_transcripts_language_check
    check (char_length(language) between 1 and 32),
  constraint creator_transcripts_segments_check
    check (jsonb_typeof(segments) = 'array' and segment_count > 0),
  constraint creator_transcripts_text_check
    check (char_length(full_text) > 0)
);

create index if not exists creator_transcripts_project_id_idx
  on public.creator_transcripts(project_id);
create index if not exists creator_transcripts_user_id_idx
  on public.creator_transcripts(user_id);

alter table public.creator_transcripts enable row level security;

revoke all privileges on table public.creator_transcripts from anon, authenticated;
grant select on table public.creator_transcripts to authenticated;
grant all privileges on table public.creator_transcripts to service_role;

drop policy if exists creator_transcripts_owner_select on public.creator_transcripts;
create policy creator_transcripts_owner_select
on public.creator_transcripts
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.creator_projects p
    where p.id = creator_transcripts.project_id
      and p.user_id = (select auth.uid())
  )
);

create or replace function public.creator_worker_progress(
  p_job_id uuid,
  p_lease_owner text,
  p_stage text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_percent smallint;
begin
  v_percent := case p_stage
    when 'queued' then 0
    when 'ingesting' then 10
    when 'transcribing' then 30
    when 'analyzing' then 50
    when 'detecting_segments' then 60
    when 'generating_candidates' then 70
    when 'rendering' then 80
    when 'ready' then 100
    when 'failed' then 100
    else null
  end;

  if v_percent is null then
    raise exception 'INVALID_PROGRESS_STAGE';
  end if;

  update public.creator_jobs
  set
    progress_stage = p_stage,
    progress_percent = v_percent,
    last_seen_at = now()
  where id = p_job_id
    and lease_owner = p_lease_owner
    and lease_expires_at > now();

  return found;
end
$function$;

revoke all on function public.creator_worker_progress(uuid,text,text) from public, anon, authenticated;
grant execute on function public.creator_worker_progress(uuid,text,text) to service_role;

create or replace function public.creator_claim_job(
  p_lease_owner text,
  p_lease_seconds integer default 120,
  p_max_attempts integer default 3
)
returns table(
  id uuid,
  project_id uuid,
  user_id uuid,
  source_path text,
  aspect_ratio text,
  target_duration_seconds smallint,
  captions_enabled boolean,
  settings jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with next as (
    select j.id
    from public.creator_jobs j
    where (
      j.status = 'queued'
      or (
        j.status in ('analyzing','transcribing','selecting_clips','rendering')
        and j.lease_expires_at < now()
      )
    )
      and j.attempt_count < p_max_attempts
      and j.cancellation_requested_at is null
    order by j.created_at
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.creator_jobs j
    set
      status = 'analyzing',
      progress_stage = 'ingesting',
      progress_percent = 10,
      lease_owner = p_lease_owner,
      lease_expires_at = now() + make_interval(secs => greatest(30,p_lease_seconds)),
      last_seen_at = now(),
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at,now())
    from next
    where j.id = next.id
    returning j.*
  )
  select
    c.id,
    c.project_id,
    c.user_id,
    p.source_path,
    (c.settings->>'aspect_ratio'),
    (c.settings->>'target_duration_seconds')::smallint,
    (c.settings->>'captions_enabled')::boolean,
    c.settings
  from claimed c
  join public.creator_projects p on p.id = c.project_id;
end
$function$;

create or replace function public.creator_worker_complete(
  p_job_id uuid,
  p_lease_owner text,
  p_media jsonb,
  p_transcript_language text,
  p_clip_count integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  pid uuid;
begin
  if p_clip_count < 1
     or not exists (
       select 1
       from public.creator_clips
       where job_id = p_job_id
         and render_status = 'available'
         and output_path is not null
     )
  then
    raise exception 'RESULTS_NOT_READY';
  end if;

  update public.creator_jobs
  set
    status = 'completed',
    progress_stage = 'ready',
    progress_percent = 100,
    completed_at = now(),
    processing_metadata = p_media,
    transcript_language = p_transcript_language,
    lease_owner = null,
    lease_expires_at = null
  where id = p_job_id
    and lease_owner = p_lease_owner
  returning project_id into pid;

  if pid is null then return false; end if;

  update public.creator_projects
  set status = 'completed', source_media = p_media, updated_at = now()
  where id = pid;

  return true;
end
$function$;
