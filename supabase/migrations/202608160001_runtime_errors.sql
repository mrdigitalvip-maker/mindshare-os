create table if not exists public.runtime_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  module text not null,
  error_name text not null,
  error_message text not null,
  stack_sanitized text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.runtime_errors enable row level security;

create policy "Users insert own runtime errors"
  on public.runtime_errors for insert to authenticated
  with check (auth.uid() = user_id);

-- Runtime diagnostics are intentionally not selectable through the public API.
-- Supabase service-role and dashboard administrators bypass RLS for inspection.
create index runtime_errors_created_at_idx on public.runtime_errors (created_at desc);
create index runtime_errors_user_created_idx on public.runtime_errors (user_id, created_at desc);
