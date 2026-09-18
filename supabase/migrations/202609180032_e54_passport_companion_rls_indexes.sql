-- E54 — Passport companion RLS + FK index hardening.
-- Preserve each existing operation/role exactly while making owner checks
-- initplan-safe. Add only missing leading FK indexes.

create index if not exists passport_daily_missions_track_id_idx
  on public.passport_daily_missions(track_id);
create index if not exists passport_placement_attempts_track_id_idx
  on public.passport_placement_attempts(track_id);
create index if not exists passport_roleplay_sessions_track_id_idx
  on public.passport_roleplay_sessions(track_id);
create index if not exists passport_vocabulary_source_lesson_id_idx
  on public.passport_vocabulary(source_lesson_id);
create index if not exists passport_vocabulary_track_id_idx
  on public.passport_vocabulary(track_id);

drop policy if exists "passport missions owner select" on public.passport_daily_missions;
create policy "passport missions owner select"
on public.passport_daily_missions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport missions owner insert" on public.passport_daily_missions;
create policy "passport missions owner insert"
on public.passport_daily_missions
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "passport missions owner update" on public.passport_daily_missions;
create policy "passport missions owner update"
on public.passport_daily_missions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "passport missions owner delete" on public.passport_daily_missions;
create policy "passport missions owner delete"
on public.passport_daily_missions
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport placement owner select" on public.passport_placement_attempts;
create policy "passport placement owner select"
on public.passport_placement_attempts
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport placement owner insert" on public.passport_placement_attempts;
create policy "passport placement owner insert"
on public.passport_placement_attempts
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "passport roleplay owner select" on public.passport_roleplay_sessions;
create policy "passport roleplay owner select"
on public.passport_roleplay_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport roleplay owner insert" on public.passport_roleplay_sessions;
create policy "passport roleplay owner insert"
on public.passport_roleplay_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "passport roleplay owner update" on public.passport_roleplay_sessions;
create policy "passport roleplay owner update"
on public.passport_roleplay_sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "passport roleplay owner delete" on public.passport_roleplay_sessions;
create policy "passport roleplay owner delete"
on public.passport_roleplay_sessions
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport vocabulary owner select" on public.passport_vocabulary;
create policy "passport vocabulary owner select"
on public.passport_vocabulary
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport vocabulary owner insert" on public.passport_vocabulary;
create policy "passport vocabulary owner insert"
on public.passport_vocabulary
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "passport vocabulary owner update" on public.passport_vocabulary;
create policy "passport vocabulary owner update"
on public.passport_vocabulary
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "passport vocabulary owner delete" on public.passport_vocabulary;
create policy "passport vocabulary owner delete"
on public.passport_vocabulary
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport vocabulary reviews owner select" on public.passport_vocabulary_reviews;
create policy "passport vocabulary reviews owner select"
on public.passport_vocabulary_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.passport_vocabulary v
    where v.id = passport_vocabulary_reviews.vocabulary_id
      and v.user_id = (select auth.uid())
  )
);
