-- Edition 10: append-only Agent action audit trail.
-- Workspace action payloads are intentionally excluded. Authenticated clients can
-- inspect only their own events; only the server-owned runtime can append events.

create table if not exists public.agent_action_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null,
  run_id uuid not null,
  step_id text not null check (char_length(step_id) between 1 and 64),
  action_type text not null check (char_length(action_type) between 1 and 80),
  domain text not null check (domain in ('tasks', 'projects', 'studies')),
  status text not null check (
    status in ('approval_required', 'approved', 'applied', 'rejected', 'failed')
  ),
  resource_id uuid,
  idempotent boolean,
  error_code text check (error_code is null or char_length(error_code) between 1 and 80),
  occurred_at timestamptz not null default now(),
  unique (run_id, step_id, status)
);

create index if not exists agent_action_audit_events_owner_time_idx
  on public.agent_action_audit_events (user_id, occurred_at desc);

create index if not exists agent_action_audit_events_agent_time_idx
  on public.agent_action_audit_events (user_id, agent_id, occurred_at desc);

alter table public.agent_action_audit_events enable row level security;

drop policy if exists "Owners read agent action audit" on public.agent_action_audit_events;
create policy "Owners read agent action audit"
  on public.agent_action_audit_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.agent_action_audit_events from public, anon, authenticated;
grant select on public.agent_action_audit_events to authenticated;
grant select, insert on public.agent_action_audit_events to service_role;

comment on table public.agent_action_audit_events is
  'Append-only KIVRYN Agent action decision/execution receipts. Action payloads are not stored.';
