-- E82 — 90-day legitimate activity reward.
-- One server-recorded activity day counts at most once. The reward never
-- overwrites Stripe/Google Play rows and never creates recurring billing.

create table if not exists public.premium_reward_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  source_types text[] not null default '{}'::text[],
  first_event_at timestamptz not null default statement_timestamp(),
  last_event_at timestamptz not null default statement_timestamp(),
  primary key (user_id, activity_date)
);

create table if not exists public.premium_activity_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  reward_type text not null default 'premium_30_days',
  eligibility_date date not null,
  eligibility_days integer not null default 90 check (eligibility_days = 90),
  granted_at timestamptz not null default statement_timestamp(),
  redeemed_at timestamptz not null default statement_timestamp(),
  starts_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  source text not null default 'kivryn_90_day_activity',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  unique (user_id, reward_key),
  check (reward_key = 'activity_90_day_v1'),
  check (reward_type = 'premium_30_days'),
  check (expires_at > starts_at)
);

create index if not exists premium_activity_rewards_active_idx
  on public.premium_activity_rewards(user_id, expires_at);

alter table public.premium_reward_activity_days enable row level security;
alter table public.premium_activity_rewards enable row level security;

-- These ledgers are intentionally RPC-only. Authenticated clients have no
-- direct SELECT/INSERT/UPDATE/DELETE policies.
revoke all on public.premium_reward_activity_days from anon, authenticated;
revoke all on public.premium_activity_rewards from anon, authenticated;

