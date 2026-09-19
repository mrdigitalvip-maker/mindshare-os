-- E72 — fail-closed Agent notification preference guard.
-- scheduled-agent-runs claims notification_deliveries before any in-app row or push send.
-- Rejecting only agent-run:* claims when the owner disabled Agents stops delivery without
-- changing Agent execution, approval, audit, or action state.

create or replace function public.guard_agent_notification_preference()
returns trigger
language plpgsql
security invoker
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
    raise exception using
      errcode = 'P0001',
      message = 'agent_notifications_disabled';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_agent_notification_preference() from public, anon, authenticated;
grant execute on function public.guard_agent_notification_preference() to service_role;

drop trigger if exists notification_deliveries_agent_preference_guard
  on public.notification_deliveries;

create trigger notification_deliveries_agent_preference_guard
before insert on public.notification_deliveries
for each row
execute function public.guard_agent_notification_preference();
