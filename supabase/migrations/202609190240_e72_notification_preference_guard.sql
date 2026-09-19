-- E72 — Enforce Agent notification preference at the server-owned delivery ledger.
-- scheduled-agent-runs claims notification_deliveries before in-app/push delivery.
-- Raising a check violation here suppresses Agent notifications without changing Agent execution.

create or replace function public.guard_notification_delivery_preferences()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dedupe_key like 'agent-run:%'
     and exists (
       select 1
       from public.notification_preferences p
       where p.user_id = new.user_id
         and p.agents_enabled = false
     )
  then
    raise exception 'notification domain disabled'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_notification_delivery_preferences() from public, anon, authenticated;

drop trigger if exists notification_delivery_preference_guard
  on public.notification_deliveries;

create trigger notification_delivery_preference_guard
before insert on public.notification_deliveries
for each row
execute function public.guard_notification_delivery_preferences();
