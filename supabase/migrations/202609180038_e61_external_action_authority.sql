-- E61 — approved external action authority + audit/idempotency metadata.
-- Extends the existing Agent action audit and action-run ledger. No new client write path.

alter table public.agent_action_audit_events
  drop constraint if exists agent_action_audit_events_domain_check;

alter table public.agent_action_audit_events
  add constraint agent_action_audit_events_domain_check
  check (domain in ('tasks','projects','studies','integrations'));

alter table public.agent_action_audit_events
  add column if not exists provider text
  check (provider is null or provider in ('gmail','google_calendar','google_drive'));

alter table public.agent_action_audit_events
  add column if not exists external_resource_ref text
  check (external_resource_ref is null or char_length(external_resource_ref) between 1 and 500);

alter table public.nexora_action_runs
  drop constraint if exists nexora_action_runs_status_check;

alter table public.nexora_action_runs
  add constraint nexora_action_runs_status_check
  check (status in ('applying','applied','failed','uncertain'));

alter table public.nexora_action_runs
  add column if not exists provider text
  check (provider is null or provider in ('gmail','google_calendar','google_drive'));

alter table public.nexora_action_runs
  add column if not exists external_resource_ref text
  check (external_resource_ref is null or char_length(external_resource_ref) between 1 and 500);

comment on column public.nexora_action_runs.external_resource_ref is
  'External provider resource/message reference for idempotent approved integration actions.';

comment on column public.nexora_action_runs.provider is
  'External provider used by an approved KIVRYN integration action.';
