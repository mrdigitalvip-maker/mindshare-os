-- NXR-037D: authorized, server-owned Creator Intelligence. No benchmark or analytics seeds.
alter table public.creator_platform_connections drop constraint creator_platform_connections_status_check;
update public.creator_platform_connections set status = case status when 'pending' then 'not_connected' when 'active' then 'connected' else status end;
alter table public.creator_platform_connections
  alter column external_account_id drop not null,
  add column if not exists provider_display_name text,
  add column if not exists provider_account_type text,
  add column if not exists granted_scopes text[] not null default '{}',
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists next_allowed_at timestamptz,
  add column if not exists safe_error_code text,
  add column if not exists disconnected_at timestamptz,
  add constraint creator_platform_connections_status_check
    check(status in ('not_connected','authorizing','connected','expired','revoked','error')),
  add constraint creator_platform_connections_platform_check
    check(platform in ('youtube','tiktok','instagram'));

-- This table has RLS enabled and deliberately has no authenticated policies.
create table public.creator_provider_credentials (
  connection_id uuid primary key references public.creator_platform_connections(id) on delete cascade,
  provider_account_id text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  revoked_at timestamptz,
  encryption_version smallint not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.creator_provider_credentials enable row level security;

create table public.creator_oauth_states (
  state_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('youtube','tiktok','instagram')),
  nonce_hash text not null, pkce_verifier_ciphertext text, redirect_uri text not null,
  expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.creator_oauth_states enable row level security;

alter table public.creator_analytics_snapshots
  add column if not exists provider_account_id text,
  add column if not exists provider_content_id text,
  add column if not exists source_timestamp timestamptz,
  add column if not exists granted_metric_names text[] not null default '{}',
  add column if not exists source_snapshot_key text,
  add column if not exists published_at timestamptz,
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists provider_payload_fingerprint text;
create unique index creator_snapshot_source_unique
  on public.creator_analytics_snapshots(connection_id, source_snapshot_key)
  where source_snapshot_key is not null;

create table public.creator_analytics_content (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.creator_platform_connections(id) on delete cascade,
  platform text not null, provider_content_id text not null, content_type text,
  title text, published_at timestamptz not null, duration_ms bigint, source_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(connection_id, provider_content_id)
);
alter table public.creator_analytics_content enable row level security;
create policy creator_analytics_content_owner_select on public.creator_analytics_content
  for select to authenticated using(auth.uid()=user_id);

create table public.creator_country_observations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.creator_platform_connections(id) on delete cascade,
  platform text not null, country_iso text not null check(country_iso ~ '^[A-Z]{2}$'),
  metric text not null, value numeric not null, period_start date not null, period_end date not null,
  source_context text not null, captured_at timestamptz not null,
  unique(connection_id,country_iso,metric,period_start,period_end,captured_at)
);
alter table public.creator_country_observations enable row level security;
create policy creator_country_owner_select on public.creator_country_observations
  for select to authenticated using(auth.uid()=user_id);

alter table public.creator_benchmarks
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists publication_date date,
  add column if not exists collection_period text,
  add column if not exists methodology text,
  add column if not exists metric text,
  add column if not exists limitations text,
  add column if not exists ingested_at timestamptz not null default now();

comment on table public.creator_provider_credentials is 'Server-only application-encrypted OAuth credentials. No client policy is permitted.';
comment on table public.creator_oauth_states is 'Single-use, expiring OAuth state/nonce and PKCE server contract. No client policy is permitted.';
comment on column public.creator_analytics_snapshots.metrics is 'Optional metrics actually returned by the provider; an absent metric must remain absent, while authoritative zero remains zero.';
