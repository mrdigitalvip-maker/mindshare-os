-- KIVRYN Passport V1 foundation.
-- Reuses the existing Studio language catalog/progress engine and adds
-- placement, adaptive goals, spaced repetition, role-play and daily missions.

create table public.passport_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  native_locale text,
  goal text not null default 'travel',
  travel_date date,
  daily_minutes integer not null default 15 check (daily_minutes between 5 and 180),
  current_level text not null default 'A0' check (current_level in ('A0','A1','A2','B1','B2','C1')),
  placement_score integer check (placement_score between 0 and 100),
  plan_horizon_days integer not null default 90 check (plan_horizon_days between 7 and 365),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, track_id)
);

create unique index passport_profiles_one_primary_per_user_idx
  on public.passport_profiles(user_id)
  where is_primary;
create index passport_profiles_owner_idx on public.passport_profiles(user_id);

create table public.passport_placement_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null check (score between 0 and 100),
  level text not null check (level in ('A0','A1','A2','B1','B2','C1')),
  completed_at timestamptz not null default now()
);
create index passport_placement_owner_track_idx
  on public.passport_placement_attempts(user_id, track_id, completed_at desc);

create table public.passport_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  source_lesson_id uuid references public.studio_lessons(id) on delete set null,
  term text not null check (char_length(btrim(term)) between 1 and 160),
  translation text not null default '',
  context text not null default '',
  stage text not null default 'new' check (stage in ('new','learning','review','mastered')),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 2.80),
  interval_days integer not null default 0 check (interval_days between 0 and 3650),
  repetitions integer not null default 0 check (repetitions between 0 and 10000),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index passport_vocabulary_owner_track_term_idx
  on public.passport_vocabulary(user_id, track_id, lower(btrim(term)));
create index passport_vocabulary_due_idx
  on public.passport_vocabulary(user_id, track_id, next_review_at)
  where stage <> 'mastered';

create table public.passport_vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.passport_vocabulary(id) on delete cascade,
  grade smallint not null check (grade between 0 and 5),
  previous_interval_days integer not null check (previous_interval_days >= 0),
  next_interval_days integer not null check (next_interval_days >= 0),
  reviewed_at timestamptz not null default now()
);
create index passport_vocabulary_reviews_item_idx
  on public.passport_vocabulary_reviews(vocabulary_id, reviewed_at desc);

create table public.passport_roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  scenario text not null check (scenario in ('airport','hotel','restaurant','transport','directions','emergency','shopping','social','custom')),
  mode text not null default 'text' check (mode in ('text','voice')),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  transcript jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  score integer check (score between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index passport_roleplay_owner_idx
  on public.passport_roleplay_sessions(user_id, started_at desc);

create table public.passport_daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  mission_date date not null,
  mission_key text not null check (char_length(btrim(mission_key)) between 1 and 120),
  mission_type text not null check (mission_type in ('culture','listening','vocabulary','speaking','travel')),
  title text not null,
  prompt text not null default '',
  status text not null default 'pending' check (status in ('pending','completed','skipped')),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, track_id, mission_date, mission_key)
);
create index passport_daily_missions_owner_date_idx
  on public.passport_daily_missions(user_id, mission_date desc);

-- Passport is language-only even though Studio supports other track categories.
create or replace function public.ensure_passport_language_track()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.studio_tracks
    where id = new.track_id
      and category = 'language'
      and active
  ) then
    raise exception 'passport requires an active language track';
  end if;
  return new;
end;
$$;

create trigger passport_profiles_language_track
before insert or update of track_id on public.passport_profiles
for each row execute function public.ensure_passport_language_track();

create trigger passport_placement_language_track
before insert or update of track_id on public.passport_placement_attempts
for each row execute function public.ensure_passport_language_track();

create trigger passport_vocabulary_language_track
before insert or update of track_id on public.passport_vocabulary
for each row execute function public.ensure_passport_language_track();

create trigger passport_roleplay_language_track
before insert or update of track_id on public.passport_roleplay_sessions
for each row execute function public.ensure_passport_language_track();

create trigger passport_daily_missions_language_track
before insert or update of track_id on public.passport_daily_missions
for each row execute function public.ensure_passport_language_track();

alter table public.passport_profiles enable row level security;
alter table public.passport_placement_attempts enable row level security;
alter table public.passport_vocabulary enable row level security;
alter table public.passport_vocabulary_reviews enable row level security;
alter table public.passport_roleplay_sessions enable row level security;
alter table public.passport_daily_missions enable row level security;

create policy "passport profile owner select" on public.passport_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "passport profile owner insert" on public.passport_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "passport profile owner update" on public.passport_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "passport profile owner delete" on public.passport_profiles
  for delete to authenticated using (user_id = auth.uid());

create policy "passport placement owner select" on public.passport_placement_attempts
  for select to authenticated using (user_id = auth.uid());
create policy "passport placement owner insert" on public.passport_placement_attempts
  for insert to authenticated with check (user_id = auth.uid());

create policy "passport vocabulary owner select" on public.passport_vocabulary
  for select to authenticated using (user_id = auth.uid());
create policy "passport vocabulary owner insert" on public.passport_vocabulary
  for insert to authenticated with check (user_id = auth.uid());
create policy "passport vocabulary owner update" on public.passport_vocabulary
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "passport vocabulary owner delete" on public.passport_vocabulary
  for delete to authenticated using (user_id = auth.uid());

