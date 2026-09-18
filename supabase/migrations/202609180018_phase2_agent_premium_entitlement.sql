-- Phase 2 regression closure — Agent Premium entitlement authority.
-- Preserve legacy Agents, but require canonical Premium/internal access for
-- new Agent creation and for re-activating an inactive Agent.

create or replace function public.enforce_agent_premium_entitlement()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  entitlement_required boolean := false;
begin
  if tg_op = 'INSERT' then
    entitlement_required := true;
  elsif tg_op = 'UPDATE' then
    entitlement_required :=
      old.user_id is distinct from new.user_id
      or (
        coalesce(new.active, false) = true
        and coalesce(old.active, false) = false
      );
  end if;

  if not entitlement_required then
    return new;
  end if;

  if public.has_premium(new.user_id)
     or public.has_internal_full_access(new.user_id) then
    return new;
  end if;

  raise exception using
    errcode = '42501',
    message = 'premium_required';
end;
$$;

revoke all on function public.enforce_agent_premium_entitlement()
  from public, anon, authenticated;

drop trigger if exists agents_premium_entitlement on public.agents;
create trigger agents_premium_entitlement
before insert or update of active, user_id
on public.agents
for each row
execute function public.enforce_agent_premium_entitlement();
