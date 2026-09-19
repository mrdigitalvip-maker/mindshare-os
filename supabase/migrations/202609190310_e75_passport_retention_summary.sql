-- E75: Passport retention is derived from real owner activity, not a synthetic counter.
-- It counts meaningful Passport actions already persisted by the product:
-- lesson completions, vocabulary reviews, completed daily missions and completed role-play sessions.
-- No new mutable streak ledger is introduced, so retries cannot inflate retention.

create or replace function public.get_passport_retention_summary(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  today date;
  active_dates date[] := array[]::date[];
  activity_date date;
  previous_date date := null;
  expected_date date;
  current_streak integer := 0;
  longest_streak integer := 0;
  running_streak integer := 0;
  active_days_last_7 integer := 0;
  last_active_date date := null;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if p_track_id is null then
    raise exception 'language track required';
  end if;

  if not exists (
    select 1
    from public.passport_profiles p
    join public.studio_tracks t on t.id = p.track_id
    where p.user_id = uid
      and p.track_id = p_track_id
      and t.category = 'language'
      and t.active
  ) then
    raise exception 'passport profile not found for language track';
  end if;

  select coalesce(np.timezone, 'UTC')
  into tz
  from public.notification_preferences np
  where np.user_id = uid;

  tz := coalesce(tz, 'UTC');
  if not exists (select 1 from pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;
  today := (now() at time zone tz)::date;

  select coalesce(array_agg(d.activity_date order by d.activity_date), array[]::date[])
  into active_dates
  from (
    select (sp.completed_at at time zone tz)::date as activity_date
    from public.studio_progress sp
    join public.studio_lessons l on l.id = sp.lesson_id
    where sp.user_id = uid
      and l.track_id = p_track_id
      and sp.status = 'completed'
      and sp.completed_at is not null

    union

    select (r.reviewed_at at time zone tz)::date
    from public.passport_vocabulary_reviews r
    join public.passport_vocabulary v on v.id = r.vocabulary_id
    where v.user_id = uid
      and v.track_id = p_track_id

    union

    select m.mission_date
    from public.passport_daily_missions m
    where m.user_id = uid
      and m.track_id = p_track_id
      and m.status = 'completed'

    union

    select (s.completed_at at time zone tz)::date
    from public.passport_roleplay_sessions s
    where s.user_id = uid
      and s.track_id = p_track_id
      and s.status = 'completed'
      and s.completed_at is not null
  ) d
  where d.activity_date <= today;

  if coalesce(array_length(active_dates, 1), 0) > 0 then
    last_active_date := active_dates[array_upper(active_dates, 1)];

    foreach activity_date in array active_dates loop
      if previous_date is null or activity_date = previous_date + 1 then
        running_streak := running_streak + 1;
      else
        running_streak := 1;
      end if;
      longest_streak := greatest(longest_streak, running_streak);
      previous_date := activity_date;
    end loop;

    select count(*)::integer
    into active_days_last_7
    from unnest(active_dates) as d(value)
    where d.value between today - 6 and today;

    expected_date := case
      when today = any(active_dates) then today
      when (today - 1) = any(active_dates) then today - 1
      else null
    end;

    while expected_date is not null and expected_date = any(active_dates) loop
      current_streak := current_streak + 1;
      expected_date := expected_date - 1;
    end loop;
  end if;

  return jsonb_build_object(
    'currentStreak', current_streak,
    'longestStreak', longest_streak,
    'activeDaysLast7', active_days_last_7,
    'activeToday', today = any(active_dates),
    'lastActiveDate', last_active_date,
    'today', today
  );
end;
$$;

revoke all on function public.get_passport_retention_summary(uuid) from public;
grant execute on function public.get_passport_retention_summary(uuid) to authenticated;
