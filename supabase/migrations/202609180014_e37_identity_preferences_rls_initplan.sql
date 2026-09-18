-- E37 — Identity and Preferences RLS initplan hardening.
-- Preserve the exact existing owner-scoped behavior while evaluating auth.uid()
-- once per statement. No new CRUD capability or role is introduced.

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to public
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to public
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to public
using ((select auth.uid()) = id);

drop policy if exists preferences_select on public.user_preferences;
create policy preferences_select
on public.user_preferences
for select
to public
using ((select auth.uid()) = user_id);

drop policy if exists preferences_insert on public.user_preferences;
create policy preferences_insert
on public.user_preferences
for insert
to public
with check ((select auth.uid()) = user_id);

drop policy if exists preferences_update on public.user_preferences;
create policy preferences_update
on public.user_preferences
for update
to public
using ((select auth.uid()) = user_id);
