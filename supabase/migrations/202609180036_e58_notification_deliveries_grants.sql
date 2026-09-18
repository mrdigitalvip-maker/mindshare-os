-- E58 — Notification Deliveries server-owned grant hardening.
-- Keep the table fail-closed behind RLS and service-role/backend access only.

revoke all privileges on table public.notification_deliveries
  from anon, authenticated;
