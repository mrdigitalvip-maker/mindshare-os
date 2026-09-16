-- Edition 8: strengthen Projects/Tasks ownership invariants and keep
-- the legacy completed flag consistent with execution_status for every client.

create or replace function public.sync_task_completion_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.completed, false) then
      new.execution_status := 'completed';
    elsif new.execution_status = 'completed' then
      new.completed := true;
    end if;
    return new;
  end if;

  if new.completed is distinct from old.completed
     and new.execution_status is not distinct from old.execution_status then
    new.execution_status := case when new.completed then 'completed' else 'not_started' end;
  elsif new.execution_status is distinct from old.execution_status
        and new.completed is not distinct from old.completed then
    new.completed := (new.execution_status = 'completed');
  elsif new.completed is distinct from old.completed
        and new.execution_status is distinct from old.execution_status
        and new.completed <> (new.execution_status = 'completed') then
    raise exception 'completed and execution_status must describe the same completion state';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_sync_completion_state on public.tasks;
create trigger tasks_sync_completion_state
before insert or update of completed, execution_status on public.tasks
for each row execute function public.sync_task_completion_state();

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
