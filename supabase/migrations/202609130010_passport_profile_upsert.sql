-- KIVRYN Passport V1: atomic profile create/update.

alter table public.passport_profiles
  add constraint passport_profiles_goal_check
  check (goal in ('travel','work','study','conversation','culture')) not valid;

alter table public.passport_profiles
  validate constraint passport_profiles_goal_check;

create or replace function public.upsert_passport_profile(
  p_track_id uuid,
  p_goal text,
  p_native_locale text default null,
  p_travel_date date default null,
  p_daily_minutes integer default 15,
  p_plan_horizon_days integer default 90,
  p_is_primary boolean default true
)
returns public.passport_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.passport_profiles%rowtype;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.studio_tracks
    where id = p_track_id
      and category = 'language'
      and active
  ) then
    raise exception 'passport requires an active language track';
  end if;

  if p_goal not in ('travel','work','study','conversation','culture') then
    raise exception 'invalid passport goal';
  end if;

  if p_daily_minutes < 5 or p_daily_minutes > 180 then
    raise exception 'daily minutes must be between 5 and 180';
  end if;

  if p_plan_horizon_days < 7 or p_plan_horizon_days > 365 then
    raise exception 'plan horizon must be between 7 and 365 days';
  end if;

  if p_is_primary then
    update public.passport_profiles
    set is_primary = false,
        updated_at = now()
    where user_id = uid
      and is_primary
      and track_id <> p_track_id;
  end if;

  insert into public.passport_profiles(
    user_id,
    track_id,
    native_locale,
    goal,
    travel_date,
    daily_minutes,
    plan_horizon_days,
    is_primary
  ) values (
    uid,
    p_track_id,
    nullif(btrim(coalesce(p_native_locale, '')), ''),
    p_goal,
    p_travel_date,
    p_daily_minutes,
    p_plan_horizon_days,
    p_is_primary
  )
  on conflict(user_id, track_id) do update
    set native_locale = excluded.native_locale,
        goal = excluded.goal,
        travel_date = excluded.travel_date,
        daily_minutes = excluded.daily_minutes,
        plan_horizon_days = excluded.plan_horizon_days,
        is_primary = excluded.is_primary,
        updated_at = now()
  returning * into result;

  insert into public.studio_enrollments(
    user_id,
    track_id,
    level,
    target,
    daily_minutes,
    locale
  ) values (
    uid,
    p_track_id,
    case when result.current_level = 'A0' then 'beginner' else lower(result.current_level) end,
    p_goal,
    p_daily_minutes,
    result.native_locale
  )
  on conflict(user_id, track_id) do update
    set target = excluded.target,
        daily_minutes = excluded.daily_minutes,
        locale = excluded.locale,
        updated_at = now();

  return result;
end;
$$;

revoke all on function public.upsert_passport_profile(uuid, text, text, date, integer, integer, boolean) from public;
grant execute on function public.upsert_passport_profile(uuid, text, text, date, integer, integer, boolean) to authenticated;
