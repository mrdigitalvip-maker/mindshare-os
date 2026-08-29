-- Community Live: additive official chat channels with server-owned access and moderation.
create type public.community_membership_status as enum ('active','muted','restricted','removed');
create type public.community_notification_mode as enum ('highlights','all','muted');
create type public.community_message_actor as enum ('user','system');
create type public.community_message_reaction as enum ('clap','fire','strong','heart');

create table public.community_channels (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 name text not null, requires_premium boolean not null default false,
 official boolean not null default true, posting_enabled boolean not null default true,
 created_at timestamptz not null default now(),
 check (slug in ('nexora-community','nexora-community-plus'))
);
insert into public.community_channels(slug,name,requires_premium) values
 ('nexora-community','NEXORA Community',false),
 ('nexora-community-plus','NEXORA Community+',true) on conflict(slug) do nothing;

create table public.community_memberships (
 channel_id uuid not null references public.community_channels(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status public.community_membership_status not null default 'active',
 notification_mode public.community_notification_mode not null default 'highlights',
 joined_at timestamptz not null default now(), left_at timestamptz,
 rejected_post_count integer not null default 0,
 primary key(channel_id,user_id)
);
create index community_memberships_user_idx on public.community_memberships(user_id,joined_at desc);

create table public.community_messages (
 id uuid primary key default gen_random_uuid(), channel_id uuid not null references public.community_channels(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 actor_type public.community_message_actor not null default 'user',
 message_type text not null default 'message' check(message_type in ('message','host_prompt','welcome','moderation')),
 body text not null check(char_length(btrim(body)) between 1 and 1200),
 client_request_id uuid, reply_to_id uuid references public.community_messages(id) on delete set null,
 host_key text, created_at timestamptz not null default now(),
 removed_at timestamptz, removal_kind text check(removal_kind is null or removal_kind in ('user','moderator','system')),
 check ((actor_type='user' and user_id is not null and host_key is null) or (actor_type='system' and user_id is null and host_key is not null)),
 unique(user_id,client_request_id), unique(channel_id,host_key)
);
create index community_messages_page_idx on public.community_messages(channel_id,created_at desc,id desc);

create table public.community_message_reactions (
 message_id uuid not null references public.community_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction public.community_message_reaction not null, created_at timestamptz not null default now(),
 primary key(message_id,user_id)
);
create table public.community_host_daily_state (
 channel_id uuid not null references public.community_channels(id) on delete cascade,
 local_day date not null, timezone text not null default 'America/Sao_Paulo', sent_count smallint not null default 0,
 last_sent_at timestamptz, last_message_type text, primary key(channel_id,local_day)
);

alter table public.community_channels enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_message_reactions enable row level security;
alter table public.community_host_daily_state enable row level security;
revoke all on public.community_channels,public.community_memberships,public.community_messages,
 public.community_message_reactions,public.community_host_daily_state from anon,authenticated;
grant select on public.community_messages,public.community_message_reactions to authenticated;
create policy "member realtime messages" on public.community_messages for select to authenticated using(
 exists(select 1 from public.community_memberships m join public.community_channels c on c.id=m.channel_id where m.channel_id=community_messages.channel_id and m.user_id=auth.uid() and m.left_at is null and m.status in ('active','muted') and (not c.requires_premium or public.has_premium(auth.uid()))) and (user_id is null or not public.community_is_blocked(auth.uid(),user_id)));
create policy "member realtime reactions" on public.community_message_reactions for select to authenticated using(
 exists(select 1 from public.community_messages x join public.community_memberships m on m.channel_id=x.channel_id where x.id=community_message_reactions.message_id and m.user_id=auth.uid() and m.left_at is null and m.status in ('active','muted')));

create or replace function public.get_official_communities() returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'slug',c.slug,'name',c.name,'premium',c.requires_premium,
  'eligible',not c.requires_premium or public.has_premium(auth.uid()),
  'joined',m.status is not null and m.left_at is null,
  'membership_status',m.status,'notification_mode',coalesce(m.notification_mode,'highlights'),
  'recent_body',case when recent.removed_at is null then recent.body else 'Mensagem removida.' end,
  'recent_at',recent.created_at) order by c.requires_premium),'[]'::jsonb)
 from public.community_channels c left join public.community_memberships m on m.channel_id=c.id and m.user_id=auth.uid()
 left join lateral (select body,created_at,removed_at from public.community_messages where channel_id=c.id order by created_at desc,id desc limit 1) recent on true
 where c.official and auth.uid() is not null;
$$;

