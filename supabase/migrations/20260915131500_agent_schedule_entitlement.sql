create or replace function public.configure_agent_schedule(
  p_agent_id uuid,
  p_frequency text,
  p_local_time time without time zone,
  p_weekdays smallint[],
  p_timezone text,
  p_prompt text,
  p_notify boolean default true
)
returns table (
  agent_id uuid,
  next_run_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  uid uuid := auth.uid();
  next_at timestamptz;
  clean_prompt text;
begin
  if uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if not (public.has_premium(uid) or public.has_internal_full_access(uid)) then
    raise exception using errcode = '42501', message = 'premium_required';
  end if;

  clean_prompt := btrim(coalesce(p_prompt, ''));
  if char_length(clean_prompt) < 1 or char_length(clean_prompt) > 12000 then
    raise exception using errcode = '22023', message = 'invalid_schedule_prompt';
  end if;

  next_at := public.kivryn_next_agent_run(
    p_frequency,
    p_local_time,
    case when p_frequency = 'weekly' then p_weekdays else null end,
    p_timezone,
    now()
  );

  return query
  update public.agents a
     set schedule_frequency = p_frequency,
         schedule_time = p_local_time,
         schedule_weekdays = case when p_frequency = 'weekly' then p_weekdays else null end,
         schedule_timezone = p_timezone,
         schedule_prompt = clean_prompt,
         notify_on_run = coalesce(p_notify, true),
         next_run_at = next_at,
         updated_at = now()
   where a.id = p_agent_id
     and a.user_id = uid
  returning a.id, a.next_run_at;

  if not found then
    raise exception using errcode = 'P0002', message = 'agent_not_found';
  end if;
end;
$$;

revoke all on function public.configure_agent_schedule(
  uuid,
  text,
  time without time zone,
  smallint[],
  text,
  text,
  boolean
) from public, anon;

grant execute on function public.configure_agent_schedule(
  uuid,
  text,
  time without time zone,
  smallint[],
  text,
  text,
  boolean
) to authenticated;
