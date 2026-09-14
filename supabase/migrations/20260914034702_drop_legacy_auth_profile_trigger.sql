-- Remove the pre-KIVRYN auth.users profile trigger now that
-- on_kivryn_auth_user_created is the single canonical provisioning path.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