create or replace function public.join_official_community(p_channel uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); premium boolean; begin
 if uid is null then raise exception 'unauthenticated'; end if;
 select requires_premium into premium from public.community_channels where id=p_channel and official;
 if not found then raise exception 'channel_not_found'; end if;
 if premium and not public.has_premium(uid) then raise exception 'premium_required'; end if;
 insert into public.community_memberships(channel_id,user_id) values(p_channel,uid)
 on conflict(channel_id,user_id) do update set left_at=null,status=case when community_memberships.status='removed' then 'removed'::public.community_membership_status else 'active'::public.community_membership_status end;
 if (select status from public.community_memberships where channel_id=p_channel and user_id=uid)='removed' then raise exception 'membership_removed'; end if;
end $$;

create or replace function public.leave_official_community(p_channel uuid) returns void
language sql security definer set search_path=pg_catalog,public as $$
 update public.community_memberships set left_at=statement_timestamp() where channel_id=p_channel and user_id=auth.uid();
$$;
create or replace function public.set_community_notifications(p_channel uuid,p_mode text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$ begin
 update public.community_memberships set notification_mode=p_mode::public.community_notification_mode
 where channel_id=p_channel and user_id=auth.uid() and left_at is null;
 if not found then raise exception 'membership_required'; end if;
end $$;

create or replace function public.get_community_messages(p_channel uuid,p_before timestamptz default null,p_limit integer default 30) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 with allowed as (select 1 from public.community_memberships m join public.community_channels c on c.id=m.channel_id
  where m.channel_id=p_channel and m.user_id=auth.uid() and m.left_at is null and m.status in ('active','muted')
  and (not c.requires_premium or public.has_premium(auth.uid()))),
 page as (select msg.* from public.community_messages msg,allowed where msg.channel_id=p_channel
  and (p_before is null or msg.created_at<p_before) order by msg.created_at desc,msg.id desc limit least(greatest(p_limit,1),50))
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'client_request_id',p.client_request_id,
  'body',case when p.removed_at is null then p.body else 'Mensagem removida.' end,'created_at',p.created_at,
  'actor_type',p.actor_type,'sender_public_id',case when p.user_id is null then null else encode(extensions.digest(p.user_id::text,'sha256'),'hex') end,
  'display_name',case when p.actor_type='system' then 'NEXORA Host' else coalesce(cp.display_name,'Membro NEXORA') end,
  'avatar_url',case when p.actor_type='user' then cp.avatar_url end,'is_self',p.user_id=auth.uid(),'removed',p.removed_at is not null,
  'reply_to_id',p.reply_to_id,'reactions',coalesce(rx.counts,'{}'::jsonb),'my_reaction',mine.reaction) order by p.created_at,p.id),'[]'::jsonb)
 from page p left join public.community_profiles cp on cp.user_id=p.user_id
 left join lateral(select jsonb_object_agg(reaction,n) counts from (select reaction,count(*) n from public.community_message_reactions where message_id=p.id group by reaction) x) rx on true
 left join public.community_message_reactions mine on mine.message_id=p.id and mine.user_id=auth.uid()
 where p.user_id is null or not public.community_is_blocked(auth.uid(),p.user_id);
$$;

create or replace function public.send_community_message(p_channel uuid,p_body text,p_client_request_id uuid,p_reply_to uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); state public.community_membership_status; result uuid; premium boolean; begin
 if uid is null then raise exception 'unauthenticated'; end if;
 if p_client_request_id is null then raise exception 'request_id_required'; end if;
 select m.status,c.requires_premium into state,premium from public.community_memberships m join public.community_channels c on c.id=m.channel_id
 where m.channel_id=p_channel and m.user_id=uid and m.left_at is null for update;
 if state is null then raise exception 'membership_required'; end if;
 if state not in ('active','muted') then raise exception 'membership_restricted'; end if;
 if premium and not public.has_premium(uid) then raise exception 'premium_required'; end if;
 if char_length(btrim(p_body)) not between 1 and 1200 then raise exception 'message_length'; end if;
 select id into result from public.community_messages where user_id=uid and client_request_id=p_client_request_id;
 if result is not null then return result; end if;
 if (select count(*) from public.community_messages where user_id=uid and created_at>statement_timestamp()-interval '1 minute')>=12 then
  update public.community_memberships set rejected_post_count=rejected_post_count+1 where channel_id=p_channel and user_id=uid; raise exception 'rate_limited'; end if;
 if exists(select 1 from public.community_messages where user_id=uid and channel_id=p_channel and body=btrim(p_body) and created_at>statement_timestamp()-interval '20 seconds') then raise exception 'duplicate_message'; end if;
 if p_reply_to is not null and not exists(select 1 from public.community_messages where id=p_reply_to and channel_id=p_channel and removed_at is null) then raise exception 'invalid_reply'; end if;
 insert into public.community_messages(channel_id,user_id,body,client_request_id,reply_to_id) values(p_channel,uid,btrim(p_body),p_client_request_id,p_reply_to) returning id into result; return result;
