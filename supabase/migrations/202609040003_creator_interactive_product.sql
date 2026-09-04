-- NXR-037B2: user-authored goals and one current strategy per owner.
-- This forward-only migration does not alter trusted analytics/benchmark write access.
alter table public.creator_strategies
  add constraint creator_strategies_user_unique unique (user_id);

create table public.creator_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  milestones jsonb not null default '[]'::jsonb check (jsonb_typeof(milestones) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.creator_goals enable row level security;
create policy creator_goals_owner_all on public.creator_goals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
comment on table public.creator_goals is 'User-authored goals with explicitly completed manual milestones; no inferred progress.';
