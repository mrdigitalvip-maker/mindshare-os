-- Tester regression hardening: challenge creation/check-in must be retry-safe.

-- Collapse only exact duplicate ACTIVE challenges. Preserve the row with the
-- greatest progress, then the oldest canonical row. Historical completed or
-- abandoned challenges are intentionally untouched.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, lower(btrim(title)), category, period, metric,
                   target_value, starts_at, ends_at
      order by progress desc, created_at asc, id asc
    ) as duplicate_rank
  from public.personal_challenges
  where status = 'active'
)
delete from public.personal_challenges challenge
where challenge.id in (
  select id from ranked where duplicate_rank > 1
);

create unique index if not exists personal_challenges_active_exact_identity_uidx
on public.personal_challenges (
  user_id,
  lower(btrim(title)),
  category,
  period,
  metric,
  target_value,
  starts_at,
  ends_at
)
where status = 'active';

create or replace function public.create_personal_challenge(
  p_title text,
  p_description text,
  p_category text,
  p_period text,
  p_metric text,
  p_target_value integer,
  p_timezone text default 'UTC'::text,
  p_source text default 'manual'::text
)
returns public.personal_challenges
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  uid uuid := auth.uid();
  evidence text;
  bounds record;
  result public.personal_challenges;
  normalized_title text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  normalized_title := btrim(p_title);
  if nullif(normalized_title,'') is null or char_length(normalized_title) > 120 then raise exception 'invalid_title'; end if;
  if p_description is not null and char_length(p_description) > 500 then raise exception 'invalid_description'; end if;
  if p_category not in ('execution','study','fitness','wellbeing','journey','custom') then raise exception 'invalid_category'; end if;
  if p_period not in ('daily','weekly','monthly') then raise exception 'invalid_period'; end if;
  if p_metric not in ('task_completions','study_minutes','journey_missions','self_checkins') then raise exception 'invalid_metric'; end if;
  if p_target_value is null or p_target_value not between 1 and 10000 then raise exception 'invalid_target'; end if;
  if p_source not in ('manual','suggestion','assistant') then raise exception 'invalid_source'; end if;

  evidence := case when p_metric = 'self_checkins' then 'self_reported' else 'verified' end;
  select * into bounds
  from public.kivryn_challenge_period_bounds(p_period, p_timezone, statement_timestamp());

  -- Serialize retries/double taps for the same logical challenge.
  perform pg_advisory_xact_lock(
    hashtextextended(
      uid::text || ':challenge:' || lower(normalized_title) || ':' || p_category || ':' ||
      p_period || ':' || p_metric || ':' || p_target_value::text || ':' || bounds.starts_at::text,
      0
    )
  );

  select * into result
  from public.personal_challenges
  where user_id = uid
    and status = 'active'
    and lower(btrim(title)) = lower(normalized_title)
    and category = p_category
    and period = p_period
    and metric = p_metric
    and target_value = p_target_value
    and starts_at = bounds.starts_at
    and ends_at = bounds.ends_at
  order by created_at asc
  limit 1;

  if result.id is not null then
    return result;
  end if;

  if (select count(*) from public.personal_challenges where user_id = uid and status = 'active') >= 12 then
    raise exception 'active_challenge_limit';
  end if;

  insert into public.personal_challenges(
    user_id,title,description,category,period,metric,evidence_mode,target_value,reward_points,
    source,starts_at,ends_at
  ) values (
    uid,normalized_title,nullif(btrim(p_description),''),p_category,p_period,p_metric,evidence,
    p_target_value,public.kivryn_challenge_reward(p_period,evidence),p_source,bounds.starts_at,bounds.ends_at
  ) returning * into result;

  return result;
end;
$function$;

create or replace function public.check_in_personal_challenge(
  p_challenge uuid,
  p_local_date date
)
returns public.personal_challenges
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  uid uuid := auth.uid();
  challenge public.personal_challenges;
  tz text;
  today date;
  checkin_id uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select * into challenge
  from public.personal_challenges
  where id = p_challenge and user_id = uid
  for update;

  if challenge.id is null
     or challenge.status <> 'active'
     or challenge.metric <> 'self_checkins'
     or challenge.evidence_mode <> 'self_reported'
  then
    raise exception 'challenge_not_checkin_eligible';
  end if;

  select coalesce(timezone, 'UTC') into tz
  from public.notification_preferences
  where user_id = uid;
  tz := public.kivryn_challenge_timezone(coalesce(tz, 'UTC'));
  today := (statement_timestamp() at time zone tz)::date;

  if p_local_date is null or p_local_date < today - 1 or p_local_date > today + 1 then
    raise exception 'invalid_checkin_date';
  end if;
  if statement_timestamp() < challenge.starts_at or statement_timestamp() >= challenge.ends_at then
    raise exception 'challenge_not_active';
  end if;

  -- Retry/double-tap is a successful no-op. This keeps the operation
  -- idempotent and prevents the UI from showing a false save failure.
  if exists(
    select 1
    from public.personal_challenge_progress_events e
    where e.challenge_id = p_challenge
      and e.user_id = uid
      and e.source_type = 'self_checkin'
      and e.local_date = p_local_date
  ) then
    return challenge;
  end if;

  perform public.apply_personal_challenge_progress(
    uid,
    'self_checkins',
    1,
    'self_checkin',
    checkin_id,
    statement_timestamp(),
    p_local_date
  );

  select * into challenge
  from public.personal_challenges
  where id = p_challenge and user_id = uid;
  return challenge;
end;
$function$;