create policy "passport vocabulary reviews owner select" on public.passport_vocabulary_reviews
  for select to authenticated using (
    exists (
      select 1 from public.passport_vocabulary v
      where v.id = vocabulary_id and v.user_id = auth.uid()
    )
  );

create policy "passport roleplay owner select" on public.passport_roleplay_sessions
  for select to authenticated using (user_id = auth.uid());
create policy "passport roleplay owner insert" on public.passport_roleplay_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy "passport roleplay owner update" on public.passport_roleplay_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "passport roleplay owner delete" on public.passport_roleplay_sessions
  for delete to authenticated using (user_id = auth.uid());

create policy "passport missions owner select" on public.passport_daily_missions
  for select to authenticated using (user_id = auth.uid());
create policy "passport missions owner insert" on public.passport_daily_missions
  for insert to authenticated with check (user_id = auth.uid());
create policy "passport missions owner update" on public.passport_daily_missions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "passport missions owner delete" on public.passport_daily_missions
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.passport_profiles to authenticated;
grant select, insert on public.passport_placement_attempts to authenticated;
grant select, insert, update, delete on public.passport_vocabulary to authenticated;
grant select on public.passport_vocabulary_reviews to authenticated;
grant select, insert, update, delete on public.passport_roleplay_sessions to authenticated;
grant select, insert, update, delete on public.passport_daily_missions to authenticated;

-- Atomic spaced-repetition update. Direct review-event writes stay closed; clients use this RPC.
create or replace function public.review_passport_vocabulary(
  p_vocabulary_id uuid,
  p_grade smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item public.passport_vocabulary%rowtype;
  next_repetitions integer;
  next_interval integer;
  next_ease numeric(4,2);
  next_stage text;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  if p_grade < 0 or p_grade > 5 then
    raise exception 'grade must be between 0 and 5';
  end if;

  select * into item
  from public.passport_vocabulary
  where id = p_vocabulary_id and user_id = uid
  for update;

  if not found then
    raise exception 'vocabulary item not found';
  end if;

  if p_grade < 3 then
    next_repetitions := 0;
    next_interval := 1;
    next_ease := greatest(1.30, item.ease_factor - 0.20);
    next_stage := 'learning';
  else
    next_repetitions := item.repetitions + 1;
    next_ease := least(
      2.80,
      greatest(
        1.30,
        item.ease_factor + (0.10 - (5 - p_grade) * (0.08 + (5 - p_grade) * 0.02))
      )
    );
    next_interval := case
      when next_repetitions = 1 then 1
      when next_repetitions = 2 then 3
      else greatest(1, round(greatest(item.interval_days, 1) * next_ease)::integer)
    end;
    next_stage := case
      when next_repetitions >= 5 and next_interval >= 21 then 'mastered'
      when next_repetitions >= 2 then 'review'
      else 'learning'
    end;
  end if;

  update public.passport_vocabulary
  set repetitions = next_repetitions,
      interval_days = next_interval,
      ease_factor = next_ease,
      stage = next_stage,
      last_reviewed_at = now(),
      next_review_at = now() + make_interval(days => next_interval),
      updated_at = now()
  where id = item.id;

  insert into public.passport_vocabulary_reviews(
    vocabulary_id,
    grade,
    previous_interval_days,
    next_interval_days
  ) values (
    item.id,
    p_grade,
    item.interval_days,
    next_interval
  );

  return jsonb_build_object(
    'id', item.id,
    'grade', p_grade,
    'stage', next_stage,
    'repetitions', next_repetitions,
    'intervalDays', next_interval,
    'easeFactor', next_ease,
    'nextReviewAt', now() + make_interval(days => next_interval)
  );
end;
$$;

revoke all on function public.review_passport_vocabulary(uuid, smallint) from public;
grant execute on function public.review_passport_vocabulary(uuid, smallint) to authenticated;

-- Placement is persisted atomically and updates the user's Passport profile.
create or replace function public.complete_passport_placement(
  p_track_id uuid,
  p_score integer,
  p_answers jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  resolved_level text;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  if p_score < 0 or p_score > 100 then
    raise exception 'score must be between 0 and 100';
  end if;
  if not exists (
    select 1 from public.studio_tracks
    where id = p_track_id and category = 'language' and active
  ) then
    raise exception 'passport requires an active language track';
  end if;

  resolved_level := case
    when p_score < 20 then 'A0'
    when p_score < 35 then 'A1'
    when p_score < 50 then 'A2'
    when p_score < 68 then 'B1'
    when p_score < 85 then 'B2'
    else 'C1'
  end;

  insert into public.passport_placement_attempts(user_id, track_id, answers, score, level)
  values(uid, p_track_id, coalesce(p_answers, '[]'::jsonb), p_score, resolved_level);

  insert into public.passport_profiles(user_id, track_id, current_level, placement_score)
  values(uid, p_track_id, resolved_level, p_score)
  on conflict(user_id, track_id) do update
    set current_level = excluded.current_level,
        placement_score = excluded.placement_score,
        updated_at = now();

  return jsonb_build_object('score', p_score, 'level', resolved_level);
end;
$$;

revoke all on function public.complete_passport_placement(uuid, integer, jsonb) from public;
grant execute on function public.complete_passport_placement(uuid, integer, jsonb) to authenticated;
