-- NXR-037E: owner-authored Creator data. Provider tables from 001-005 remain server-owned.
create table public.creator_content_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok','youtube','facebook','other')),
  content_type text not null check (content_type in ('reel','short','video','post','story','other')),
  title text not null check (char_length(title) between 1 and 200),
  published_at timestamptz not null, timezone text not null,
  reference_url text, content_pillar text, duration_ms bigint check (duration_ms is null or duration_ms >= 0), notes text,
  source_type text not null default 'manual' check (source_type = 'manual'),
  entered_by_user boolean not null default true check (entered_by_user),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.creator_content_log enable row level security;
create policy creator_content_log_owner_all on public.creator_content_log for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index creator_content_log_owner_published on public.creator_content_log(user_id, published_at desc);

-- Each update appends a canonical snapshot. Null means unknown and zero remains authoritative.
create table public.creator_manual_metric_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.creator_content_log(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok','youtube','facebook','other')),
  views numeric, reach numeric, watch_time_ms numeric, average_view_duration_ms numeric,
  retention_ratio numeric, likes numeric, comments numeric, shares numeric, saves numeric, followers_gained numeric,
  source_type text not null default 'manual' check (source_type = 'manual'),
  entered_by_user boolean not null default true check (entered_by_user), captured_at timestamptz not null default now(),
  check (views is null or views >= 0), check (reach is null or reach >= 0),
  check (retention_ratio is null or retention_ratio between 0 and 1)
);
alter table public.creator_manual_metric_snapshots enable row level security;
create policy creator_manual_metrics_owner_all on public.creator_manual_metric_snapshots for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (
    select 1 from public.creator_content_log c where c.id = content_id and c.user_id = auth.uid()
  ));
create index creator_manual_metrics_history on public.creator_manual_metric_snapshots(user_id, content_id, captured_at desc);

create table public.creator_manual_country_observations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok','youtube','facebook','other')),
  country_iso text check (country_iso is null or country_iso ~ '^[A-Z]{2}$'), country_name text not null,
  metric_context text not null, value numeric not null, period text not null, notes text,
  source_type text not null default 'manual' check (source_type = 'manual'),
  entered_by_user boolean not null default true check (entered_by_user), captured_at timestamptz not null default now()
);
alter table public.creator_manual_country_observations enable row level security;
create policy creator_manual_country_owner_all on public.creator_manual_country_observations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.creator_manual_metric_snapshots is 'Append-only user-entered observations; never silently reconciled with provider snapshots.';
