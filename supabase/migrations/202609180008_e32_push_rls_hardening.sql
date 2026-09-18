-- E32 — Notification owner-RLS hardening.
-- Equivalent authorization with initplan-safe auth.uid() evaluation.

drop policy if exists "owner select" on public.push_subscriptions;
create policy "owner select"
on public.push_subscriptions for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.push_subscriptions;
create policy "owner insert"
on public.push_subscriptions for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.push_subscriptions;
create policy "owner update"
on public.push_subscriptions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.push_subscriptions;
create policy "owner delete"
on public.push_subscriptions for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owners read push devices" on public.push_devices;
create policy "owners read push devices"
on public.push_devices for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owners register push devices" on public.push_devices;
create policy "owners register push devices"
on public.push_devices for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owners update push devices" on public.push_devices;
create policy "owners update push devices"
on public.push_devices for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owners remove push devices" on public.push_devices;
create policy "owners remove push devices"
on public.push_devices for delete to authenticated
using (user_id = (select auth.uid()));
