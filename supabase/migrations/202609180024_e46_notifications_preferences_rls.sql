-- E46 — Notifications + preferences RLS hardening.
-- Preserve exact roles and operation surfaces. This changes only auth.uid()
-- evaluation shape for planner efficiency.

drop policy if exists notification_select on public.notifications;
create policy notification_select
on public.notifications
for select
to public
using ((select auth.uid()) = user_id);

drop policy if exists notification_insert on public.notifications;
create policy notification_insert
on public.notifications
for insert
to public
with check ((select auth.uid()) = user_id);

drop policy if exists notification_update on public.notifications;
create policy notification_update
on public.notifications
for update
to public
using ((select auth.uid()) = user_id);

drop policy if exists "owner select" on public.notification_preferences;
create policy "owner select"
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.notification_preferences;
create policy "owner insert"
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.notification_preferences;
create policy "owner update"
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.notification_preferences;
create policy "owner delete"
on public.notification_preferences
for delete
to authenticated
using (user_id = (select auth.uid()));
