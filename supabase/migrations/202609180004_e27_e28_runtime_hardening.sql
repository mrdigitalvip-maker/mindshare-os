-- E27/E28 — entitlement-safe Community interactions + Realtime/Arena query hardening.

create index if not exists community_messages_reply_to_id_idx
  on public.community_messages(reply_to_id)
  where reply_to_id is not null;

create index if not exists community_message_reactions_user_id_idx
  on public.community_message_reactions(user_id);

create index if not exists user_challenges_challenge_id_idx
  on public.user_challenges(challenge_id);

drop policy if exists "member realtime messages" on public.community_messages;
create policy "member realtime messages"
on public.community_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.community_memberships m
    join public.community_channels c on c.id = m.channel_id
    where m.channel_id = community_messages.channel_id
      and m.user_id = (select auth.uid())
      and m.left_at is null
      and m.status in ('active','muted')
      and (not c.requires_premium or public.has_premium((select auth.uid())))
  )
  and (
    user_id is null
    or not public.community_is_blocked((select auth.uid()), user_id)
  )
);

drop policy if exists "member realtime reactions" on public.community_message_reactions;
create policy "member realtime reactions"
on public.community_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.community_messages x
    join public.community_memberships m on m.channel_id = x.channel_id
    join public.community_channels c on c.id = x.channel_id
    where x.id = community_message_reactions.message_id
      and m.user_id = (select auth.uid())
      and m.left_at is null
      and m.status in ('active','muted')
      and (not c.requires_premium or public.has_premium((select auth.uid())))
  )
);

drop policy if exists "owners read participation" on public.user_challenges;
create policy "owners read participation"
on public.user_challenges
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.set_message_reaction(p_message uuid, p_reaction text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select x.channel_id into cid
  from public.community_messages x
  join public.community_memberships m
    on m.channel_id = x.channel_id
   and m.user_id = uid
   and m.left_at is null
   and m.status in ('active','muted')
  join public.community_channels c on c.id = x.channel_id
  where x.id = p_message
    and x.removed_at is null
    and (not c.requires_premium or public.has_premium(uid));

  if cid is null then raise exception 'membership_required'; end if;

  if p_reaction is null then
    delete from public.community_message_reactions
    where message_id = p_message and user_id = uid;
  else
    insert into public.community_message_reactions(message_id,user_id,reaction,created_at)
    values(p_message,uid,p_reaction::public.community_message_reaction,statement_timestamp())
    on conflict(message_id,user_id) do update
      set reaction=excluded.reaction,
          created_at=excluded.created_at;
  end if;
end;
$$;

revoke all on function public.set_message_reaction(uuid,text) from public, anon;
grant execute on function public.set_message_reaction(uuid,text) to authenticated;

create or replace function public.report_community_message(
  p_message uuid,
  p_reason text,
  p_details text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  if not exists(
    select 1
    from public.community_messages x
    join public.community_memberships m
      on m.channel_id=x.channel_id
     and m.user_id=uid
     and m.left_at is null
     and m.status in ('active','muted')
    join public.community_channels c on c.id=x.channel_id
    where x.id=p_message
      and (not c.requires_premium or public.has_premium(uid))
  ) then
    raise exception 'invalid_target';
  end if;

  insert into public.community_reports(reporter_user_id,target_type,target_id,reason,details)
  values(uid,'message',p_message,p_reason::public.community_report_reason,nullif(btrim(p_details),''))
  on conflict do nothing;
end;
$$;

revoke all on function public.report_community_message(uuid,text,text) from public, anon;
grant execute on function public.report_community_message(uuid,text,text) to authenticated;

create or replace function public.block_community_message_sender(p_message uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select x.user_id into target
  from public.community_messages x
  join public.community_memberships m
    on m.channel_id=x.channel_id
   and m.user_id=uid
   and m.left_at is null
   and m.status in ('active','muted')
  join public.community_channels c on c.id=x.channel_id
  where x.id=p_message
    and x.user_id is not null
    and (not c.requires_premium or public.has_premium(uid));

  if target is null or target=uid then raise exception 'invalid_target'; end if;

  insert into public.community_blocks(blocker_user_id,blocked_user_id)
  values(uid,target)
  on conflict do nothing;
end;
$$;

revoke all on function public.block_community_message_sender(uuid) from public, anon;
grant execute on function public.block_community_message_sender(uuid) to authenticated;
