-- Auditable, ownership-scoped and idempotent PREVIEW -> CONFIRM -> APPLY boundary.
create table public.nexora_action_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  action_type text not null,
  status text not null default 'applying' check (status in ('applying','applied','failed')),
  resource_id uuid,
  error_code text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique(user_id, request_id)
);
alter table public.nexora_action_runs enable row level security;
create policy "Owners read action history" on public.nexora_action_runs for select using (auth.uid()=user_id);
revoke all on public.nexora_action_runs from anon, authenticated;
grant select on public.nexora_action_runs to authenticated;

create or replace function public.apply_nexora_action(
  p_action_id uuid, p_request_id uuid, p_conversation_id uuid, p_confirmed boolean, p_action jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare uid uuid:=auth.uid(); kind text:=p_action->>'action_type'; rid uuid; existing public.nexora_action_runs; expected timestamptz;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if p_confirmed is not true then raise exception 'confirmation_required'; end if;
  if kind not in ('create_task','update_task','reschedule_task','complete_task','set_task_next_action','set_task_blocker','clear_task_blocker','create_project','update_project','complete_project','add_task_to_project','create_study_goal','update_study_goal','set_subject_next_action') then raise exception 'unsupported_action'; end if;
  select * into existing from public.nexora_action_runs where user_id=uid and request_id=p_request_id;
  if found then
    if existing.id<>p_action_id or existing.action_type<>kind then raise exception 'idempotency_conflict'; end if;
    if existing.status='applied' then return jsonb_build_object('actionId',existing.id,'status','applied','resourceId',existing.resource_id,'idempotent',true); end if;
    raise exception 'action_in_progress';
  end if;
  if p_conversation_id is not null and not exists(select 1 from public.ai_conversations where id=p_conversation_id and user_id=uid) then raise exception 'conversation_not_found'; end if;
  insert into public.nexora_action_runs(id,user_id,request_id,conversation_id,action_type) values(p_action_id,uid,p_request_id,p_conversation_id,kind);
  if p_action ? 'expected_updated_at' then expected:=(p_action->>'expected_updated_at')::timestamptz; end if;

  if kind in ('create_task','add_task_to_project') then
    if nullif(btrim(p_action->>'title'),'') is null then raise exception 'invalid_payload'; end if;
    if p_action->>'project_id' is not null and not exists(select 1 from public.projects where id=(p_action->>'project_id')::uuid and user_id=uid) then raise exception 'project_not_found'; end if;
    insert into public.tasks(user_id,title,project_id,due_date,priority,completed) values(uid,btrim(p_action->>'title'),nullif(p_action->>'project_id','')::uuid,nullif(p_action->>'due_date','')::date,coalesce(nullif(p_action->>'priority',''),'medium'),false) returning id into rid;
  elsif kind in ('update_task','reschedule_task','complete_task','set_task_next_action','set_task_blocker','clear_task_blocker') then
    rid:=(p_action->>'resource_id')::uuid;
    if not exists(select 1 from public.tasks where id=rid and user_id=uid and (expected is null or updated_at=expected)) then raise exception 'task_stale_or_not_found'; end if;
    update public.tasks set
      title=case when kind='update_task' and p_action->>'title' is not null then btrim(p_action->>'title') else title end,
      due_date=case when kind='reschedule_task' then (p_action->>'due_date')::date when kind='update_task' and p_action ? 'due_date' then nullif(p_action->>'due_date','')::date else due_date end,
      priority=case when kind='update_task' and p_action->>'priority' is not null then p_action->>'priority' else priority end,
      completed=case when kind='complete_task' then true else completed end,
      execution_status=case when kind='complete_task' then 'completed' when kind='set_task_blocker' then 'blocked' when kind='clear_task_blocker' then 'not_started' else execution_status end,
      next_action=case when kind='set_task_next_action' then p_action->>'value' else next_action end,
      blocker_note=case when kind='set_task_blocker' then p_action->>'value' when kind='clear_task_blocker' then null else blocker_note end,
      updated_at=now() where id=rid and user_id=uid;
  elsif kind='create_project' then
    if nullif(btrim(p_action->>'title'),'') is null then raise exception 'invalid_payload'; end if;
    insert into public.projects(user_id,title,description,objective,due_date,status) values(uid,btrim(p_action->>'title'),coalesce(p_action->>'objective',''),p_action->>'objective',nullif(p_action->>'due_date','')::date,'active') returning id into rid;
  elsif kind in ('update_project','complete_project') then
    rid:=(p_action->>'resource_id')::uuid;
    if not exists(select 1 from public.projects where id=rid and user_id=uid and (expected is null or updated_at=expected)) then raise exception 'project_stale_or_not_found'; end if;
    update public.projects set title=case when kind='update_project' and p_action->>'title' is not null then btrim(p_action->>'title') else title end, objective=case when kind='update_project' and p_action ? 'objective' then p_action->>'objective' else objective end, due_date=case when kind='update_project' and p_action ? 'due_date' then nullif(p_action->>'due_date','')::date else due_date end, status=case when kind='complete_project' then 'completed' else status end, updated_at=now() where id=rid and user_id=uid;
  elsif kind='create_study_goal' then
    if not exists(select 1 from public.study_subjects where id=(p_action->>'subject_id')::uuid and user_id=uid) then raise exception 'subject_not_found'; end if;
    insert into public.study_goals(user_id,subject_id,title,target_value,due_at) values(uid,(p_action->>'subject_id')::uuid,btrim(p_action->>'title'),coalesce((p_action->>'target_value')::integer,1),nullif(p_action->>'due_date','')::date) returning id into rid;
  elsif kind='update_study_goal' then
    rid:=(p_action->>'resource_id')::uuid;
    update public.study_goals set title=coalesce(nullif(btrim(p_action->>'title'),''),title),target_value=coalesce((p_action->>'target_value')::integer,target_value),due_at=case when p_action ? 'due_date' then nullif(p_action->>'due_date','')::date else due_at end,updated_at=now() where id=rid and user_id=uid and (expected is null or updated_at=expected);
    if not found then raise exception 'study_goal_stale_or_not_found'; end if;
  else
    rid:=(p_action->>'resource_id')::uuid;
    update public.study_subjects set next_action=p_action->>'value',updated_at=now() where id=rid and user_id=uid and (expected is null or updated_at=expected);
    if not found then raise exception 'subject_stale_or_not_found'; end if;
  end if;
  update public.nexora_action_runs set status='applied',resource_id=rid,applied_at=now() where id=p_action_id and user_id=uid;
  return jsonb_build_object('actionId',p_action_id,'status','applied','resourceId',rid,'idempotent',false);
exception when others then
  -- The transaction rollback intentionally removes the claim; safe retries can revalidate and run.
  raise;
end $$;
revoke all on function public.apply_nexora_action(uuid,uuid,uuid,boolean,jsonb) from public,anon;
grant execute on function public.apply_nexora_action(uuid,uuid,uuid,boolean,jsonb) to authenticated;
