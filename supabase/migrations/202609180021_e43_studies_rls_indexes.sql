-- E43 — Studies RLS + FK index hardening.
-- Preserve authenticated ALL owner policies while evaluating auth.uid()
-- once per statement. Add subject_id-leading indexes required by FKs.

create index if not exists study_goals_subject_id_idx
  on public.study_goals(subject_id);

create index if not exists study_notes_subject_id_idx
  on public.study_notes(subject_id);

create index if not exists study_sessions_subject_id_idx
  on public.study_sessions(subject_id);

drop policy if exists study_subjects_owner_all on public.study_subjects;
create policy study_subjects_owner_all
on public.study_subjects
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists study_sessions_owner_all on public.study_sessions;
create policy study_sessions_owner_all
on public.study_sessions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists study_goals_owner_all on public.study_goals;
create policy study_goals_owner_all
on public.study_goals
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists study_notes_owner_all on public.study_notes;
create policy study_notes_owner_all
on public.study_notes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
