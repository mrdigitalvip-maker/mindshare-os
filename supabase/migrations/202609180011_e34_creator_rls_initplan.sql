-- E34 — Creator owner-select RLS initplan hardening.
-- Preserve exact authorization while evaluating auth.uid() once per statement.

drop policy if exists creator_analytics_content_owner_select on public.creator_analytics_content;
create policy creator_analytics_content_owner_select
on public.creator_analytics_content
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists creator_analytics_owner_select on public.creator_analytics_snapshots;
create policy creator_analytics_owner_select
on public.creator_analytics_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists creator_country_owner_select on public.creator_country_observations;
create policy creator_country_owner_select
on public.creator_country_observations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists creator_clips_owner_select on public.creator_clips;
create policy creator_clips_owner_select
on public.creator_clips
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.creator_projects p
    where p.id = creator_clips.project_id
      and p.user_id = (select auth.uid())
  )
);
