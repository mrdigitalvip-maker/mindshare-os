-- E34 — Creator operational query/index hardening.
-- Cover FK lookup paths already reported by the Supabase performance advisor,
-- without duplicating the existing owner/project/job indexes.

create index if not exists creator_analytics_content_user_id_idx
  on public.creator_analytics_content(user_id);

create index if not exists creator_analytics_snapshots_user_id_idx
  on public.creator_analytics_snapshots(user_id);

create index if not exists creator_country_observations_user_id_idx
  on public.creator_country_observations(user_id);

create index if not exists creator_clips_job_project_user_idx
  on public.creator_clips(job_id, project_id, user_id);

create index if not exists creator_clips_project_user_idx
  on public.creator_clips(project_id, user_id);

create index if not exists creator_clips_replaces_clip_id_idx
  on public.creator_clips(replaces_clip_id)
  where replaces_clip_id is not null;
