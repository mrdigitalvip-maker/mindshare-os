-- E25 + E26 — Community Profile + Squads hardening
-- Keep Community V3 architecture intact; strengthen canonical profile and Squad RPCs.

create or replace function public.upsert_community_profile(
  p_display_name text,
  p_username text,
  p_bio text,
  p_visibility text,
  p_show_momentum boolean,
  p_show_streak boolean,
  p_show_activity boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  clean_name text := nullif(btrim(p_display_name), '');
  normalized text := lower(nullif(btrim(p_username), ''));
  clean_bio text := nullif(btrim(p_bio), '');
  last_update timestamptz;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if p_visibility is null or p_visibility not in ('private', 'community')
    then raise exception 'profile_invalid';
  end if;
  if p_show_momentum is null or p_show_streak is null or p_show_activity is null
    then raise exception 'profile_invalid';
  end if;
  if clean_name is not null and char_length(clean_name) > 60 then raise exception 'profile_invalid'; end if;
  if clean_bio is not null and char_length(clean_bio) > 240 then raise exception 'profile_invalid'; end if;
  if normalized is not null and normalized !~ '^[a-z][a-z0-9_]{2,29}$' then raise exception 'profile_invalid'; end if;
  if normalized = any(array['admin','administrator','kivryn','nexora','official','moderator','support','system'])
    then raise exception 'profile_invalid';
  end if;
  if p_visibility = 'community' and (clean_name is null or normalized is null)
    then raise exception 'profile_invalid';
  end if;

  select updated_at into last_update
  from public.community_profiles
  where user_id = uid;

  if last_update > statement_timestamp() - interval '5 seconds'
    then raise exception 'rate_limited';
  end if;

  begin
    insert into public.community_profiles(
      user_id, display_name, username, bio, visibility,
      show_momentum, show_streak, show_verified_activity
    )
    values(
      uid,
      clean_name,
      normalized,
      clean_bio,
      p_visibility::public.community_profile_visibility,
      p_show_momentum,
      p_show_streak,
      p_show_activity
    )
    on conflict(user_id) do update
      set display_name = excluded.display_name,
          username = excluded.username,
          bio = excluded.bio,
          visibility = excluded.visibility,
          show_momentum = excluded.show_momentum,
          show_streak = excluded.show_streak,
          show_verified_activity = excluded.show_verified_activity,
          updated_at = statement_timestamp();
  exception when unique_violation then
    raise exception 'username_taken';
  end;
end;
$$;

revoke all on function public.upsert_community_profile(text,text,text,text,boolean,boolean,boolean)
  from public, anon;
grant execute on function public.upsert_community_profile(text,text,text,text,boolean,boolean,boolean)
  to authenticated;

create or replace function public.create_squad(
  p_name text,
  p_description text default null,
  p_max_members integer default 8
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_description text := nullif(btrim(p_description), '');
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if not public.community_profile_ready(uid) then raise exception 'profile_required'; end if;
  if char_length(clean_name) not between 2 and 60 then raise exception 'squad_name_invalid'; end if;
  if clean_description is not null and char_length(clean_description) > 240
    then raise exception 'squad_description_invalid';
  end if;
  if p_max_members is null or p_max_members not between 2 and 20
    then raise exception 'squad_capacity_invalid';
  end if;
  if (
    select count(*)
    from public.squads
    where owner_id = uid
      and created_at > statement_timestamp() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited';
  end if;

  insert into public.squads(owner_id,name,description,max_members)
  values(uid,clean_name,clean_description,p_max_members)
  returning id into sid;

  insert into public.squad_members(squad_id,user_id,role)
  values(sid,uid,'owner');

  return sid;
end;
$$;

revoke all on function public.create_squad(text,text,integer) from public, anon;
grant execute on function public.create_squad(text,text,integer) to authenticated;

create or replace function public.create_squad_invite_v2(p_squad uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  uid uuid := auth.uid();
  token text;
  token_hash text;
  expires timestamptz := statement_timestamp() + interval '7 days';
  cap integer;
  current_count integer;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if not public.community_profile_ready(uid) then raise exception 'profile_required'; end if;

  select s.max_members into cap
  from public.squads s
  join public.squad_members mine
    on mine.squad_id = s.id
   and mine.user_id = uid
   and mine.role = 'owner'
  where s.id = p_squad
    and s.closed_at is null
  for update of s;

  if cap is null then raise exception 'forbidden'; end if;

  select count(*) into current_count
  from public.squad_members
  where squad_id = p_squad;

  if current_count >= cap then raise exception 'squad_full'; end if;

  if (
    select count(*)
    from public.squad_invites
    where invited_by = uid
      and created_at > statement_timestamp() - interval '1 hour'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;

  token := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  token_hash := encode(extensions.digest(token,'sha256'),'hex');

  insert into public.squad_invites(squad_id,invited_by,code_hash,expires_at)
  values(p_squad,uid,token_hash,expires);

  return jsonb_build_object('code', token, 'expires_at', expires);
end;
$$;

revoke all on function public.create_squad_invite_v2(uuid) from public, anon;
grant execute on function public.create_squad_invite_v2(uuid) to authenticated;

create or replace function public.create_squad_invite(p_squad uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  payload jsonb;
begin
  payload := public.create_squad_invite_v2(p_squad);
  return payload->>'code';
end;
$$;

revoke all on function public.create_squad_invite(uuid) from public, anon;
grant execute on function public.create_squad_invite(uuid) to authenticated;

create or replace function public.accept_squad_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  uid uuid := auth.uid();
  inv public.squad_invites;
  cap integer;
  current_count integer;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if not public.community_profile_ready(uid) then raise exception 'profile_required'; end if;
  if nullif(btrim(p_code), '') is null then raise exception 'invite_invalid'; end if;

  select * into inv
  from public.squad_invites
  where code_hash = encode(extensions.digest(upper(btrim(p_code)),'sha256'),'hex')
  for update;

  if inv.id is null then raise exception 'invite_invalid'; end if;
  if inv.status = 'accepted' and inv.accepted_by = uid then return inv.squad_id; end if;
  if inv.status <> 'pending' or inv.expires_at <= statement_timestamp()
    then raise exception 'invite_expired';
  end if;
  if public.community_is_blocked(uid,inv.invited_by) then raise exception 'blocked'; end if;

  select max_members into cap
  from public.squads
  where id = inv.squad_id
    and closed_at is null
  for update;

  if cap is null then raise exception 'squad_not_found'; end if;

  if exists(
    select 1
    from public.squad_members
    where squad_id = inv.squad_id
      and user_id = uid
  ) then
    raise exception 'already_member';
  end if;

  select count(*) into current_count
  from public.squad_members
  where squad_id = inv.squad_id;

  if current_count >= cap then raise exception 'squad_full'; end if;

  insert into public.squad_members(squad_id,user_id,role)
  values(inv.squad_id,uid,'member');

  update public.squad_invites
  set status='accepted',
      accepted_at=statement_timestamp(),
      accepted_by=uid
  where id=inv.id;

  return inv.squad_id;
end;
$$;

revoke all on function public.accept_squad_invite(text) from public, anon;
grant execute on function public.accept_squad_invite(text) to authenticated;

create or replace function public.get_squad_detail(p_squad uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
 select jsonb_build_object(
  'id',s.id,
  'name',s.name,
  'description',s.description,
  'max_members',s.max_members,
  'member_count',(select count(*) from public.squad_members total where total.squad_id=s.id),
  'role',mine.role,
  'members',coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id',m.user_id,
        'role',m.role,
        'joined_at',m.joined_at,
        'display_name',coalesce(p.display_name,'Membro KIVRYN'),
        'avatar_url',p.avatar_url,
        'is_self',m.user_id=auth.uid()
      )
      order by m.role desc,m.joined_at
    )
    from public.squad_members m
    left join public.community_profiles p on p.user_id=m.user_id
    where m.squad_id=s.id
      and not public.community_is_blocked(auth.uid(),m.user_id)
  ),'[]'::jsonb)
 )
 from public.squads s
 join public.squad_members mine
   on mine.squad_id=s.id
  and mine.user_id=auth.uid()
 where s.id=p_squad
   and s.closed_at is null;
$$;

revoke all on function public.get_squad_detail(uuid) from public, anon;
grant execute on function public.get_squad_detail(uuid) to authenticated;
