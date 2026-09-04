-- NXR-037B: user-authored Creator profile, strategy, learning and truthful data shells.
-- Analytics and benchmarks are inserted by trusted integrations/dataset ingestion only.
create table public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience text not null check (experience in ('beginner','creator','professional')),
  platforms text[] not null default '{}', niche text not null default '', goal text not null default '',
  primary_audience_region text not null default '', weekly_posting_capacity smallint not null default 1 check (weekly_posting_capacity between 1 and 100),
  display_name text not null default '', username_ideas text[] not null default '{}', bio text not null default '',
  positioning text not null default '', category text not null default '', call_to_action text not null default '',
  content_pillars text[] not null default '{}', keywords text[] not null default '{}', brand_tone text not null default '',
  visual_direction text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.creator_strategies (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null, niche text not null, goal text not null, content_pillars text[] not null default '{}',
  publishing_frequency smallint not null check (publishing_frequency between 1 and 100), target_markets text[] not null default '{}',
  preferred_content_formats text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.creator_learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade, lesson_key text not null,
  completed_at timestamptz not null default now(), primary key(user_id,lesson_key)
);
create table public.creator_platform_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null, external_account_id text not null, status text not null check(status in ('pending','active','revoked','error')),
  granted_metrics text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,platform,external_account_id)
);
create table public.creator_analytics_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.creator_platform_connections(id) on delete cascade, platform text not null,
  captured_at timestamptz not null, metrics jsonb not null check(jsonb_typeof(metrics)='object'), country text,
  weekday smallint check(weekday between 0 and 6), hour smallint check(hour between 0 and 23), content_type text,
  created_at timestamptz not null default now()
);
create table public.creator_benchmarks (
  id uuid primary key default gen_random_uuid(), platform text not null, country text not null, timezone text not null,
  weekday smallint not null check(weekday between 0 and 6), hour_window text not null, niche text, content_type text,
  sample_size bigint check(sample_size > 0), source text not null, source_date date not null, confidence text,
  benchmark_type text not null check(benchmark_type='global_benchmark'), dataset_version text not null, created_at timestamptz not null default now()
);

alter table public.creator_profiles enable row level security;
alter table public.creator_strategies enable row level security;
alter table public.creator_learning_progress enable row level security;
alter table public.creator_platform_connections enable row level security;
alter table public.creator_analytics_snapshots enable row level security;
alter table public.creator_benchmarks enable row level security;
create policy creator_profiles_owner_all on public.creator_profiles for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy creator_strategies_owner_all on public.creator_strategies for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy creator_learning_owner_all on public.creator_learning_progress for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy creator_connections_owner_select on public.creator_platform_connections for select to authenticated using(auth.uid()=user_id);
create policy creator_analytics_owner_select on public.creator_analytics_snapshots for select to authenticated using(auth.uid()=user_id);
create policy creator_benchmarks_authenticated_select on public.creator_benchmarks for select to authenticated using(true);

comment on table public.creator_platform_connections is 'OAuth connections managed by trusted backend flows; clients have read-only access.';
comment on table public.creator_analytics_snapshots is 'Only metrics returned by an authorized platform are stored; trusted integrations write rows.';
comment on table public.creator_benchmarks is 'Versioned, attributed benchmark datasets; no seeded or invented data.';
