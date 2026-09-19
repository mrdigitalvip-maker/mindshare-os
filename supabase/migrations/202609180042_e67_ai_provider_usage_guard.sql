-- E67 — AI provider usage guard and observability ledger.
-- Server-owned: clients never write provider quota/usage facts directly.

create table if not exists public.ai_provider_usage_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','gemini')),
  capability text not null check (
    capability in (
      'text','reasoning','vision','audio_input','audio_output',
      'live_voice','video_understanding','embeddings','tool_calling'
    )
  ),
  billing_mode text not null check (billing_mode in ('free','paid')),
  model text not null check (char_length(model) between 1 and 200),
  request_id text not null check (char_length(request_id) between 1 and 128),
  status text not null check (status in ('started','completed','failed','quota_limited')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  input_units integer check (input_units is null or input_units >= 0),
  output_units integer check (output_units is null or output_units >= 0),
  error_code text check (error_code is null or char_length(error_code) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, request_id)
);

create index if not exists ai_provider_usage_user_provider_created_idx
  on public.ai_provider_usage_claims(user_id, provider, created_at desc);

create index if not exists ai_provider_usage_provider_created_idx
  on public.ai_provider_usage_claims(provider, created_at desc);

alter table public.ai_provider_usage_claims enable row level security;

revoke all privileges on table public.ai_provider_usage_claims from anon, authenticated;
grant select, insert, update, delete on table public.ai_provider_usage_claims to service_role;

comment on table public.ai_provider_usage_claims is
  'Server-owned provider usage/quota receipts. No prompt, transcript, API key or raw media is stored.';
