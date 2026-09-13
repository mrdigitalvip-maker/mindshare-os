-- KIVRYN Challenges & Ranking V1
-- Personal challenges are owner-private. Public ranking is explicit opt-in and exposes no auth UUID/email.

alter table public.community_profiles
  add column if not exists ranking_opt_in boolean not null default false;

alter table public.notification_preferences
  add column if not exists challenges_enabled boolean not null default true;

-- Personal challenge completion uses the existing Momentum economy.
alter table public.momentum_events
  drop constraint if exists momentum_events_event_type_check;
alter table public.momentum_events
  add constraint momentum_events_event_type_check
  check (event_type in ('mission_completed','weekly_challenge_completed','personal_challenge_completed'));

create table if not exists public.personal_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  category text not null check (category in ('execution','study','fitness','wellbeing','journey','custom')),
  period text not null check (period in ('daily','weekly','monthly')),
  metric text not null check (metric in ('task_completions','study_minutes','journey_missions','self_checkins')),
  evidence_mode text not null check (evidence_mode in ('verified','self_reported')),
  target_value integer not null check (target_value between 1 and 10000),
  progress integer not null default 0 check (progress >= 0),
  reward_points integer not null check (reward_points between 1 and 2000),
  source text not null default 'manual' check (source in ('manual','suggestion','assistant')),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (metric = 'self_checkins' and evidence_mode = 'self_reported') or
    (metric <> 'self_checkins' and evidence_mode = 'verified')
  )
);

create table if not exists public.personal_challenge_progress_events (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.personal_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('task','study_session','journey_mission','self_checkin')),
  source_id uuid not null,
  local_date date,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(challenge_id, source_type, source_id)
);

create unique index if not exists personal_challenge_one_self_checkin_per_day
  on public.personal_challenge_progress_events(challenge_id, local_date)
  where source_type = 'self_checkin' and local_date is not null;
create index if not exists personal_challenges_owner_status_idx
  on public.personal_challenges(user_id, status, ends_at);
create index if not exists personal_challenge_events_owner_idx
  on public.personal_challenge_progress_events(user_id, created_at desc);

alter table public.personal_challenges enable row level security;
alter table public.personal_challenge_progress_events enable row level security;

revoke all on public.personal_challenges, public.personal_challenge_progress_events from anon, authenticated;
grant select on public.personal_challenges to authenticated;
grant select on public.personal_challenge_progress_events to authenticated;

drop policy if exists personal_challenges_owner_select on public.personal_challenges;
create policy personal_challenges_owner_select on public.personal_challenges
  for select to authenticated using (user_id = auth.uid());
drop policy if exists personal_challenge_events_owner_select on public.personal_challenge_progress_events;
create policy personal_challenge_events_owner_select on public.personal_challenge_progress_events
  for select to authenticated using (user_id = auth.uid());

