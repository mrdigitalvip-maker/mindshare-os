-- E69 — Creator Worker runtime presence and health.
-- Server-owned observability only; clients receive aggregate health through an authenticated Edge Function.

create table if not exists public.creator_worker_instances (
  worker_id text primary key
    check (char_length(worker_id) between 1 and 128),
  status text not null
    check (status in ('starting','idle','busy','stopping','error')),
  current_job_id uuid references public.creator_jobs(id) on delete set null,
  deployment_id text
    check (deployment_id is null or char_length(deployment_id) between 1 and 200),
  commit_sha text
    check (commit_sha is null or char_length(commit_sha) between 7 and 64),
  region text
    check (region is null or char_length(region) between 1 and 120),
  last_error_code text
    check (last_error_code is null or char_length(last_error_code) between 1 and 120),
  started_at timestamptz not null,
  last_heartbeat_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists creator_worker_instances_heartbeat_idx
  on public.creator_worker_instances(last_heartbeat_at desc);

create index if not exists creator_worker_instances_current_job_idx
  on public.creator_worker_instances(current_job_id);

alter table public.creator_worker_instances enable row level security;

revoke all privileges on table public.creator_worker_instances from anon, authenticated;
grant select, insert, update, delete on table public.creator_worker_instances to service_role;

comment on table public.creator_worker_instances is
  'Server-owned Creator worker liveness/health ledger. No user payloads, transcripts, media, or credentials are stored.';
