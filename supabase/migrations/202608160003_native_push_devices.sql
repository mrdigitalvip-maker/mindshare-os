-- Add native device delivery without changing the existing webpush subscription contract.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  provider text not null check (provider in ('expo', 'fcm', 'apns')),
  token_or_endpoint text not null,
  device_id text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, device_id)
);

create index if not exists push_devices_owner_enabled_idx
  on public.push_devices(user_id, enabled);

alter table public.push_devices enable row level security;
create policy "owners read push devices" on public.push_devices for select to authenticated
  using (user_id = auth.uid());
create policy "owners register push devices" on public.push_devices for insert to authenticated
  with check (user_id = auth.uid());
create policy "owners update push devices" on public.push_devices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners remove push devices" on public.push_devices for delete to authenticated
  using (user_id = auth.uid());