end $$;

create or replace function public.set_message_reaction(p_message uuid,p_reaction text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$ declare uid uuid:=auth.uid(); cid uuid; begin
 select channel_id into cid from public.community_messages where id=p_message and removed_at is null;
 if not exists(select 1 from public.community_memberships where channel_id=cid and user_id=uid and left_at is null and status in ('active','muted')) then raise exception 'membership_required'; end if;
 if p_reaction is null then delete from public.community_message_reactions where message_id=p_message and user_id=uid;
 else insert into public.community_message_reactions values(p_message,uid,p_reaction::public.community_message_reaction,statement_timestamp())
 on conflict(message_id,user_id) do update set reaction=excluded.reaction,created_at=excluded.created_at; end if;
end $$;

create or replace function public.report_community_message(p_message uuid,p_reason text,p_details text default null) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$ begin
 if not exists(select 1 from public.community_messages x join public.community_memberships m on m.channel_id=x.channel_id where x.id=p_message and m.user_id=auth.uid() and m.left_at is null) then raise exception 'invalid_target'; end if;
 insert into public.community_reports(reporter_user_id,target_type,target_id,reason,details) values(auth.uid(),'message',p_message,p_reason::public.community_report_reason,nullif(btrim(p_details),'')) on conflict do nothing;
end $$;
create or replace function public.block_community_message_sender(p_message uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$ declare target uuid; begin
 select user_id into target from public.community_messages where id=p_message;
 if target is null or target=auth.uid() then raise exception 'invalid_target'; end if;
 insert into public.community_blocks(blocker_user_id,blocked_user_id) values(auth.uid(),target) on conflict do nothing;
end $$;
alter table public.community_reports drop constraint community_reports_target_type_check;
alter table public.community_reports add constraint community_reports_target_type_check check(target_type in ('profile','squad','activity','message'));

-- Service-role-only single iteration. External cron calls this RPC; it never loops or sees workspace data.
create or replace function public.evaluate_community_host_prompt(p_channel uuid,p_now timestamptz default now(),p_timezone text default 'America/Sao_Paulo') returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare local_now timestamp; day date; kind text; prompt text; key text; state public.community_host_daily_state; result uuid; begin
 if auth.role()<>'service_role' then raise exception 'forbidden'; end if;
 local_now:=p_now at time zone p_timezone; day:=local_now::date;
 kind:=case when extract(hour from local_now) between 7 and 10 then 'MORNING_CHECK_IN' when extract(hour from local_now) between 12 and 14 then 'MIDDAY_PROGRESS' when extract(hour from local_now) between 17 and 20 then 'EVENING_REFLECTION' end;
 if kind is null then return null; end if;
 insert into public.community_host_daily_state(channel_id,local_day,timezone) values(p_channel,day,p_timezone) on conflict do nothing;
 select * into state from public.community_host_daily_state where channel_id=p_channel and local_day=day for update;
 if state.sent_count>=2 or state.last_sent_at>p_now-interval '4 hours' or state.last_message_type=kind then return null; end if;
 if exists(select 1 from public.community_messages where channel_id=p_channel and actor_type='user' and created_at>p_now-interval '45 minutes') then return null; end if;
 prompt:=case kind when 'MORNING_CHECK_IN' then 'Bom dia 👋 Como estão as prioridades de hoje?' when 'MIDDAY_PROGRESS' then 'Quem conseguiu avançar a missão de hoje?' else 'Fim de tarde: o que você conseguiu concluir hoje?' end;
 key:=day::text||':'||kind; insert into public.community_messages(channel_id,actor_type,message_type,body,host_key,created_at)
 values(p_channel,'system','host_prompt',prompt,key,p_now) on conflict(channel_id,host_key) do nothing returning id into result;
 if result is not null then update public.community_host_daily_state set sent_count=sent_count+1,last_sent_at=p_now,last_message_type=kind where channel_id=p_channel and local_day=day; end if; return result;
end $$;

do $$ declare f text; begin foreach f in array array['get_official_communities()','join_official_community(uuid)','leave_official_community(uuid)',
 'set_community_notifications(uuid,text)','get_community_messages(uuid,timestamptz,integer)','send_community_message(uuid,text,uuid,uuid)',
 'set_message_reaction(uuid,text)','report_community_message(uuid,text,text)','block_community_message_sender(uuid)'] loop execute format('revoke all on function public.%s from public,anon',f); execute format('grant execute on function public.%s to authenticated',f); end loop; end $$;
revoke all on function public.evaluate_community_host_prompt(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.evaluate_community_host_prompt(uuid,timestamptz,text) to service_role;
alter publication supabase_realtime add table public.community_messages;
alter publication supabase_realtime add table public.community_message_reactions;
