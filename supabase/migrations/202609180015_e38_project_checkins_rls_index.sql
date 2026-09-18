-- E38 — Project Check-ins RLS and FK lookup hardening.
-- Keep the existing owner/project authorization contract while making auth
-- evaluation initplan-safe. Add a project_id-leading index because the existing
-- (user_id, project_id, created_at desc) index does not cover the FK lookup path.

create index if not exists project_check_ins_project_id_idx
  on public.project_check_ins(project_id);

drop policy if exists "Owners read project check-ins" on public.project_check_ins;
create policy "Owners read project check-ins"
on public.project_check_ins
for select
to public
using ((select auth.uid()) = user_id);

drop policy if exists "Owners create check-ins for owned projects" on public.project_check_ins;
create policy "Owners create check-ins for owned projects"
on public.project_check_ins
for insert
to public
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.projects project
    where project.id = project_check_ins.project_id
      and project.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners delete project check-ins" on public.project_check_ins;
create policy "Owners delete project check-ins"
on public.project_check_ins
for delete
to public
using ((select auth.uid()) = user_id);
