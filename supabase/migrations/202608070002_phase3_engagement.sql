-- NEXORA OS 2.0 / Phase 3: persisted learning, engagement, push and AI metering.
create extension if not exists pgcrypto;

create table public.studio_tracks (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  title text not null, description text not null default '', category text not null
    check (category in ('language','academy','creator')), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.studio_lessons (
  id uuid primary key default gen_random_uuid(), track_id uuid not null references public.studio_tracks(id) on delete cascade,
  slug text not null, title text not null, description text not null default '', content jsonb not null default '{}'::jsonb,
  lesson_type text not null, difficulty text not null default 'beginner', order_index integer not null,
  estimated_minutes integer not null default 10 check (estimated_minutes between 1 and 180), premium boolean not null default false,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(track_id, slug), unique(track_id, order_index)
);
create table public.studio_enrollments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade, level text not null default 'beginner',
  target text not null default 'Build practical skills', daily_minutes integer not null default 15 check (daily_minutes between 5 and 180),
  locale text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, track_id)
);
create table public.studio_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.studio_lessons(id) on delete cascade,
  status text not null default 'not_started' check(status in ('not_started','in_progress','completed')),
  score integer check(score between 0 and 100), xp integer not null default 0 check(xp >= 0),
  started_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default now(), unique(user_id, lesson_id)
);
create table public.studio_daily_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null, target_minutes integer not null default 15 check(target_minutes between 1 and 300),
  target_activities integer not null default 1 check(target_activities between 1 and 20), completed_minutes integer not null default 0,
  completed_activities integer not null default 0, completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, goal_date)
);
create table public.studio_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null, track_id uuid references public.studio_tracks(id) on delete set null,
  lesson_id uuid references public.studio_lessons(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  local_date date not null, xp integer not null default 0 check(xp >= 0), created_at timestamptz not null default now()
);
create table public.studio_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade, current_streak integer not null default 0,
  longest_streak integer not null default 0, last_active_date date, total_xp integer not null default 0, updated_at timestamptz not null default now()
);
create table public.studio_achievements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  achievement text not null check(achievement in ('first_lesson','streak_3','streak_7','lessons_10','first_ai_challenge','first_creator_task')),
  unlocked_at timestamptz not null default now(), unique(user_id, achievement)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null, p256dh text not null, auth text not null, user_agent text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  unique(user_id, endpoint)
);
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, tasks_enabled boolean not null default true,
  projects_enabled boolean not null default true, studies_enabled boolean not null default true, studio_enabled boolean not null default true,
  daily_summary_enabled boolean not null default false, timezone text not null default 'UTC', quiet_hours_start time, quiet_hours_end time,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null, kind text not null, delivered_on date not null, created_at timestamptz not null default now(),
  unique(user_id, dedupe_key, delivered_on)
);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, usage_date date not null default current_date, request_id text not null,
  input_units integer check(input_units is null or input_units >= 0), output_units integer check(output_units is null or output_units >= 0),
  created_at timestamptz not null default now(), unique(user_id, request_id)
);

create index studio_progress_owner_status_idx on public.studio_progress(user_id,status);
create index studio_activity_owner_date_idx on public.studio_activity(user_id,local_date desc);
create index studio_goals_owner_date_idx on public.studio_daily_goals(user_id,goal_date desc);
create index push_subscriptions_owner_idx on public.push_subscriptions(user_id);
create index ai_usage_owner_date_action_idx on public.ai_usage(user_id,usage_date,action);

