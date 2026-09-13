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
  normalized text := lower(nullif(btrim(p_username), ''));
  last_update timestamptz;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if normalized = any(array['admin','administrator','kivryn','nexora','official','moderator','support','system'])
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
      nullif(btrim(p_display_name), ''),
      normalized,
      nullif(btrim(p_bio), ''),
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

revoke all on function public.upsert_community_profile(text,text,text,text,boolean,boolean,boolean) from public, anon;
grant execute on function public.upsert_community_profile(text,text,text,text,boolean,boolean,boolean) to authenticated;
