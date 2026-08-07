-- NEXORA OS 2.0 / Phase 1: only the persisted fields required by projects and agents.
alter table public.projects add column if not exists objective text;
alter table public.projects add column if not exists priority text not null default 'medium';
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists due_date date;
alter table public.projects add constraint projects_priority_check check (priority in ('low','medium','high')) not valid;

alter table public.agents add column if not exists goal text;
alter table public.agents add column if not exists instructions text;
alter table public.agents add column if not exists tone text;
alter table public.agents add column if not exists expected_output text;
alter table public.agents add column if not exists capabilities text[] not null default '{}';
alter table public.agents add column if not exists updated_at timestamptz not null default now();

alter table public.agent_runs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.agent_runs add column if not exists error_code text;
alter table public.agent_runs add column if not exists created_at timestamptz not null default now();
alter table public.agent_runs alter column input type text using input #>> '{}';
alter table public.agent_runs alter column output type text using output #>> '{}';
update public.agent_runs r set user_id = a.user_id from public.agents a where r.agent_id = a.id and r.user_id is null;
alter table public.agent_runs alter column user_id set not null;

create index if not exists tasks_user_project_idx on public.tasks(user_id, project_id);
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date);
create index if not exists agent_runs_user_agent_created_idx on public.agent_runs(user_id, agent_id, created_at desc);

alter table public.agent_runs enable row level security;
drop policy if exists "Owners manage agent runs" on public.agent_runs;
create policy "Owners manage agent runs" on public.agent_runs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at before update on public.agents for each row execute function public.set_updated_at();
