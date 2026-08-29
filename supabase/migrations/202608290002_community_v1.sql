-- Community V1: private-by-default identity, invite-only squads and verified support.
create type public.community_profile_visibility as enum ('private', 'community');
create type public.community_reaction as enum ('support', 'celebrate', 'respect');
create type public.community_report_reason as enum ('spam', 'harassment', 'inappropriate', 'impersonation', 'other');

create table public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  visibility public.community_profile_visibility not null default 'private',
  show_momentum boolean not null default false,
  show_streak boolean not null default false,
  show_verified_activity boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_username_format check (username is null or username ~ '^[a-z][a-z0-9_]{2,29}$'),
  constraint community_username_reserved check (username is null or username <> all(array['admin','administrator','nexora','support','system','moderator'])),
  constraint community_display_name_length check (display_name is null or char_length(display_name) between 1 and 60),
  constraint community_bio_length check (bio is null or char_length(bio) <= 240)
);
create unique index community_profiles_username_ci_idx on public.community_profiles(lower(username)) where username is not null;

create table public.squads (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check(char_length(btrim(name)) between 2 and 60),
  description text check(description is null or char_length(description) <= 240),
  visibility text not null default 'private' check(visibility = 'private'),
  max_members smallint not null default 8 check(max_members between 2 and 20),
  closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','member')), joined_at timestamptz not null default now(),
  primary key(squad_id,user_id)
);
create unique index squad_single_owner_idx on public.squad_members(squad_id) where role='owner';
create index squad_members_user_idx on public.squad_members(user_id,joined_at desc);

create table public.squad_invites (
  id uuid primary key default gen_random_uuid(), squad_id uuid not null references public.squads(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique, status text not null default 'pending' check(status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null, created_at timestamptz not null default now(), accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
create index squad_invites_squad_idx on public.squad_invites(squad_id,created_at desc);

create table public.community_activity (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('mission_completed','challenge_completed')),
  source_type text not null check(source_type in ('mission','challenge')),
  source_id uuid not null, occurred_at timestamptz not null, created_at timestamptz not null default now(),
  unique(actor_user_id,source_type,source_id,event_type)
);
create index community_activity_actor_idx on public.community_activity(actor_user_id,occurred_at desc,id desc);

create table public.activity_reactions (
  activity_id uuid not null references public.community_activity(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction public.community_reaction not null, created_at timestamptz not null default now(),
  primary key(activity_id,user_id)
);
create index activity_reactions_activity_idx on public.activity_reactions(activity_id,reaction);

create table public.community_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_user_id,blocked_user_id),
  check(blocker_user_id <> blocked_user_id)
);
create index community_blocks_reverse_idx on public.community_blocks(blocked_user_id,blocker_user_id);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(), reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check(target_type in ('profile','squad','activity')),
  target_id uuid not null, reason public.community_report_reason not null,
  details text check(details is null or char_length(details) <= 500), status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(reporter_user_id,target_type,target_id,reason)
);
create index community_reports_queue_idx on public.community_reports(status,created_at);

alter table public.community_profiles enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_invites enable row level security;
alter table public.community_activity enable row level security;
alter table public.activity_reactions enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_reports enable row level security;

-- Tables are intentionally closed. Carefully bounded SECURITY DEFINER RPCs are the only mobile API.
revoke all on public.community_profiles, public.squads, public.squad_members, public.squad_invites,
  public.community_activity, public.activity_reactions, public.community_blocks, public.community_reports from anon, authenticated;

create or replace function public.community_is_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.community_blocks where (blocker_user_id=a and blocked_user_id=b) or (blocker_user_id=b and blocked_user_id=a));
$$;
revoke all on function public.community_is_blocked(uuid,uuid) from public,anon,authenticated;

create or replace function public.upsert_community_profile(p_display_name text,p_username text,p_bio text,p_visibility text,p_show_momentum boolean,p_show_streak boolean,p_show_activity boolean)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); normalized text:=lower(nullif(btrim(p_username),'')); last_update timestamptz;
begin
 if uid is null then raise exception 'unauthenticated'; end if;
 select updated_at into last_update from public.community_profiles where user_id=uid;
 if last_update > statement_timestamp()-interval '5 seconds' then raise exception 'rate_limited'; end if;
 begin
  insert into public.community_profiles(user_id,display_name,username,bio,visibility,show_momentum,show_streak,show_verified_activity)
  values(uid,nullif(btrim(p_display_name),''),normalized,nullif(btrim(p_bio),''),p_visibility::public.community_profile_visibility,p_show_momentum,p_show_streak,p_show_activity)
  on conflict(user_id) do update set display_name=excluded.display_name,username=excluded.username,bio=excluded.bio,visibility=excluded.visibility,
   show_momentum=excluded.show_momentum,show_streak=excluded.show_streak,show_verified_activity=excluded.show_verified_activity,updated_at=statement_timestamp();
 exception when unique_violation then raise exception 'username_taken'; end;
end $$;

