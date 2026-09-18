-- E52 — Journeys residual RLS + FK index hardening.
-- Preserve authenticated ALL owner management for journeys and SELECT-only
-- owner access for momentum. Add the two remaining advisor-backed FK indexes.

create index if not exists journeys_source_pack_id_idx
  on public.journeys(source_pack_id);

create index if not exists momentum_events_journey_id_idx
  on public.momentum_events(journey_id);

drop policy if exists "owners manage journeys" on public.journeys;
create policy "owners manage journeys"
on public.journeys
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owners read momentum" on public.momentum_events;
create policy "owners read momentum"
on public.momentum_events
for select
to authenticated
using (user_id = (select auth.uid()));
