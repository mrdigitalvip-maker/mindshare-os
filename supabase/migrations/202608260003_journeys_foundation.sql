-- Journeys V1: persisted execution, canonical-entitlement limits and server-owned rewards.
create table public.journeys (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160), category text not null default 'custom' check(category in ('creator','business','fitness','study','travel','personal','custom')),
  objective text not null check(length(btrim(objective)) between 1 and 1000), context text, status text not null default 'active' check(status in ('active','paused','completed','archived')),
  start_date date not null default current_date, target_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(target_date is null or target_date >= start_date)
);
create table public.journey_missions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid references public.journeys(id) on delete set null, source_type text not null check(source_type in ('task','study_session','project','journey_action')),
  source_id uuid not null, title text not null check(length(btrim(title)) between 1 and 240), description text,
  status text not null default 'pending' check(status in ('pending','active','completed','skipped')), scheduled_date date not null,
  momentum_value integer not null default 120 check(momentum_value between 1 and 500), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, scheduled_date)
);
create table public.momentum_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid references public.journeys(id) on delete set null, source_type text not null, source_id uuid not null,
  event_type text not null check(event_type in ('mission_completed','weekly_challenge_completed')), points integer not null check(points > 0), created_at timestamptz not null default now(),
  unique(user_id, source_type, source_id, event_type)
);
create table public.challenges (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, description text not null,
  type text not null check(type='mission_completions'), target_value integer not null check(target_value > 0), reward_points integer not null check(reward_points > 0),
  starts_at timestamptz not null, ends_at timestamptz not null, active boolean not null default true, check(ends_at > starts_at)
);
create table public.user_challenges (
  user_id uuid not null references auth.users(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress integer not null default 0 check(progress >= 0), completed_at timestamptz, joined_at timestamptz not null default now(), primary key(user_id,challenge_id)
);
create index journeys_owner_status_idx on public.journeys(user_id,status,updated_at desc);
create index missions_owner_day_idx on public.journey_missions(user_id,scheduled_date desc);
create index momentum_owner_created_idx on public.momentum_events(user_id,created_at desc);
alter table public.journeys enable row level security; alter table public.journey_missions enable row level security;
alter table public.momentum_events enable row level security; alter table public.challenges enable row level security; alter table public.user_challenges enable row level security;
create policy "owners manage journeys" on public.journeys for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "owners read missions" on public.journey_missions for select to authenticated using(user_id=auth.uid());
create policy "owners update mission state" on public.journey_missions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "owners read momentum" on public.momentum_events for select to authenticated using(user_id=auth.uid());
create policy "authenticated read active challenges" on public.challenges for select to authenticated using(active);
create policy "owners read participation" on public.user_challenges for select to authenticated using(user_id=auth.uid());

create or replace function public.enforce_journey_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare amount integer;
begin
 if new.status <> 'active' or public.has_premium(new.user_id) then return new; end if;
 select count(*) into amount from journeys where user_id=new.user_id and status='active' and id<>new.id;
 if amount>=1 then raise exception using errcode='P0001',message='FREE_CREATION_LIMIT_REACHED',detail='{"resource":"journeys","limit":1}'; end if;
 return new;
end $$;
create trigger journeys_free_limit before insert or update of status on public.journeys for each row execute function public.enforce_journey_limit();

create or replace function public.ensure_daily_journey_mission(p_local_date date) returns public.journey_missions
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); found journey_missions; candidate record;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into found from journey_missions where user_id=uid and scheduled_date=p_local_date;
 if found.id is not null then return found; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_local_date::text,0));
 select * into found from journey_missions where user_id=uid and scheduled_date=p_local_date;
 if found.id is not null then return found; end if;
 select 'task'::text source_type,t.id source_id,t.title,coalesce(t.next_action,t.description) description,
   case when t.due_date<p_local_date then 0 when t.due_date=p_local_date then 10 when t.next_action is not null then 20 when t.due_date is not null then 40 else 60 end rank
 into candidate from tasks t left join projects p on p.id=t.project_id
 where t.user_id=uid and not t.completed and (t.project_id is null or p.status='active')
 order by rank, t.title, t.id limit 1;
 if candidate.source_id is null then
   select 'study_session'::text,s.id,('Estudar '||s.name),s.next_action,30 into candidate from study_subjects s
   where s.user_id=uid and s.status='active' and nullif(btrim(s.next_action),'') is not null order by s.updated_at desc,s.id limit 1;
 end if;
 if candidate.source_id is null then return null; end if;
 insert into journey_missions(user_id,source_type,source_id,title,description,status,scheduled_date)
 values(uid,candidate.source_type,candidate.source_id,candidate.title,candidate.description,'active',p_local_date) returning * into found;
 return found;