create or replace function public.kivryn_challenge_timezone(p_timezone text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when exists(select 1 from pg_catalog.pg_timezone_names where name = nullif(btrim(p_timezone), ''))
      then btrim(p_timezone)
    else 'UTC'
  end;
$$;
revoke all on function public.kivryn_challenge_timezone(text) from public, anon, authenticated;

create or replace function public.kivryn_challenge_period_bounds(
  p_period text,
  p_timezone text,
  p_now timestamptz default now()
)
returns table(starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  tz text := public.kivryn_challenge_timezone(p_timezone);
  local_now timestamp;
  local_start timestamp;
  local_end timestamp;
begin
  if p_period not in ('daily','weekly','monthly') then raise exception 'invalid_period'; end if;
  local_now := p_now at time zone tz;
  local_start := case p_period
    when 'daily' then date_trunc('day', local_now)
    when 'weekly' then date_trunc('week', local_now)
    else date_trunc('month', local_now)
  end;
  local_end := case p_period
    when 'daily' then local_start + interval '1 day'
    when 'weekly' then local_start + interval '1 week'
    else local_start + interval '1 month'
  end;
  return query select local_start at time zone tz, local_end at time zone tz;
end;
$$;
revoke all on function public.kivryn_challenge_period_bounds(text,text,timestamptz) from public, anon, authenticated;

create or replace function public.kivryn_challenge_reward(p_period text, p_evidence text)
returns integer
language sql
immutable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_evidence = 'verified' and p_period = 'daily' then 100
    when p_evidence = 'verified' and p_period = 'weekly' then 300
    when p_evidence = 'verified' and p_period = 'monthly' then 750
    when p_period = 'daily' then 60
    when p_period = 'weekly' then 180
    else 450
  end;
$$;
revoke all on function public.kivryn_challenge_reward(text,text) from public, anon, authenticated;

create or replace function public.create_personal_challenge(
  p_title text,
  p_description text,
  p_category text,
  p_period text,
  p_metric text,
  p_target_value integer,
  p_timezone text default 'UTC',
  p_source text default 'manual'
)
returns public.personal_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  evidence text;
  bounds record;
  result public.personal_challenges;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if p_description is not null and char_length(p_description) > 500 then raise exception 'invalid_description'; end if;
  if p_category not in ('execution','study','fitness','wellbeing','journey','custom') then raise exception 'invalid_category'; end if;
  if p_period not in ('daily','weekly','monthly') then raise exception 'invalid_period'; end if;
  if p_metric not in ('task_completions','study_minutes','journey_missions','self_checkins') then raise exception 'invalid_metric'; end if;
  if p_target_value is null or p_target_value not between 1 and 10000 then raise exception 'invalid_target'; end if;
  if p_source not in ('manual','suggestion','assistant') then raise exception 'invalid_source'; end if;
  if (select count(*) from public.personal_challenges where user_id = uid and status = 'active') >= 12 then
    raise exception 'active_challenge_limit';
  end if;

  -- Do not let a client label self-reported behavior as verified.
  evidence := case when p_metric = 'self_checkins' then 'self_reported' else 'verified' end;
  select * into bounds from public.kivryn_challenge_period_bounds(p_period, p_timezone, statement_timestamp());

  insert into public.personal_challenges(
    user_id,title,description,category,period,metric,evidence_mode,target_value,reward_points,
    source,starts_at,ends_at
  ) values (
    uid,btrim(p_title),nullif(btrim(p_description),''),p_category,p_period,p_metric,evidence,
    p_target_value,public.kivryn_challenge_reward(p_period,evidence),p_source,bounds.starts_at,bounds.ends_at
  ) returning * into result;
  return result;
end;
$$;
revoke all on function public.create_personal_challenge(text,text,text,text,text,integer,text,text) from public, anon;
grant execute on function public.create_personal_challenge(text,text,text,text,text,integer,text,text) to authenticated;

create or replace function public.get_personal_challenges()
returns setof public.personal_challenges
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.*
  from public.personal_challenges c
  where c.user_id = auth.uid()
  order by case c.status when 'active' then 0 when 'completed' then 1 else 2 end,
           c.ends_at asc, c.created_at desc;
$$;
revoke all on function public.get_personal_challenges() from public, anon;
grant execute on function public.get_personal_challenges() to authenticated;

create or replace function public.abandon_personal_challenge(p_challenge uuid)
returns public.personal_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare result public.personal_challenges;
begin
  update public.personal_challenges
  set status = 'abandoned', updated_at = statement_timestamp()
  where id = p_challenge and user_id = auth.uid() and status = 'active'
  returning * into result;
  if result.id is null then raise exception 'challenge_not_active'; end if;
  return result;
end;
$$;
revoke all on function public.abandon_personal_challenge(uuid) from public, anon;
grant execute on function public.abandon_personal_challenge(uuid) to authenticated;

create or replace function public.apply_personal_challenge_progress(
  p_user uuid,
  p_metric text,
  p_amount integer,
  p_source_type text,
  p_source_id uuid,
  p_occurred_at timestamptz default now(),
  p_local_date date default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  challenge public.personal_challenges;
  event_id uuid;
  new_progress integer;
begin
  if p_user is null or p_amount <= 0 or p_source_id is null then return; end if;
  for challenge in
    select * from public.personal_challenges
    where user_id = p_user
      and status = 'active'
      and metric = p_metric
      and p_occurred_at >= starts_at
      and p_occurred_at < ends_at
    for update
  loop
    event_id := null;
    insert into public.personal_challenge_progress_events(
      challenge_id,user_id,source_type,source_id,local_date,amount,created_at
    ) values (
      challenge.id,p_user,p_source_type,p_source_id,p_local_date,p_amount,p_occurred_at
    )
    on conflict do nothing
    returning id into event_id;
    if event_id is null then continue; end if;

    update public.personal_challenges
    set progress = least(target_value, progress + p_amount),
        updated_at = statement_timestamp()
    where id = challenge.id
    returning progress into new_progress;

    if new_progress >= challenge.target_value then
      update public.personal_challenges
      set status = 'completed', completed_at = coalesce(completed_at,p_occurred_at),
          updated_at = statement_timestamp()
      where id = challenge.id and status = 'active';

      if found then
        insert into public.momentum_events(user_id,source_type,source_id,event_type,points,created_at)
        values(p_user,'personal_challenge',challenge.id,'personal_challenge_completed',challenge.reward_points,p_occurred_at)
        on conflict(user_id,source_type,source_id,event_type) do nothing;

        insert into public.community_activity(actor_user_id,event_type,source_type,source_id,occurred_at)
        values(p_user,'challenge_completed','challenge',challenge.id,p_occurred_at)
        on conflict(actor_user_id,source_type,source_id,event_type) do nothing;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.apply_personal_challenge_progress(uuid,text,integer,text,uuid,timestamptz,date) from public, anon, authenticated;

create or replace function public.kivryn_task_challenge_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.completed = true and old.completed is distinct from true then
    perform public.apply_personal_challenge_progress(new.user_id,'task_completions',1,'task',new.id,statement_timestamp(),null);
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_task_challenge_progress() from public, anon, authenticated;
drop trigger if exists kivryn_task_challenge_progress on public.tasks;
create trigger kivryn_task_challenge_progress
after update of completed on public.tasks
for each row when (new.completed = true and old.completed is distinct from true)
execute function public.kivryn_task_challenge_progress();

create or replace function public.kivryn_study_challenge_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.completed = true and (tg_op = 'INSERT' or old.completed is distinct from true) then
    perform public.apply_personal_challenge_progress(new.user_id,'study_minutes',new.duration,'study_session',new.id,coalesce(new.created_at,statement_timestamp()),null);
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_study_challenge_progress() from public, anon, authenticated;
drop trigger if exists kivryn_study_challenge_progress_insert on public.study_sessions;
create trigger kivryn_study_challenge_progress_insert
after insert on public.study_sessions
for each row when (new.completed = true)
execute function public.kivryn_study_challenge_progress();
drop trigger if exists kivryn_study_challenge_progress_update on public.study_sessions;
create trigger kivryn_study_challenge_progress_update
after update of completed on public.study_sessions
for each row when (new.completed = true and old.completed is distinct from true)
execute function public.kivryn_study_challenge_progress();

create or replace function public.kivryn_journey_challenge_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.apply_personal_challenge_progress(new.user_id,'journey_missions',1,'journey_mission',new.id,coalesce(new.completed_at,statement_timestamp()),null);
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_journey_challenge_progress() from public, anon, authenticated;
drop trigger if exists kivryn_journey_challenge_progress on public.journey_missions;
create trigger kivryn_journey_challenge_progress
after update of status on public.journey_missions
for each row when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.kivryn_journey_challenge_progress();

create or replace function public.check_in_personal_challenge(p_challenge uuid, p_local_date date)
returns public.personal_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  challenge public.personal_challenges;
  tz text;
  today date;
  checkin_id uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into challenge from public.personal_challenges
  where id = p_challenge and user_id = uid for update;
  if challenge.id is null or challenge.status <> 'active' or challenge.metric <> 'self_checkins' then
    raise exception 'challenge_not_checkin_eligible';
  end if;
  select coalesce(timezone,'UTC') into tz from public.notification_preferences where user_id = uid;
  tz := public.kivryn_challenge_timezone(coalesce(tz,'UTC'));
  today := (statement_timestamp() at time zone tz)::date;
  if p_local_date is null or p_local_date < today - 1 or p_local_date > today + 1 then
    raise exception 'invalid_checkin_date';
  end if;
  if statement_timestamp() < challenge.starts_at or statement_timestamp() >= challenge.ends_at then
    raise exception 'challenge_not_active';
  end if;

  perform public.apply_personal_challenge_progress(uid,'self_checkins',1,'self_checkin',checkin_id,statement_timestamp(),p_local_date);
  select * into challenge from public.personal_challenges where id = p_challenge and user_id = uid;
  return challenge;
exception when unique_violation then
  raise exception 'already_checked_in_today';
end;
$$;
revoke all on function public.check_in_personal_challenge(uuid,date) from public, anon;
grant execute on function public.check_in_personal_challenge(uuid,date) to authenticated;

create or replace function public.get_personal_challenge_suggestions(p_local_date date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  open_tasks integer := 0;
  active_subjects integer := 0;
  active_journeys integer := 0;
  result jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_local_date is null or p_local_date < current_date - 1 or p_local_date > current_date + 1 then
    raise exception 'invalid_local_date';
  end if;
  select count(*) into open_tasks from public.tasks where user_id = uid and completed = false;
  select count(*) into active_subjects from public.study_subjects where user_id = uid and status = 'active';
  select count(*) into active_journeys from public.journeys where user_id = uid and status = 'active';

  if open_tasks > 0 then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','execution-daily','title','Sprint de execução','description','Conclua tarefas reais do seu sistema hoje.',
      'category','execution','period','daily','metric','task_completions','target_value',least(open_tasks,3),
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('daily','verified')
    ));
  end if;
  if active_subjects > 0 then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','study-weekly','title','Foco de aprendizado','description','Acumule minutos de estudo registrados na KIVRYN nesta semana.',
      'category','study','period','weekly','metric','study_minutes','target_value',90,
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('weekly','verified')
    ));
  end if;
  if active_journeys > 0 then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','journey-weekly','title','Avanço de Jornada','description','Complete missões verificadas das suas Jornadas nesta semana.',
      'category','journey','period','weekly','metric','journey_missions','target_value',3,
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('weekly','verified')
    ));
  end if;
  result := result || jsonb_build_array(
    jsonb_build_object(
      'key','fitness-weekly','title','Consistência física','description','Registre até um treino por dia. A evidência é declarada por você.',
      'category','fitness','period','weekly','metric','self_checkins','target_value',3,
      'evidence_mode','self_reported','reward_points',public.kivryn_challenge_reward('weekly','self_reported')
    ),
    jsonb_build_object(
      'key','wellbeing-daily','title','Reset diário','description','Faça uma ação intencional de bem-estar e confirme uma vez hoje.',
      'category','wellbeing','period','daily','metric','self_checkins','target_value',1,
      'evidence_mode','self_reported','reward_points',public.kivryn_challenge_reward('daily','self_reported')
    )
  );
  return result;
