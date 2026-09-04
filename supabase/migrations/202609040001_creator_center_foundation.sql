-- NXR-037A: private, owner-scoped Creator Center persistence. Worker deployment is separate.
create type public.creator_source_type as enum ('local_video','uploaded_video','authorized_direct','url_metadata');
create type public.creator_source_status as enum ('pending','uploading','available','unavailable','failed');
create type public.creator_project_status as enum ('draft','ready','processing','completed','failed','cancelled');
create type public.creator_job_status as enum ('draft','uploading','queued','analyzing','transcribing','selecting_clips','rendering','completed','failed','cancelled');
create type public.creator_render_status as enum ('pending','rendering','available','failed');

create table public.creator_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 120), source_type public.creator_source_type not null,
 source_reference text, source_status public.creator_source_status not null default 'pending', aspect_ratio text not null check(aspect_ratio in ('9:16','1:1','16:9')),
 target_duration_seconds smallint not null check(target_duration_seconds in (15,20,30,45,60)), captions_enabled boolean not null default true,
 status public.creator_project_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.creator_jobs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.creator_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, status public.creator_job_status not null default 'draft', progress_stage text,
 progress_percent smallint check(progress_percent between 0 and 100), error_code text, created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
 unique(id,project_id,user_id), foreign key(project_id,user_id) references public.creator_projects(id,user_id) on delete cascade
);
create table public.creator_clips (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.creator_projects(id) on delete cascade,
 job_id uuid not null references public.creator_jobs(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 start_ms bigint not null check(start_ms>=0), end_ms bigint not null, duration_ms bigint not null check(duration_ms>0), rank integer check(rank>0),
 score numeric(5,2) check(score between 0 and 100), score_reason text, transcript_excerpt text, render_status public.creator_render_status not null default 'pending', output_path text,
 created_at timestamptz not null default now(), check(end_ms>start_ms), check(duration_ms=end_ms-start_ms), unique(job_id,rank),
 foreign key(project_id,user_id) references public.creator_projects(id,user_id) on delete cascade,
 foreign key(job_id,project_id,user_id) references public.creator_jobs(id,project_id,user_id) on delete cascade
);
create table public.creator_usage (user_id uuid primary key references auth.users(id) on delete cascade, trial_used_at timestamptz, processed_count bigint not null default 0 check(processed_count>=0), updated_at timestamptz not null default now());
create index creator_projects_owner_created_idx on public.creator_projects(user_id,created_at desc);
create index creator_jobs_owner_project_idx on public.creator_jobs(user_id,project_id,created_at desc);
create index creator_clips_owner_project_idx on public.creator_clips(user_id,project_id,rank);
alter table public.creator_projects enable row level security; alter table public.creator_jobs enable row level security; alter table public.creator_clips enable row level security; alter table public.creator_usage enable row level security;
create policy creator_projects_owner_all on public.creator_projects for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy creator_jobs_owner_select on public.creator_jobs for select to authenticated using(auth.uid()=user_id and exists(select 1 from public.creator_projects p where p.id=project_id and p.user_id=auth.uid()));
create policy creator_clips_owner_select on public.creator_clips for select to authenticated using(auth.uid()=user_id and exists(select 1 from public.creator_projects p where p.id=project_id and p.user_id=auth.uid()));
create policy creator_usage_owner_select on public.creator_usage for select to authenticated using(auth.uid()=user_id);

insert into storage.buckets(id,name,public) values ('creator-sources','creator-sources',false),('creator-outputs','creator-outputs',false) on conflict(id) do update set public=false;
create policy creator_sources_owner_read on storage.objects for select to authenticated using(bucket_id='creator-sources' and (storage.foldername(name))[1]=auth.uid()::text);
create policy creator_sources_owner_insert on storage.objects for insert to authenticated with check(bucket_id='creator-sources' and (storage.foldername(name))[1]=auth.uid()::text);
create policy creator_sources_owner_delete on storage.objects for delete to authenticated using(bucket_id='creator-sources' and (storage.foldername(name))[1]=auth.uid()::text);
create policy creator_outputs_owner_read on storage.objects for select to authenticated using(bucket_id='creator-outputs' and (storage.foldername(name))[1]=auth.uid()::text);
-- Outputs are written only by the trusted external worker/service role.
comment on table public.creator_jobs is 'Server-authoritative queue consumed by the external NEXORA Creator Worker; clients have read-only access.';
comment on table public.creator_clips is 'Real worker results only; clients have read-only access. Never seed demonstration clips or scores.';
