-- Reconciles the study contract represented by the generated client types and
-- adds the smallest persistent contract needed by the learning workspace.
create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8b5cf6',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_subjects_name_length check (char_length(name) between 1 and 100),
  constraint study_subjects_color_format check (color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.study_subjects add column if not exists description text not null default '';
alter table public.study_subjects add column if not exists status text not null default 'active';
alter table public.study_subjects add column if not exists updated_at timestamptz not null default now();

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  duration integer not null check (duration between 1 and 1440),
  completed boolean not null default true,
  activity text not null default '',
  created_at timestamptz not null default now()
);
alter table public.study_sessions add column if not exists activity text not null default '';

create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.study_subjects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  target_value integer not null default 1 check (target_value > 0),
  current_value integer not null default 0 check (current_value >= 0),
  due_at date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  title text not null default 'Nota' check (char_length(title) between 1 and 160),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_subjects_owner_idx on public.study_subjects(user_id, updated_at desc);
create index if not exists study_sessions_owner_subject_idx on public.study_sessions(user_id, subject_id, created_at desc);
create index if not exists study_goals_owner_subject_idx on public.study_goals(user_id, subject_id, due_at);
create index if not exists study_notes_owner_subject_idx on public.study_notes(user_id, subject_id, updated_at desc);

alter table public.study_subjects enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_goals enable row level security;
alter table public.study_notes enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['study_subjects','study_sessions','study_goals','study_notes'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name || '_owner_all', table_name);
  end loop;
end $$;

-- Prevent a client from attaching a child row to another owner's subject.
create or replace function public.enforce_study_subject_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.subject_id is not null and not exists (
    select 1 from public.study_subjects s where s.id = new.subject_id and s.user_id = auth.uid()
  ) then raise exception 'study subject is not owned by the authenticated user' using errcode = '42501'; end if;
  new.user_id := auth.uid();
  return new;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['study_sessions','study_goals','study_notes'] loop
    execute format('drop trigger if exists enforce_study_subject_owner on public.%I', table_name);
    execute format('create trigger enforce_study_subject_owner before insert or update on public.%I for each row execute function public.enforce_study_subject_owner()', table_name);
  end loop;
end $$;
