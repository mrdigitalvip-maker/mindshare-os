-- E43 — Studio RLS + FK index hardening.
-- Preserve authenticated owner CRUD semantics while evaluating auth.uid()
-- once per statement. Add only missing leading FK indexes.

create index if not exists studio_activity_lesson_id_idx
  on public.studio_activity(lesson_id);
create index if not exists studio_activity_track_id_idx
  on public.studio_activity(track_id);
create index if not exists studio_enrollments_track_id_idx
  on public.studio_enrollments(track_id);
create index if not exists studio_progress_lesson_id_idx
  on public.studio_progress(lesson_id);

drop policy if exists "owner select" on public.studio_achievements;
create policy "owner select"
on public.studio_achievements
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_achievements;
create policy "owner insert"
on public.studio_achievements
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_achievements;
create policy "owner update"
on public.studio_achievements
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_achievements;
create policy "owner delete"
on public.studio_achievements
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner select" on public.studio_activity;
create policy "owner select"
on public.studio_activity
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_activity;
create policy "owner insert"
on public.studio_activity
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_activity;
create policy "owner update"
on public.studio_activity
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_activity;
create policy "owner delete"
on public.studio_activity
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner select" on public.studio_daily_goals;
create policy "owner select"
on public.studio_daily_goals
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_daily_goals;
create policy "owner insert"
on public.studio_daily_goals
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_daily_goals;
create policy "owner update"
on public.studio_daily_goals
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_daily_goals;
create policy "owner delete"
on public.studio_daily_goals
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner select" on public.studio_enrollments;
create policy "owner select"
on public.studio_enrollments
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_enrollments;
create policy "owner insert"
on public.studio_enrollments
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_enrollments;
create policy "owner update"
on public.studio_enrollments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_enrollments;
create policy "owner delete"
on public.studio_enrollments
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner select" on public.studio_progress;
create policy "owner select"
on public.studio_progress
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_progress;
create policy "owner insert"
on public.studio_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_progress;
create policy "owner update"
on public.studio_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_progress;
create policy "owner delete"
on public.studio_progress
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner select" on public.studio_streaks;
create policy "owner select"
on public.studio_streaks
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.studio_streaks;
create policy "owner insert"
on public.studio_streaks
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.studio_streaks;
create policy "owner update"
on public.studio_streaks
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.studio_streaks;
create policy "owner delete"
on public.studio_streaks
for delete
to authenticated
using (user_id = (select auth.uid()));