alter table public.studio_tracks enable row level security; alter table public.studio_lessons enable row level security;
alter table public.studio_enrollments enable row level security; alter table public.studio_progress enable row level security;
alter table public.studio_daily_goals enable row level security; alter table public.studio_activity enable row level security;
alter table public.studio_streaks enable row level security; alter table public.studio_achievements enable row level security;
alter table public.push_subscriptions enable row level security; alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security; alter table public.ai_usage enable row level security;
create policy "authenticated reads active tracks" on public.studio_tracks for select to authenticated using(active);
create policy "authenticated reads active lessons" on public.studio_lessons for select to authenticated using(active);
do $$ declare t text; begin foreach t in array array['studio_enrollments','studio_progress','studio_daily_goals','studio_activity','studio_streaks','studio_achievements','push_subscriptions','notification_preferences','ai_usage'] loop
  execute format('create policy "owner select" on public.%I for select to authenticated using(user_id = auth.uid())',t);
  execute format('create policy "owner insert" on public.%I for insert to authenticated with check(user_id = auth.uid())',t);
  execute format('create policy "owner update" on public.%I for update to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid())',t);
  execute format('create policy "owner delete" on public.%I for delete to authenticated using(user_id = auth.uid())',t);
end loop; end $$;

-- Atomic completion uses the preference timezone, preventing UTC from breaking streaks.
create or replace function public.complete_studio_lesson(p_lesson_id uuid, p_score integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lesson record; tz text; today date; previous date; streak integer; award integer := 20; already_completed boolean;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select l.*, t.category into lesson from studio_lessons l join studio_tracks t on t.id=l.track_id where l.id=p_lesson_id and l.active;
  if not found then raise exception 'lesson not found'; end if;
  if lesson.premium and not exists(select 1 from subscriptions where user_id=uid and status in ('active','trialing') and current_period_end > now()) then raise exception 'premium required'; end if;
  select exists(select 1 from studio_progress where user_id=uid and lesson_id=p_lesson_id and status='completed') into already_completed;
  if already_completed then award := 0; end if;
  select coalesce(timezone,'UTC') into tz from notification_preferences where user_id=uid; tz := coalesce(tz,'UTC');
  begin today := (now() at time zone tz)::date; exception when invalid_parameter_value then today := (now() at time zone 'UTC')::date; end;
  insert into studio_progress(user_id,lesson_id,status,score,xp,started_at,completed_at) values(uid,p_lesson_id,'completed',greatest(0,least(100,p_score)),award,now(),now())
  on conflict(user_id,lesson_id) do update set status='completed',score=excluded.score,xp=greatest(studio_progress.xp,award),completed_at=coalesce(studio_progress.completed_at,now()),updated_at=now();
  if already_completed then
    select coalesce(current_streak,0) into streak from studio_streaks where user_id=uid;
    return jsonb_build_object('xp',0,'streak',coalesce(streak,0),'date',today);
  end if;
  insert into studio_daily_goals(user_id,goal_date,target_minutes,completed_minutes,completed_activities,completed)
    values(uid,today,coalesce((select daily_minutes from studio_enrollments where user_id=uid and track_id=lesson.track_id),15),lesson.estimated_minutes,1,false)
    on conflict(user_id,goal_date) do update set completed_minutes=studio_daily_goals.completed_minutes+lesson.estimated_minutes,completed_activities=studio_daily_goals.completed_activities+1,updated_at=now();
  update studio_daily_goals set completed=(completed_minutes>=target_minutes or completed_activities>=target_activities),updated_at=now() where user_id=uid and goal_date=today;
  insert into studio_activity(user_id,activity_type,track_id,lesson_id,metadata,local_date,xp) values(uid,case when lesson.category='academy' then 'ai_challenge_completed' when lesson.category='creator' then 'creator_task_completed' else 'lesson_completed' end,lesson.track_id,p_lesson_id,jsonb_build_object('score',p_score),today,award);
  select last_active_date,current_streak into previous,streak from studio_streaks where user_id=uid for update;
  streak := case when previous=today then coalesce(streak,1) when previous=today-1 then coalesce(streak,0)+1 else 1 end;
  insert into studio_streaks(user_id,current_streak,longest_streak,last_active_date,total_xp) values(uid,streak,streak,today,award)
    on conflict(user_id) do update set current_streak=streak,longest_streak=greatest(studio_streaks.longest_streak,streak),last_active_date=today,total_xp=studio_streaks.total_xp + award,updated_at=now();
  insert into studio_achievements(user_id,achievement) values(uid,'first_lesson') on conflict do nothing;
  if streak>=3 then insert into studio_achievements(user_id,achievement) values(uid,'streak_3') on conflict do nothing; end if;
  if streak>=7 then insert into studio_achievements(user_id,achievement) values(uid,'streak_7') on conflict do nothing; end if;
  if (select count(*) from studio_progress where user_id=uid and status='completed')>=10 then insert into studio_achievements(user_id,achievement) values(uid,'lessons_10') on conflict do nothing; end if;
  if lesson.category='academy' then insert into studio_achievements(user_id,achievement) values(uid,'first_ai_challenge') on conflict do nothing; end if;
  if lesson.category='creator' then insert into studio_achievements(user_id,achievement) values(uid,'first_creator_task') on conflict do nothing; end if;
  return jsonb_build_object('xp',award,'streak',streak,'date',today);
end $$;
revoke all on function public.complete_studio_lesson(uuid,integer) from public; grant execute on function public.complete_studio_lesson(uuid,integer) to authenticated;

-- Initial catalog: substantive JSON lessons, globally readable but never user-writable.
insert into studio_tracks(slug,title,description,category) values
('english','English','Build practical English through writing, grammar, reading, vocabulary and conversation.','language'),
('spanish','Spanish','Practice Spanish for useful everyday situations.','language'),('portuguese','Portuguese','Learn clear, useful Portuguese.','language'),('french','French','Develop practical French foundations.','language'),
('ai-fundamentals','AI Fundamentals','Understand capabilities, limitations and responsible use.','academy'),('prompting','Prompting','Turn intent into clear, testable instructions.','academy'),
('research','Research','Use AI to structure and evaluate research.','academy'),('writing-ai','Writing','Draft and revise with critical judgment.','academy'),
('productivity-ai','Productivity','Design useful AI-assisted workflows.','academy'),('business-ai','Business','Apply AI responsibly to business problems.','academy'),
('automation','Automation','Map safe, observable automations.','academy'),('ai-agents','AI Agents','Design constrained agents with human oversight.','academy'),
('content-strategy','Content Strategy','Build a sustainable editorial direction.','creator'),('audience','Audience','Understand the people you serve.','creator'),
('creator-writing','Writing','Write clear, audience-aware content.','creator'),('short-form','Short-form Content','Adapt ideas into concise formats.','creator'),
('personal-brand','Personal Brand','Communicate a consistent point of view.','creator'),('monetization','Monetization Fundamentals','Explore ethical value creation without income promises.','creator'),
('consistency','Consistency','Create a realistic publishing system.','creator'),('analytics','Analytics Basics','Use simple metrics to learn and improve.','creator');
insert into studio_lessons(track_id,slug,title,description,content,lesson_type,difficulty,order_index,estimated_minutes,premium)
select id,'first-steps','First practical steps','Learn, apply and reflect.',
 jsonb_build_object('explanation','Start with a clear outcome, then practice one small skill.','example','Turn “get better” into one observable action.','exercise','Write one concrete example in your own words.','practicalTask',case when category='academy' then 'Transform a vague goal into an actionable plan.' when category='creator' then 'Write three hooks for your next idea.' else 'Write five useful sentences for a real situation.' end),
 case when category='language' then 'Vocabulary' when category='creator' then 'Daily task' else 'Practical challenge' end,'beginner',1,10,false from studio_tracks;
insert into studio_lessons(track_id,slug,title,description,content,lesson_type,difficulty,order_index,estimated_minutes,premium)
select id,'guided-practice','Guided practice','Apply the skill to a realistic scenario.',
 jsonb_build_object('explanation','Compare your result to the criteria, revise it, and record what changed.','example','A good revision is more specific and easier to verify.','exercise','Complete the practical task and describe one improvement.','practicalTask','Create, review and improve one useful output.'),
 case when category='language' then 'Writing' when category='creator' then 'Practice' else 'Exercise' end,'elementary',2,15,true from studio_tracks;
