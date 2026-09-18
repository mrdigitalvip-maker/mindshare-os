-- E51 — Activity Logs RLS initplan hardening.
-- Preserve the exact public SELECT + INSERT owner-only surface.

drop policy if exists activity_select on public.activity_logs;
create policy activity_select
on public.activity_logs
for select
to public
using ((select auth.uid()) = user_id);

drop policy if exists activity_insert on public.activity_logs;
create policy activity_insert
on public.activity_logs
for insert
to public
with check ((select auth.uid()) = user_id);
