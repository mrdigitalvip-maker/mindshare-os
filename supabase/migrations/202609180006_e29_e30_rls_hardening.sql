-- E29/E30 — final owner-scope RLS hardening.
-- Subscription writes remain server-authoritative (Stripe/Google Play/service role).
-- Authenticated clients may only read their own subscription row.

drop policy if exists subscriptions_all on public.subscriptions;
drop policy if exists "owner read subscription" on public.subscriptions;
create policy "owner read subscription"
on public.subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists creator_connections_owner_select on public.creator_platform_connections;
create policy creator_connections_owner_select
on public.creator_platform_connections
for select
to authenticated
using (user_id = (select auth.uid()));
