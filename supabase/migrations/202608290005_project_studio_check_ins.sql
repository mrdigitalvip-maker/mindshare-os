-- Human-authored project continuity. This is intentionally separate from rewards and verified execution.
create table if not exists public.project_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  state text not null check (state in ('progressed', 'unchanged', 'blocked', 'reorganize')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists project_check_ins_owner_project_created_idx
  on public.project_check_ins(user_id, project_id, created_at desc);

alter table public.project_check_ins enable row level security;

drop policy if exists "Owners read project check-ins" on public.project_check_ins;
create policy "Owners read project check-ins" on public.project_check_ins for select
  using (auth.uid() = user_id);

drop policy if exists "Owners create check-ins for owned projects" on public.project_check_ins;
create policy "Owners create check-ins for owned projects" on public.project_check_ins for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects project
      where project.id = project_id and project.user_id = auth.uid()
    )
  );

drop policy if exists "Owners delete project check-ins" on public.project_check_ins;
create policy "Owners delete project check-ins" on public.project_check_ins for delete
  using (auth.uid() = user_id);