create or replace function public.kivryn_reward_timezone(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  tz text := 'UTC';
begin
  select coalesce(np.timezone, p.timezone, 'UTC')
  into tz
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.id = p_user;

  if tz is null or not exists (select 1 from pg_timezone_names where name = tz) then
    return 'UTC';
  end if;
  return tz;
end;
$$;
revoke all on function public.kivryn_reward_timezone(uuid) from public, anon, authenticated;

create or replace function public.record_premium_reward_activity(
  p_user uuid,
  p_source text,
  p_occurred_at timestamptz default statement_timestamp()
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tz text;
  local_day date;
  normalized_source text;
begin
  if p_user is null then return; end if;
  normalized_source := nullif(btrim(coalesce(p_source,'')),'');
  if normalized_source is null then return; end if;
  tz := public.kivryn_reward_timezone(p_user);
  local_day := (coalesce(p_occurred_at, statement_timestamp()) at time zone tz)::date;

  insert into public.premium_reward_activity_days(
    user_id, activity_date, source_types, first_event_at, last_event_at
  )
  values(
    p_user,
    local_day,
    array[normalized_source],
    coalesce(p_occurred_at,statement_timestamp()),
    coalesce(p_occurred_at,statement_timestamp())
  )
  on conflict(user_id,activity_date) do update
  set source_types = case
        when normalized_source = any(public.premium_reward_activity_days.source_types)
          then public.premium_reward_activity_days.source_types
        else public.premium_reward_activity_days.source_types || normalized_source
      end,
      first_event_at = least(
        public.premium_reward_activity_days.first_event_at,
        excluded.first_event_at
      ),
      last_event_at = greatest(
        public.premium_reward_activity_days.last_event_at,
        excluded.last_event_at
      );
end;
$$;
revoke all on function public.record_premium_reward_activity(uuid,text,timestamptz)
  from public, anon, authenticated;

create or replace function public.kivryn_reward_task_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.completed = true and old.completed is distinct from true then
    perform public.record_premium_reward_activity(
      new.user_id,'task_completion',statement_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_reward_task_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_task_activity on public.tasks;
create trigger kivryn_reward_task_activity
after update of completed on public.tasks
for each row
when (new.completed = true and old.completed is distinct from true)
execute function public.kivryn_reward_task_activity();

create or replace function public.kivryn_reward_study_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.completed = true and (tg_op = 'INSERT' or old.completed is distinct from true) then
    perform public.record_premium_reward_activity(
      new.user_id,'study_session',statement_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_reward_study_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_study_activity_insert on public.study_sessions;
create trigger kivryn_reward_study_activity_insert
after insert on public.study_sessions
for each row
when (new.completed = true)
execute function public.kivryn_reward_study_activity();
drop trigger if exists kivryn_reward_study_activity_update on public.study_sessions;
create trigger kivryn_reward_study_activity_update
after update of completed on public.study_sessions
for each row
when (new.completed = true and old.completed is distinct from true)
execute function public.kivryn_reward_study_activity();

create or replace function public.kivryn_reward_journey_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.record_premium_reward_activity(
      new.user_id,'journey_mission',statement_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_reward_journey_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_journey_activity on public.journey_missions;
create trigger kivryn_reward_journey_activity
after update of status on public.journey_missions
for each row
when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.kivryn_reward_journey_activity();

create or replace function public.kivryn_reward_studio_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.record_premium_reward_activity(
    new.user_id,'studio_learning',statement_timestamp()
  );
  return new;
end;
$$;
revoke all on function public.kivryn_reward_studio_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_studio_activity on public.studio_activity;
create trigger kivryn_reward_studio_activity
after insert on public.studio_activity
for each row execute function public.kivryn_reward_studio_activity();

create or replace function public.kivryn_reward_vocabulary_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid;
begin
  select v.user_id into owner_id
  from public.passport_vocabulary v
  where v.id = new.vocabulary_id;
  if owner_id is not null then
    perform public.record_premium_reward_activity(
      owner_id,'passport_vocabulary',statement_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_reward_vocabulary_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_vocabulary_activity on public.passport_vocabulary_reviews;
create trigger kivryn_reward_vocabulary_activity
after insert on public.passport_vocabulary_reviews
for each row execute function public.kivryn_reward_vocabulary_activity();

create or replace function public.kivryn_reward_roleplay_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.record_premium_reward_activity(
      new.user_id,'passport_roleplay',statement_timestamp()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_reward_roleplay_activity() from public, anon, authenticated;
drop trigger if exists kivryn_reward_roleplay_activity on public.passport_roleplay_sessions;
create trigger kivryn_reward_roleplay_activity
after update of status on public.passport_roleplay_sessions
for each row
when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.kivryn_reward_roleplay_activity();

-- Keep provider subscription semantics isolated so a reward never overwrites
-- or masquerades as a paid Stripe/Google Play subscription row.
create or replace function public.has_subscription_premium(
  p_user uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from public.subscriptions s
    where s.user_id = p_user
      and s.entitlement = 'premium'
      and (
        (
          s.provider = 'google_play'
          and s.status in ('active','grace_period','canceled')
          and s.current_period_end is not null
          and s.current_period_end > p_at
        )
        or
        (
          s.provider = 'stripe'
          and s.status in ('active','trialing')
          and (s.current_period_end is null or s.current_period_end > p_at)
        )
        or
        (
          s.provider = 'manual'
          and s.status in ('active','trialing')
          and (s.current_period_end is null or s.current_period_end > p_at)
        )
      )
  );
$$;
revoke all on function public.has_subscription_premium(uuid,timestamptz)
  from public, anon, authenticated;

create or replace function public.has_premium(
  p_user uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.has_subscription_premium(p_user,p_at)
    or exists(
      select 1
      from public.premium_activity_rewards r
      where r.user_id = p_user
        and r.reward_key = 'activity_90_day_v1'
        and r.starts_at <= p_at
        and r.expires_at > p_at
    );
$$;

create or replace function public.get_premium_activity_reward_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  today date;
  previous_date date := null;
  activity_date date;
  running_streak integer := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  last_active_date date := null;
  qualification_date date := null;
  reward public.premium_activity_rewards;
  claimed boolean := false;
  reward_active boolean := false;
  paid_or_internal boolean := false;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  tz := public.kivryn_reward_timezone(uid);
  today := (statement_timestamp() at time zone tz)::date;

  for activity_date in
    select d.activity_date
    from public.premium_reward_activity_days d
    where d.user_id = uid and d.activity_date <= today
    order by d.activity_date
  loop
    if previous_date is null or activity_date = previous_date + 1 then
      running_streak := running_streak + 1;
    else
      running_streak := 1;
    end if;
    longest_streak := greatest(longest_streak,running_streak);
    if qualification_date is null and running_streak >= 90 then
      qualification_date := activity_date;
    end if;
    previous_date := activity_date;
    last_active_date := activity_date;
  end loop;

  if last_active_date is not null and last_active_date >= today - 1 then
    current_streak := running_streak;
  else
    current_streak := 0;
  end if;

  select *
  into reward
  from public.premium_activity_rewards r
  where r.user_id = uid
    and r.reward_key = 'activity_90_day_v1'
  limit 1;

  claimed := reward.id is not null;
  reward_active := claimed
    and reward.starts_at <= statement_timestamp()
    and reward.expires_at > statement_timestamp();
  paid_or_internal :=
    public.has_subscription_premium(uid,statement_timestamp())
    or public.has_internal_full_access(uid);

  return jsonb_build_object(
    'rewardKey','activity_90_day_v1',
    'daysRequired',90,
    'currentStreak',current_streak,
    'longestStreak',longest_streak,
    'daysRemaining',case
      when qualification_date is not null then 0
      else greatest(0,90-current_streak)
    end,
    'lastActiveDate',last_active_date,
    'qualificationDate',qualification_date,
    'eligible',qualification_date is not null,
    'canClaim',qualification_date is not null and not claimed and not paid_or_internal,
    'claimed',claimed,
    'active',reward_active,
    'claimedAt',case when claimed then reward.granted_at else null end,
    'redeemedAt',case when claimed then reward.redeemed_at else null end,
    'startsAt',case when claimed then reward.starts_at else null end,
    'expiresAt',case when claimed then reward.expires_at else null end,
    'source',case when claimed then reward.source else 'kivryn_90_day_activity' end,
    'autoRenews',false
  );
end;
$$;
revoke all on function public.get_premium_activity_reward_status() from public, anon;
grant execute on function public.get_premium_activity_reward_status() to authenticated;

create or replace function public.claim_premium_activity_reward()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  reward_status jsonb;
  qualification_date date;
  granted_at timestamptz := statement_timestamp();
begin
  if uid is null then raise exception 'authentication_required'; end if;

  -- Serialize claims for one user without granting clients any ledger write.
  perform 1 from public.profiles p where p.id = uid for update;
  if not found then raise exception 'profile_required'; end if;

  if exists(
    select 1 from public.premium_activity_rewards r
    where r.user_id = uid and r.reward_key = 'activity_90_day_v1'
  ) then
    return public.get_premium_activity_reward_status();
  end if;

  reward_status := public.get_premium_activity_reward_status();
  if coalesce((reward_status->>'eligible')::boolean,false) is not true then
    raise exception 'reward_not_eligible';
  end if;
  if public.has_subscription_premium(uid,granted_at)
     or public.has_internal_full_access(uid) then
    raise exception 'premium_already_active';
  end if;

  qualification_date := (reward_status->>'qualificationDate')::date;

  insert into public.premium_activity_rewards(
    user_id,
    reward_key,
    reward_type,
    eligibility_date,
    eligibility_days,
    granted_at,
    redeemed_at,
    starts_at,
    expires_at,
    source,
    metadata
  )
  values(
    uid,
    'activity_90_day_v1',
    'premium_30_days',
    qualification_date,
    90,
    granted_at,
    granted_at,
    granted_at,
    granted_at + interval '30 days',
    'kivryn_90_day_activity',
    jsonb_build_object(
      'billing_created',false,
      'auto_renews',false,
      'qualification_streak_days',90
    )
  )
  on conflict(user_id,reward_key) do nothing;

  return public.get_premium_activity_reward_status();
end;
$$;
revoke all on function public.claim_premium_activity_reward() from public, anon;
grant execute on function public.claim_premium_activity_reward() to authenticated;

create or replace function public.get_subscription_runtime()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  sub public.subscriptions;
  subscription_premium boolean := false;
  reward_status jsonb := '{}'::jsonb;
  activity_reward_premium boolean := false;
  internal_access boolean := false;
  effective_premium boolean := false;
  effective_provider text;
  effective_status text;
  effective_period_end timestamptz;
  effective_cancel_at_end boolean := false;
  effective_source text := 'subscriptions';
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select *
  into sub
  from public.subscriptions s
  where s.user_id = uid
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;

  subscription_premium := public.has_subscription_premium(uid);
  reward_status := public.get_premium_activity_reward_status();
  activity_reward_premium := coalesce((reward_status->>'active')::boolean,false);
  internal_access := public.has_internal_full_access(uid);
  effective_premium := subscription_premium or activity_reward_premium or internal_access;

  if subscription_premium then
    effective_provider := sub.provider;
    effective_status := sub.status;
    effective_period_end := sub.current_period_end;
    effective_cancel_at_end := coalesce(sub.cancel_at_period_end,false);
    effective_source := 'subscriptions';
  elsif activity_reward_premium then
    effective_provider := 'manual';
    effective_status := 'active';
    effective_period_end := (reward_status->>'expiresAt')::timestamptz;
    effective_cancel_at_end := true;
    effective_source := 'activity_reward';
  elsif internal_access then
    effective_provider := sub.provider;
    effective_status := coalesce(sub.status,'active');
    effective_period_end := sub.current_period_end;
    effective_cancel_at_end := coalesce(sub.cancel_at_period_end,false);
    effective_source := 'internal_override';
  else
    effective_provider := sub.provider;
    effective_status := sub.status;
    effective_period_end := sub.current_period_end;
    effective_cancel_at_end := coalesce(sub.cancel_at_period_end,false);
    effective_source := 'subscriptions';
  end if;

  return jsonb_build_object(
    'is_premium',effective_premium,
    'subscription_premium',subscription_premium,
    'activity_reward_premium',activity_reward_premium,
    'internal_access',internal_access,
    'effective_entitlement',case when effective_premium then 'premium' else 'free' end,
    'provider',effective_provider,
    'status',effective_status,
    'plan',case when effective_premium then 'pro' else 'free' end,
    'current_period_end',effective_period_end,
    'cancel_at_period_end',effective_cancel_at_end,
    'source',effective_source,
    'activity_reward',reward_status
  );
end;
$$;

revoke all on function public.get_subscription_runtime() from public, anon;
grant execute on function public.get_subscription_runtime() to authenticated;
