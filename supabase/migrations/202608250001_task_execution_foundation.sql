-- Small, backward-compatible execution model. `completed` remains canonical for legacy clients.
alter table public.tasks
  add column if not exists execution_status text not null default 'not_started'
    check (execution_status in ('not_started', 'in_progress', 'blocked', 'completed')),
  add column if not exists next_action text,
  add column if not exists blocker_note text,
  add column if not exists started_at timestamptz,
  add column if not exists last_progress_at timestamptz,
  add column if not exists reminder_at timestamptz;

update public.tasks set execution_status = 'completed' where completed is true;
create index if not exists tasks_user_execution_idx
  on public.tasks(user_id, execution_status, due_date) where completed is false;
