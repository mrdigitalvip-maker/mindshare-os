-- Minimal execution fields used by the native Studies learning center.
alter table public.study_subjects add column if not exists objective text;
alter table public.study_subjects add column if not exists weekly_target_minutes integer
  check (weekly_target_minutes is null or weekly_target_minutes between 1 and 10080);
alter table public.study_subjects add column if not exists next_action text;

alter table public.study_sessions add column if not exists status text not null default 'completed'
  check (status in ('active', 'completed', 'cancelled'));
alter table public.study_sessions add column if not exists planned_minutes integer
  check (planned_minutes is null or planned_minutes between 1 and 1440);
alter table public.study_sessions add column if not exists started_at timestamptz;
alter table public.study_sessions add column if not exists ended_at timestamptz;
alter table public.study_sessions add column if not exists reflection text
  check (reflection is null or reflection in ('understood', 'review', 'difficult'));
alter table public.study_sessions drop constraint if exists study_sessions_duration_check;
alter table public.study_sessions add constraint study_sessions_duration_execution_check
  check (duration between 0 and 1440 and (status <> 'completed' or duration >= 1));

-- Legacy rows are completed sessions whose creation time is their best known start.
update public.study_sessions set started_at = created_at where started_at is null and completed = true;
update public.study_sessions
set ended_at = started_at + make_interval(mins => duration)
where ended_at is null and completed = true and started_at is not null;

create unique index if not exists study_sessions_one_active_per_user
  on public.study_sessions(user_id) where status = 'active';
create index if not exists study_sessions_active_lookup
  on public.study_sessions(user_id, status, started_at desc);
