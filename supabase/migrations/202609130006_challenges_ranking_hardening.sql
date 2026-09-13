-- KIVRYN Challenges & Ranking V1 hardening.
-- Keep self-reported rewards motivational, but competitive ranking uses verified Momentum only.

create or replace function public.kivryn_study_challenge_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.completed = true then
      perform public.apply_personal_challenge_progress(
        new.user_id,
        'study_minutes',
        new.duration,
        'study_session',
        new.id,
        coalesce(new.created_at, statement_timestamp()),
        null
      );
    end if;
  elsif new.completed = true and old.completed is distinct from true then
    perform public.apply_personal_challenge_progress(
      new.user_id,
      'study_minutes',
      new.duration,
      'study_session',
      new.id,
      coalesce(new.created_at, statement_timestamp()),
      null
    );
  end if;
  return new;
end;
$$;
revoke all on function public.kivryn_study_challenge_progress() from public, anon, authenticated;

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

  if exists(
    select 1
    from public.personal_challenge_progress_events e
    where e.challenge_id = p_challenge
      and e.user_id = uid
      and e.source_type = 'self_checkin'
      and e.local_date = p_local_date
  ) then
    raise exception 'already_checked_in_today';
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
$$;
revoke all on function public.check_in_personal_challenge(uuid,date) from public, anon;
grant execute on function public.check_in_personal_challenge(uuid,date) to authenticated;

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

  select * into bounds
  from public.kivryn_challenge_period_bounds(p_period,p_timezone,statement_timestamp());

  select coalesce(p.ranking_opt_in,false)
         and p.visibility = 'community'
         and p.disabled_at is null
    into enabled
  from public.community_profiles p
  where p.user_id = uid;
  enabled := coalesce(enabled,false);

  with eligible_events as (
    select m.user_id, m.points
    from public.momentum_events m
    where m.created_at >= bounds.starts_at
      and m.created_at < bounds.ends_at
      and (
        m.event_type <> 'personal_challenge_completed'
        or exists(
          select 1
          from public.personal_challenges pc
          where pc.id = m.source_id
            and pc.user_id = m.user_id
            and pc.evidence_mode = 'verified'
        )
      )
  ), scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(e.points),0)::integer score
    from public.community_profiles p
    left join eligible_events e on e.user_id = p.user_id
    where p.visibility = 'community'
      and p.disabled_at is null
      and p.ranking_opt_in = true
      and p.show_momentum = true
    group by p.user_id,p.display_name,p.username,p.avatar_url
  ), ranked as (
    select *, dense_rank() over(order by score desc)::integer rank
    from scores
    where score > 0
  )
  select r.rank,r.score into my_rank,my_score
  from ranked r
  where r.user_id = uid;

  with eligible_events as (
    select m.user_id, m.points
    from public.momentum_events m
    where m.created_at >= bounds.starts_at
      and m.created_at < bounds.ends_at
      and (
        m.event_type <> 'personal_challenge_completed'
        or exists(
          select 1
          from public.personal_challenges pc
          where pc.id = m.source_id
            and pc.user_id = m.user_id
            and pc.evidence_mode = 'verified'
        )
      )
  ), scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(e.points),0)::integer score
    from public.community_profiles p
    left join eligible_events e on e.user_id = p.user_id
    where p.visibility = 'community'
      and p.disabled_at is null
      and p.ranking_opt_in = true
      and p.show_momentum = true
    group by p.user_id,p.display_name,p.username,p.avatar_url
  ), ranked as (
    select *, dense_rank() over(order by score desc)::integer rank
    from scores
    where score > 0
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
  from (
    select *
    from ranked
    order by rank,score desc,username nulls last
    limit safe_limit
  ) r;

  return jsonb_build_object(
    'period',p_period,
    'starts_at',bounds.starts_at,
    'ends_at',bounds.ends_at,
    'opted_in',enabled,
    'my_rank',my_rank,
    'my_score',coalesce(my_score,0),
    'entries',coalesce(entries,'[]'::jsonb),
    'score_basis','verified_momentum'
  );
end;
$$;
revoke all on function public.get_challenge_ranking(text,text,integer) from public, anon;
grant execute on function public.get_challenge_ranking(text,text,integer) to authenticated;