end $$;
revoke all on function public.ensure_daily_journey_mission(date) from public; grant execute on function public.ensure_daily_journey_mission(date) to authenticated;

create or replace function public.complete_verified_missions() returns trigger language plpgsql security definer set search_path=public as $$
declare mission journey_missions;
begin
 for mission in update journey_missions set status='completed',completed_at=now(),updated_at=now()
   where user_id=new.user_id and source_type=case tg_table_name when 'tasks' then 'task' else 'study_session' end and source_id=new.id and status in ('pending','active')
   returning * loop
   insert into momentum_events(user_id,journey_id,source_type,source_id,event_type,points) values(mission.user_id,mission.journey_id,'mission',mission.id,'mission_completed',mission.momentum_value) on conflict do nothing;
   insert into user_challenges(user_id,challenge_id,progress)
     select mission.user_id,c.id,1 from challenges c where c.active and c.type='mission_completions' and now() between c.starts_at and c.ends_at
     on conflict(user_id,challenge_id) do update set progress=least(user_challenges.progress+1,(select target_value from challenges where id=excluded.challenge_id));
   update user_challenges uc set completed_at=coalesce(uc.completed_at,now()) from challenges c where uc.user_id=mission.user_id and uc.challenge_id=c.id and uc.progress>=c.target_value;
   insert into momentum_events(user_id,source_type,source_id,event_type,points)
     select uc.user_id,'challenge',uc.challenge_id,'weekly_challenge_completed',c.reward_points from user_challenges uc join challenges c on c.id=uc.challenge_id
     where uc.user_id=mission.user_id and uc.completed_at is not null on conflict do nothing;
 end loop; return new;
end $$;
create trigger tasks_verify_missions after update of completed on public.tasks for each row when(new.completed=true and old.completed=false) execute function public.complete_verified_missions();
create trigger studies_verify_missions after update of status on public.study_sessions for each row when(new.status='completed' and old.status is distinct from 'completed') execute function public.complete_verified_missions();

create or replace function public.complete_journey_action(p_mission uuid) returns public.journey_missions language plpgsql security definer set search_path=public as $$
declare result journey_missions;
begin
 update journey_missions set status='completed',completed_at=now(),updated_at=now() where id=p_mission and user_id=auth.uid() and source_type='journey_action' and status in ('pending','active') returning * into result;
 if result.id is null then raise exception 'mission_not_confirmable'; end if;
 insert into momentum_events(user_id,journey_id,source_type,source_id,event_type,points) values(result.user_id,result.journey_id,'mission',result.id,'mission_completed',result.momentum_value) on conflict do nothing;
 return result;
end $$;
revoke all on function public.complete_journey_action(uuid) from public; grant execute on function public.complete_journey_action(uuid) to authenticated;

insert into public.challenges(slug,title,description,type,target_value,reward_points,starts_at,ends_at)
values('missions-2026-w35','Complete 5 missões','Execute cinco missões significativas nesta semana.','mission_completions',5,300,'2026-08-24T00:00:00Z','2026-08-31T00:00:00Z') on conflict(slug) do nothing;