create or replace function public.create_squad(p_name text,p_description text default null,p_max_members integer default 8)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); sid uuid;
begin
 if uid is null then raise exception 'unauthenticated'; end if;
 if (select count(*) from public.squads where owner_id=uid and created_at>statement_timestamp()-interval '1 hour')>=5 then raise exception 'rate_limited'; end if;
 insert into public.squads(owner_id,name,description,max_members) values(uid,btrim(p_name),nullif(btrim(p_description),''),p_max_members) returning id into sid;
 insert into public.squad_members(squad_id,user_id,role) values(sid,uid,'owner'); return sid;
end $$;

create or replace function public.create_squad_invite(p_squad uuid)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); token text; digest text;
begin
 if uid is null then raise exception 'unauthenticated'; end if;
 if not exists(select 1 from public.squad_members where squad_id=p_squad and user_id=uid and role='owner') then raise exception 'forbidden'; end if;
 if (select count(*) from public.squad_invites where invited_by=uid and created_at>statement_timestamp()-interval '1 hour')>=10 then raise exception 'rate_limited'; end if;
 token:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); digest:=encode(extensions.digest(token,'sha256'),'hex');
 insert into public.squad_invites(squad_id,invited_by,code_hash,expires_at) values(p_squad,uid,digest,statement_timestamp()+interval '7 days'); return token;
end $$;

create or replace function public.accept_squad_invite(p_code text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); inv public.squad_invites; cap integer; current_count integer;
begin
 if uid is null then raise exception 'unauthenticated'; end if;
 select * into inv from public.squad_invites where code_hash=encode(extensions.digest(upper(btrim(p_code)),'sha256'),'hex') for update;
 if inv.id is null then raise exception 'invite_invalid'; end if;
 if inv.status='accepted' and inv.accepted_by=uid then return inv.squad_id; end if;
 if inv.status<>'pending' or inv.expires_at<=statement_timestamp() then raise exception 'invite_expired'; end if;
 if public.community_is_blocked(uid,inv.invited_by) then raise exception 'blocked'; end if;
 select max_members into cap from public.squads where id=inv.squad_id and closed_at is null for update;
 if cap is null then raise exception 'squad_not_found'; end if;
 select count(*) into current_count from public.squad_members where squad_id=inv.squad_id;
 if current_count>=cap then raise exception 'squad_full'; end if;
 insert into public.squad_members(squad_id,user_id,role) values(inv.squad_id,uid,'member') on conflict do nothing;
 update public.squad_invites set status='accepted',accepted_at=statement_timestamp(),accepted_by=uid where id=inv.id; return inv.squad_id;
end $$;

create or replace function public.leave_squad(p_squad uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); member_role text;
begin
 if uid is null then raise exception 'unauthenticated'; end if;
 select role into member_role from public.squad_members where squad_id=p_squad and user_id=uid;
 if member_role='owner' then raise exception 'owner_cannot_leave'; end if;
 delete from public.squad_members where squad_id=p_squad and user_id=uid;
end $$;

