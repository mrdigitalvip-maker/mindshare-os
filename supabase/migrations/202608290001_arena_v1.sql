-- Arena V1: authenticated, idempotent participation and an owner-safe read model.
-- Ranking is deliberately omitted until explicit public-profile/privacy semantics exist.
create or replace function public.join_arena_challenge(p_challenge uuid)
returns public.user_challenges language plpgsql security definer
set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid(); result public.user_challenges;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_challenge is null then raise exception 'challenge_required'; end if;
  if not exists (select 1 from public.challenges c where c.id = p_challenge and c.active
    and statement_timestamp() >= c.starts_at and statement_timestamp() < c.ends_at)
  then raise exception 'challenge_not_joinable'; end if;
  insert into public.user_challenges(user_id, challenge_id, progress) values(uid, p_challenge, 0)
  on conflict (user_id, challenge_id) do nothing;
  select uc.* into result from public.user_challenges uc where uc.user_id = uid and uc.challenge_id = p_challenge;
  return result;
end $$;
revoke all on function public.join_arena_challenge(uuid) from public;
grant execute on function public.join_arena_challenge(uuid) to authenticated;

create or replace function public.get_arena_challenges()
returns table(id uuid, slug text, title text, description text, type text, target_value integer,
  reward_points integer, starts_at timestamptz, ends_at timestamptz, active boolean,
  progress integer, joined_at timestamptz, completed_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  return query select c.id, c.slug, c.title, c.description, c.type, c.target_value,
    c.reward_points, c.starts_at, c.ends_at, c.active,
    least(coalesce(uc.progress, 0), c.target_value), uc.joined_at, uc.completed_at
  from public.challenges c left join public.user_challenges uc
    on uc.challenge_id = c.id and uc.user_id = uid
  where c.active or uc.user_id = uid
  order by case when c.active and statement_timestamp() < c.ends_at then 0 else 1 end,
    c.ends_at asc, c.id asc;
end $$;
revoke all on function public.get_arena_challenges() from public;
grant execute on function public.get_arena_challenges() to authenticated;
