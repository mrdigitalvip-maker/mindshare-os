-- E44 — Journeys read-path RLS + FK index hardening.
-- Preserve authenticated SELECT-only owner policies. Mutations remain
-- server-authoritative through the existing canonical RPCs.

create index if not exists journey_missions_journey_id_idx
  on public.journey_missions(journey_id);

create index if not exists journey_pack_starts_journey_id_idx
  on public.journey_pack_starts(journey_id);

create index if not exists journey_pack_starts_pack_id_idx
  on public.journey_pack_starts(pack_id);

create index if not exists journey_pack_step_instances_source_step_id_idx
  on public.journey_pack_step_instances(source_step_id);

drop policy if exists "owners read missions" on public.journey_missions;
create policy "owners read missions"
on public.journey_missions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owners read pack starts" on public.journey_pack_starts;
create policy "owners read pack starts"
on public.journey_pack_starts
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owners read instantiated steps" on public.journey_pack_step_instances;
create policy "owners read instantiated steps"
on public.journey_pack_step_instances
for select
to authenticated
using (user_id = (select auth.uid()));