end;
$$;
revoke all on function public.get_personal_challenge_suggestions(date) from public, anon;
grant execute on function public.get_personal_challenge_suggestions(date) to authenticated;

create or replace function public.set_challenge_ranking_opt_in(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_enabled and not exists(
    select 1 from public.community_profiles
    where user_id = uid and visibility = 'community' and disabled_at is null
  ) then raise exception 'community_profile_required'; end if;
  update public.community_profiles
  set ranking_opt_in = p_enabled,
      show_momentum = case when p_enabled then true else show_momentum end,
      updated_at = statement_timestamp()
  where user_id = uid;
  if not found then raise exception 'community_profile_required'; end if;
  return p_enabled;
end;
$$;
revoke all on function public.set_challenge_ranking_opt_in(boolean) from public, anon;
grant execute on function public.set_challenge_ranking_opt_in(boolean) to authenticated;

create or replace function public.get_challenge_ranking(
  p_period text default 'weekly',
  p_timezone text default 'UTC',
  p_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  bounds record;
  safe_limit integer := least(greatest(coalesce(p_limit,25),1),50);
  enabled boolean := false;
  my_rank integer;
  my_score integer := 0;
  entries jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_period not in ('daily','weekly','monthly') then raise exception 'invalid_period'; end if;
  select * into bounds from public.kivryn_challenge_period_bounds(p_period,p_timezone,statement_timestamp());
  select coalesce(p.ranking_opt_in,false) and p.visibility = 'community' and p.disabled_at is null
    into enabled from public.community_profiles p where p.user_id = uid;
  enabled := coalesce(enabled,false);

  with scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(m.points),0)::integer score
    from public.community_profiles p
    left join public.momentum_events m
      on m.user_id = p.user_id and m.created_at >= bounds.starts_at and m.created_at < bounds.ends_at
    where p.visibility = 'community'
      and p.disabled_at is null
      and p.ranking_opt_in = true
      and p.show_momentum = true
    group by p.user_id,p.display_name,p.username,p.avatar_url
  ), ranked as (
    select *, dense_rank() over(order by score desc)::integer rank
    from scores where score > 0
  )
  select r.rank,r.score into my_rank,my_score from ranked r where r.user_id = uid;

  with scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(m.points),0)::integer score
    from public.community_profiles p
    left join public.momentum_events m
      on m.user_id = p.user_id and m.created_at >= bounds.starts_at and m.created_at < bounds.ends_at
    where p.visibility = 'community'
      and p.disabled_at is null
      and p.ranking_opt_in = true
      and p.show_momentum = true
    group by p.user_id,p.display_name,p.username,p.avatar_url
  ), ranked as (
    select *, dense_rank() over(order by score desc)::integer rank
    from scores where score > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',r.rank,
    'member_id',public.community_public_user_id(r.user_id),
    'display_name',coalesce(nullif(btrim(r.display_name),''),'Membro KIVRYN'),
    'username',r.username,
    'avatar_url',r.avatar_url,
    'score',r.score,
    'is_self',r.user_id = uid
  ) order by r.rank,r.score desc,r.username nulls last),'[]'::jsonb)
  into entries
  from (select * from ranked order by rank,score desc,username nulls last limit safe_limit) r;

  return jsonb_build_object(
    'period',p_period,
    'starts_at',bounds.starts_at,
    'ends_at',bounds.ends_at,
    'opted_in',enabled,
    'my_rank',my_rank,
    'my_score',coalesce(my_score,0),
    'entries',coalesce(entries,'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_challenge_ranking(text,text,integer) from public, anon;
grant execute on function public.get_challenge_ranking(text,text,integer) to authenticated;
