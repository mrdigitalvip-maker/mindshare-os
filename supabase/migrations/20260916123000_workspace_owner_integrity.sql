-- Edition 8: strengthen Projects/Tasks ownership invariants.
-- Existing client filters remain defense-in-depth; the database owns the invariant.

drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

create policy projects_select on public.projects
  for select to authenticated
  using (auth.uid() = user_id);

create policy projects_insert on public.projects
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy projects_update on public.projects
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy projects_delete on public.projects
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_select on public.tasks
  for select to authenticated
  using (auth.uid() = user_id);

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (auth.uid() = user_id);
