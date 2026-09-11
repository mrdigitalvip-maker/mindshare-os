-- KIVRYN-003: idempotent provisioning for fresh and repaired accounts.
-- Profiles are the only required account-owned rows; no fake user work is seeded.
create or replace function public.bootstrap_authenticated_user(p_full_name text default null, p_avatar_url text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  insert into public.profiles (id, full_name, avatar_url, onboarded)
  values (uid, nullif(left(btrim(p_full_name), 80), ''), nullif(btrim(p_avatar_url), ''), false)
  on conflict (id) do nothing;
end;
$$;
revoke all on function public.bootstrap_authenticated_user(text, text) from public, anon;
grant execute on function public.bootstrap_authenticated_user(text, text) to authenticated;

-- Normal sign-up path. The RPC above remains the repair path for partial accounts.
create or replace function public.handle_kivryn_auth_user_created() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, avatar_url, onboarded)
  values (new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')), ''), false)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_kivryn_auth_user_created() from public, anon, authenticated;
drop trigger if exists on_kivryn_auth_user_created on auth.users;
create trigger on_kivryn_auth_user_created after insert on auth.users
for each row execute function public.handle_kivryn_auth_user_created();
