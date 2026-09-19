-- E66 — real clip candidates separated from rendered outputs.

create table if not exists public.creator_clip_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.creator_jobs(id) on delete cascade,
  project_id uuid not null references public.creator_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_ms bigint not null,
  end_ms bigint not null,
  duration_ms bigint not null,
  rank integer,
  score numeric,
  score_reason text,
  transcript_excerpt text not null,
  hook_excerpt text,
  title_suggestion text,
  aspect_ratio text not null,
  candidate_status text not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_clip_candidates_range_check
    check (start_ms >= 0 and end_ms > start_ms and duration_ms = end_ms - start_ms),
  constraint creator_clip_candidates_score_check
    check (score is null or (score >= 0 and score <= 100)),
  constraint creator_clip_candidates_aspect_check
    check (aspect_ratio in ('9:16','1:1','16:9')),
  constraint creator_clip_candidates_status_check
    check (candidate_status in ('candidate','rendering','rendered','failed')),
  constraint creator_clip_candidates_identity_key
    unique (job_id,start_ms,end_ms,aspect_ratio)
);

create index if not exists creator_clip_candidates_project_id_idx
  on public.creator_clip_candidates(project_id);
create index if not exists creator_clip_candidates_user_id_idx
  on public.creator_clip_candidates(user_id);
create index if not exists creator_clip_candidates_job_status_idx
  on public.creator_clip_candidates(job_id,candidate_status);

alter table public.creator_clip_candidates enable row level security;

revoke all privileges on table public.creator_clip_candidates from anon, authenticated;
grant select on table public.creator_clip_candidates to authenticated;
grant all privileges on table public.creator_clip_candidates to service_role;

drop policy if exists creator_clip_candidates_owner_select on public.creator_clip_candidates;
create policy creator_clip_candidates_owner_select
on public.creator_clip_candidates
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.creator_projects p
    where p.id = creator_clip_candidates.project_id
      and p.user_id = (select auth.uid())
  )
);

alter table public.creator_clips
  add column if not exists candidate_id uuid
  references public.creator_clip_candidates(id) on delete set null;

create index if not exists creator_clips_candidate_id_idx
  on public.creator_clips(candidate_id);
