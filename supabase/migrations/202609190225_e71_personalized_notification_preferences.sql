-- E71 — Personalized notification domains.
-- Extend the existing notification_preferences row; do not create a parallel preference system.

alter table public.notification_preferences
  add column if not exists agents_enabled boolean not null default true,
  add column if not exists journeys_enabled boolean not null default true,
  add column if not exists community_enabled boolean not null default true,
  add column if not exists integrations_enabled boolean not null default true,
  add column if not exists approvals_enabled boolean not null default true,
  add column if not exists premium_enabled boolean not null default true;

comment on column public.notification_preferences.agents_enabled is
  'Allow KIVRYN Agent run/result reminders in the existing notification pipeline.';
comment on column public.notification_preferences.journeys_enabled is
  'Allow Journey mission reminders in the existing notification pipeline.';
comment on column public.notification_preferences.community_enabled is
  'Allow Community unread digests in the existing notification pipeline.';
comment on column public.notification_preferences.integrations_enabled is
  'Allow connection/integration-related notification context.';
comment on column public.notification_preferences.approvals_enabled is
  'Allow reminders for KIVRYN action plans waiting for explicit user approval.';
comment on column public.notification_preferences.premium_enabled is
  'Allow factual subscription lifecycle reminders; never authorizes a purchase.';

-- Preserve E58 fail-closed delivery ledger ownership.
revoke all privileges on table public.notification_deliveries from anon, authenticated;
