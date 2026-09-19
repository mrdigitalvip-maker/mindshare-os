-- E81 — Leaderboard authority hardening.
-- Ranking remains opt-in and based only on verified Momentum, but period
-- boundaries are now derived from the account timezone on the server.
-- The legacy p_timezone argument is retained for client compatibility and ignored.

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
  account_timezone text := 'UTC';
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_period not in ('daily','weekly','monthly') then raise exception 'invalid_period'; end if;

  -- Never trust a caller-supplied timezone for competitive period boundaries.
  select coalesce(np.timezone, p.timezone, 'UTC')
  into account_timezone
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.id = uid;

  account_timezone := public.kivryn_challenge_timezone(coalesce(account_timezone,'UTC'));
  select * into bounds
  from public.kivryn_challenge_period_bounds(
    p_period,
    account_timezone,
    statement_timestamp()
  );

  select coalesce(p.ranking_opt_in,false)
         and p.visibility = 'community'
         and p.disabled_at is null
  into enabled
  from public.community_profiles p
  where p.user_id = uid;
  enabled := coalesce(enabled,false);

  with scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(m.points),0)::integer score
    from public.community_profiles p
    left join public.momentum_events m
      on m.user_id = p.user_id
     and m.created_at >= bounds.starts_at
     and m.created_at < bounds.ends_at
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
  select r.rank,r.score
  into my_rank,my_score
  from ranked r
  where r.user_id = uid;

  with scores as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           coalesce(sum(m.points),0)::integer score
    from public.community_profiles p
    left join public.momentum_events m
      on m.user_id = p.user_id
     and m.created_at >= bounds.starts_at
     and m.created_at < bounds.ends_at
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
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank',r.rank,
        'member_id',public.community_public_user_id(r.user_id),
        'display_name',coalesce(nullif(btrim(r.display_name),''),'Membro KIVRYN'),
        'username',r.username,
        'avatar_url',r.avatar_url,
        'score',r.score,
        'is_self',r.user_id = uid
      )
      order by r.rank,r.score desc,r.username nulls last
    ),
    '[]'::jsonb
  )
  into entries
  from (
    select *
    from ranked
    order by rank,score desc,username nulls last
    limit safe_limit
  ) r;

  return jsonb_build_object(
    'period',p_period,
    'timezone',account_timezone,
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
