-- Atomically enforce Free workspace limits on transitions that consume capacity.
create or replace function public.enforce_free_workspace_limit() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare resource text; cap integer; amount integer; consumes_capacity boolean;
begin
  if tg_table_name = 'projects' then resource := 'projects'; cap := 3;
  elsif tg_table_name = 'study_subjects' then resource := 'study_subjects'; cap := 3;
  elsif tg_table_name = 'journeys' then resource := 'journeys'; cap := 1;
  else raise exception 'unsupported_free_limit_resource'; end if;
  consumes_capacity := new.status = 'active' and
    (tg_op = 'INSERT' or old.status is distinct from 'active' or old.user_id is distinct from new.user_id);
  if not consumes_capacity then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text || ':free-limit:' || resource, 0));
  if public.has_premium(new.user_id) then return new; end if;
  if resource = 'projects' then select count(*) into amount from public.projects where user_id=new.user_id and status='active' and id<>new.id;
  elsif resource = 'study_subjects' then select count(*) into amount from public.study_subjects where user_id=new.user_id and status='active' and id<>new.id;
  else select count(*) into amount from public.journeys where user_id=new.user_id and status='active' and id<>new.id; end if;
  if amount >= cap then raise exception using errcode='P0001', message='FREE_CREATION_LIMIT_REACHED',
    detail=pg_catalog.jsonb_build_object('resource',resource,'limit',cap,'used',amount)::text; end if;
  return new;
end $$;
revoke all on function public.enforce_free_workspace_limit() from public;

drop trigger if exists projects_free_limit on public.projects;
create trigger projects_free_limit before insert or update of status, user_id on public.projects for each row execute function public.enforce_free_workspace_limit();
drop trigger if exists studies_free_limit on public.study_subjects;
create trigger studies_free_limit before insert or update of status, user_id on public.study_subjects for each row execute function public.enforce_free_workspace_limit();
drop trigger if exists journeys_free_limit on public.journeys;
create trigger journeys_free_limit before insert or update of status, user_id on public.journeys for each row execute function public.enforce_free_workspace_limit();

-- `completed` is the legacy completion flag. execution_status is richer only
-- while open. One-column writes synchronize; explicit conflicts are rejected.
create or replace function public.enforce_task_state_and_free_limit() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare amount integer; consumes_capacity boolean;
begin
  if tg_op = 'INSERT' then
    if new.completed is distinct from (new.execution_status = 'completed') then
      if new.completed then new.execution_status := 'completed';
      elsif new.execution_status = 'completed' then new.completed := true; end if;
    end if;
  elsif new.completed is distinct from old.completed and new.execution_status is distinct from old.execution_status
    and new.completed is distinct from (new.execution_status = 'completed') then
    raise exception using errcode='P0001', message='TASK_STATE_CONFLICT';
  elsif new.completed is distinct from old.completed then
    new.execution_status := case when new.completed then 'completed' else 'not_started' end;
  elsif new.execution_status is distinct from old.execution_status then
    new.completed := new.execution_status = 'completed';
  end if;
  if new.completed then new.execution_status := 'completed';
  elsif new.execution_status = 'completed' then new.execution_status := 'not_started'; end if;
  consumes_capacity := not new.completed and (tg_op='INSERT' or old.completed or old.user_id is distinct from new.user_id);
  if not consumes_capacity then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text || ':free-limit:tasks', 0));
  if public.has_premium(new.user_id) then return new; end if;
  select count(*) into amount from public.tasks where user_id=new.user_id and completed=false and id<>new.id;
  if amount >= 30 then raise exception using errcode='P0001', message='FREE_CREATION_LIMIT_REACHED',
    detail=pg_catalog.jsonb_build_object('resource','tasks','limit',30,'used',amount)::text; end if;
  return new;
end $$;
revoke all on function public.enforce_task_state_and_free_limit() from public;
drop trigger if exists tasks_free_limit on public.tasks;
create trigger tasks_free_limit before insert or update of completed, execution_status, user_id on public.tasks for each row execute function public.enforce_task_state_and_free_limit();

-- Reconcile rows created before execution_status existed before validating the
-- invariant. This changes no task's legacy completion meaning.
update public.tasks
set execution_status = case when completed then 'completed' else 'not_started' end
where completed is distinct from (execution_status = 'completed');

alter table public.tasks drop constraint if exists tasks_completion_state_consistent;
alter table public.tasks add constraint tasks_completion_state_consistent check (completed = (execution_status = 'completed')) not valid;
alter table public.tasks validate constraint tasks_completion_state_consistent;
