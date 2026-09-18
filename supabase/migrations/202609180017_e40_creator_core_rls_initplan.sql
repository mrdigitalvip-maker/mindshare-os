-- E40 — Creator Core owner RLS initplan hardening.
-- Preserve authenticated owner-only ALL policies on creator_profiles and
-- creator_projects while evaluating auth.uid() once per statement.

drop policy if exists creator_profiles_owner_all on public.creator_profiles;
create policy creator_profiles_owner_all
on public.creator_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_projects_owner_all on public.creator_projects;
create policy creator_projects_owner_all
on public.creator_projects
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
