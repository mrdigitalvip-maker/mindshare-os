-- E36 — Projects + Tasks operational RLS and FK index hardening.
-- Preserve owner-only CRUD and linked-project ownership checks while making
-- auth evaluation initplan-safe and covering advisor-reported FK lookup paths.

create index if not exists projects_user_id_idx
  on public.projects(user_id);

create index if not exists tasks_project_id_idx
  on public.tasks(project_id);

drop policy if exists projects_select on public.projects;
create policy projects_select
on public.projects
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists projects_insert on public.projects;
create policy projects_insert
on public.projects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists projects_update on public.projects;
create policy projects_update
on public.projects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists projects_delete on public.projects;
create policy projects_delete
on public.projects
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert
on public.tasks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects p
      where p.id = tasks.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects p
      where p.id = tasks.project_id
        and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);
