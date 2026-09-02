-- R10: finish Pack Journeys atomically through the existing verified mission contract.
-- Deployment is intentionally manual. The client never writes step, Journey, or Momentum state.
create or replace function public.complete_journey_action(p_mission uuid)
returns public.journey_missions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  result public.journey_missions;
  changed_step uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select m.* into result
  from public.journey_missions m
  join public.journeys j on j.id = m.journey_id
  where m.id = p_mission and m.user_id = uid and j.user_id = uid
    and j.status = 'active' and m.source_type = 'journey_action'
  for update of m;

  if result.id is null then raise exception 'mission_not_confirmable'; end if;
  if result.status = 'completed' then return result; end if;
  if result.status not in ('pending', 'active') then raise exception 'mission_not_confirmable'; end if;

  update public.journey_pack_step_instances
  set completed_at = coalesce(completed_at, statement_timestamp())
  where id = result.source_id and user_id = uid and journey_id = result.journey_id
  returning id into changed_step;
  if changed_step is null then raise exception 'pack_step_not_found'; end if;

  update public.journey_missions
  set status = 'completed', completed_at = statement_timestamp(), updated_at = statement_timestamp()
  where id = result.id returning * into result;

  if not exists (
    select 1 from public.journey_pack_step_instances
    where user_id = uid and journey_id = result.journey_id and completed_at is null
  ) then
    update public.journeys
    set status = 'completed', updated_at = statement_timestamp()
    where id = result.journey_id and user_id = uid and status = 'active';
  end if;

  perform public.apply_verified_mission_effects(result);
  return result;
end $$;

revoke all on function public.complete_journey_action(uuid) from public;
grant execute on function public.complete_journey_action(uuid) to authenticated;