create or replace function public.remove_squad_member(p_squad uuid,p_member uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'unauthenticated'; end if;
 if not exists(select 1 from public.squad_members where squad_id=p_squad and user_id=uid and role='owner') then raise exception 'forbidden'; end if;
 if p_member=uid then raise exception 'owner_cannot_leave'; end if;
 delete from public.squad_members where squad_id=p_squad and user_id=p_member and role='member';
end $$;

create or replace function public.delete_squad(p_squad uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'unauthenticated'; end if;
 delete from public.squads where id=p_squad and owner_id=uid;
 if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function public.set_activity_reaction(p_activity uuid,p_reaction text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); actor uuid; begin
 if uid is null then raise exception 'unauthenticated'; end if;
 select a.actor_user_id into actor from public.community_activity a join public.community_profiles p on p.user_id=a.actor_user_id
 where a.id=p_activity and p.visibility='community' and p.show_verified_activity and p.disabled_at is null
 and (a.actor_user_id=uid or exists(select 1 from public.squad_members mine join public.squad_members theirs using(squad_id) where mine.user_id=uid and theirs.user_id=a.actor_user_id));
 if actor is null then raise exception 'activity_not_visible'; end if;
 if public.community_is_blocked(uid,actor) then raise exception 'blocked'; end if;
 if p_reaction is null then delete from public.activity_reactions where activity_id=p_activity and user_id=uid;
 else insert into public.activity_reactions(activity_id,user_id,reaction) values(p_activity,uid,p_reaction::public.community_reaction)
 on conflict(activity_id,user_id) do update set reaction=excluded.reaction,created_at=statement_timestamp(); end if;
end $$;

create or replace function public.set_community_block(p_user uuid,p_blocked boolean) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'unauthenticated'; end if; if p_user=uid then raise exception 'invalid_target'; end if;
 if p_blocked then insert into public.community_blocks values(uid,p_user,statement_timestamp()) on conflict do nothing;
 else delete from public.community_blocks where blocker_user_id=uid and blocked_user_id=p_user; end if;
end $$;

create or replace function public.report_community_target(p_type text,p_target uuid,p_reason text,p_details text default null) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); valid boolean; begin
 if uid is null then raise exception 'unauthenticated'; end if;
 if (select count(*) from public.community_reports where reporter_user_id=uid and created_at>statement_timestamp()-interval '1 hour')>=10 then raise exception 'rate_limited'; end if;
 valid:=case p_type when 'profile' then exists(select 1 from public.community_profiles where user_id=p_target)
 when 'squad' then exists(select 1 from public.squads where id=p_target) when 'activity' then exists(select 1 from public.community_activity where id=p_target) else false end;
 if not valid then raise exception 'invalid_target'; end if;
 insert into public.community_reports(reporter_user_id,target_type,target_id,reason,details) values(uid,p_type,p_target,p_reason::public.community_report_reason,nullif(btrim(p_details),'')) on conflict do nothing;
end $$;

create or replace function public.find_community_profile(p_username text) returns table(user_id uuid,display_name text,username text,avatar_url text,bio text)
language sql stable security definer set search_path=pg_catalog,public as $$
 select p.user_id,coalesce(p.display_name,'Membro NEXORA'),p.username,p.avatar_url,p.bio from public.community_profiles p
 where p.username=lower(btrim(p_username)) and p.visibility='community' and p.disabled_at is null and not public.community_is_blocked(auth.uid(),p.user_id) limit 1;
$$;

create or replace function public.get_community_home(p_limit integer default 20,p_before timestamptz default null) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 with mine as (select * from public.community_profiles where user_id=auth.uid()),
 my_squads as (select s.id,s.name,s.description,s.max_members,sm.role,s.created_at,
   (select count(*) from public.squad_members x where x.squad_id=s.id) member_count
   from public.squad_members sm join public.squads s on s.id=sm.squad_id where sm.user_id=auth.uid() and s.closed_at is null),
 visible_activity as (select a.id,a.actor_user_id,a.event_type,a.occurred_at,coalesce(p.display_name,'Membro NEXORA') display_name,p.avatar_url,
   coalesce((select jsonb_object_agg(reaction,n) from (select reaction,count(*) n from public.activity_reactions r where r.activity_id=a.id group by reaction) c),'{}'::jsonb) reactions,
   (select reaction::text from public.activity_reactions r where r.activity_id=a.id and r.user_id=auth.uid()) my_reaction
   from public.community_activity a join public.community_profiles p on p.user_id=a.actor_user_id
   where p.visibility='community' and p.show_verified_activity and p.disabled_at is null and (p_before is null or a.occurred_at<p_before)
   and not public.community_is_blocked(auth.uid(),a.actor_user_id)
   and (a.actor_user_id=auth.uid() or exists(select 1 from public.squad_members x join public.squad_members y using(squad_id) where x.user_id=auth.uid() and y.user_id=a.actor_user_id))
   order by a.occurred_at desc,a.id desc limit least(greatest(p_limit,1),50))
 select jsonb_build_object('profile',(select to_jsonb(mine)-'user_id'-'disabled_at' from mine),
  'squads',coalesce((select jsonb_agg(my_squads order by created_at desc) from my_squads),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(visible_activity order by occurred_at desc,id desc) from visible_activity),'[]'::jsonb));
$$;

create or replace function public.get_squad_detail(p_squad uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('id',s.id,'name',s.name,'description',s.description,'max_members',s.max_members,
  'role',mine.role,'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'joined_at',m.joined_at,
    'display_name',coalesce(p.display_name,'Membro NEXORA'),'avatar_url',p.avatar_url,'is_self',m.user_id=auth.uid()) order by m.role desc,m.joined_at)
   from public.squad_members m left join public.community_profiles p on p.user_id=m.user_id
   where m.squad_id=s.id and not public.community_is_blocked(auth.uid(),m.user_id)),'[]'::jsonb))
 from public.squads s join public.squad_members mine on mine.squad_id=s.id and mine.user_id=auth.uid()
 where s.id=p_squad and s.closed_at is null;
$$;

create or replace function public.community_capture_verified_activity() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.event_type='mission_completed' and new.source_type='mission' then
  insert into public.community_activity(actor_user_id,event_type,source_type,source_id,occurred_at)
  values(new.user_id,'mission_completed','mission',new.source_id,new.created_at) on conflict do nothing;
 end if; return new;
end $$;
create trigger community_verified_momentum after insert on public.momentum_events for each row execute function public.community_capture_verified_activity();

do $$ declare f text; begin foreach f in array array[
 'upsert_community_profile(text,text,text,text,boolean,boolean,boolean)','create_squad(text,text,integer)','create_squad_invite(uuid)','accept_squad_invite(text)',
 'leave_squad(uuid)','remove_squad_member(uuid,uuid)','delete_squad(uuid)','set_activity_reaction(uuid,text)','set_community_block(uuid,boolean)',
 'report_community_target(text,uuid,text,text)','find_community_profile(text)','get_community_home(integer,timestamptz)','get_squad_detail(uuid)'] loop
 execute format('revoke all on function public.%s from public, anon',f); execute format('grant execute on function public.%s to authenticated',f); end loop; end $$;
revoke all on function public.community_capture_verified_activity() from public,anon,authenticated;
