-- KIVRYN Community V3: real member network, profile-gated chat, read state and restrained official prompts.

alter table public.community_channels
  add column if not exists description text;

alter table public.community_memberships
  add column if not exists last_read_at timestamptz not null default now();

create index if not exists community_memberships_read_idx
  on public.community_memberships(user_id, channel_id, last_read_at);

update public.community_channels
set name = 'KIVRYN Community',
    description = 'Converse com outros membros, compartilhe progresso, dúvidas e aprendizados do dia.'
where slug = 'nexora-community';

update public.community_channels
set name = 'KIVRYN Premium Lounge',
    description = 'Espaço Premium para conversas mais focadas sobre execução, criação, estudos e crescimento.'
where slug = 'nexora-community-plus';

create or replace function public.community_public_user_id(p_user uuid)
returns text
language sql
immutable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select case
    when p_user is null then null
    else encode(extensions.digest(p_user::text, 'sha256'), 'hex')
  end;
$$;

revoke all on function public.community_public_user_id(uuid) from public, anon, authenticated;

create or replace function public.community_profile_ready(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from public.community_profiles p
    where p.user_id = p_user
      and p.visibility = 'community'
      and p.disabled_at is null
      and nullif(btrim(p.display_name), '') is not null
      and nullif(btrim(p.username), '') is not null
  );
$$;

revoke all on function public.community_profile_ready(uuid) from public, anon, authenticated;

create or replace function public.get_official_communities()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'name', c.name,
        'description', c.description,
        'premium', c.requires_premium,
        'eligible', not c.requires_premium or public.has_premium(auth.uid()),
        'joined', m.status is not null and m.left_at is null,
        'membership_status', m.status,
        'notification_mode', coalesce(m.notification_mode, 'highlights'),
        'member_count', (
          select count(*)
          from public.community_memberships members
          where members.channel_id = c.id
            and members.left_at is null
            and members.status in ('active', 'muted')
        ),
        'unread_count', case
          when m.user_id is null or m.left_at is not null then 0
          else (
            select count(*)
            from public.community_messages unread
            where unread.channel_id = c.id
              and unread.removed_at is null
              and unread.created_at > coalesce(m.last_read_at, m.joined_at)
              and (unread.user_id is null or unread.user_id <> auth.uid())
          )
        end,
        'recent_body', case
          when recent.removed_at is null then recent.body
          else 'Mensagem removida.'
        end,
        'recent_at', recent.created_at
      )
      order by c.requires_premium
    ),
    '[]'::jsonb
  )
  from public.community_channels c
  left join public.community_memberships m
    on m.channel_id = c.id and m.user_id = auth.uid()
  left join lateral (
    select body, created_at, removed_at
    from public.community_messages
    where channel_id = c.id
    order by created_at desc, id desc
    limit 1
  ) recent on true
  where c.official and auth.uid() is not null;
$$;

create or replace function public.join_official_community(p_channel uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  premium boolean;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if not public.community_profile_ready(uid) then raise exception 'profile_required'; end if;

  select requires_premium into premium
  from public.community_channels
  where id = p_channel and official;

  if not found then raise exception 'channel_not_found'; end if;
  if premium and not public.has_premium(uid) then raise exception 'premium_required'; end if;

  insert into public.community_memberships(channel_id, user_id, last_read_at)
  values(p_channel, uid, statement_timestamp())
  on conflict(channel_id, user_id) do update
    set left_at = null,
        last_read_at = statement_timestamp(),
        status = case
          when community_memberships.status = 'removed' then 'removed'::public.community_membership_status
          else 'active'::public.community_membership_status
        end;

  if (select status from public.community_memberships where channel_id = p_channel and user_id = uid) = 'removed'
    then raise exception 'membership_removed';
  end if;
end;
$$;

create or replace function public.send_community_message(
  p_channel uuid,
  p_body text,
  p_client_request_id uuid,
  p_reply_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  state public.community_membership_status;
  result uuid;
  premium boolean;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  if not public.community_profile_ready(uid) then raise exception 'profile_required'; end if;
  if p_client_request_id is null then raise exception 'request_id_required'; end if;

  select m.status, c.requires_premium into state, premium
  from public.community_memberships m
  join public.community_channels c on c.id = m.channel_id
  where m.channel_id = p_channel and m.user_id = uid and m.left_at is null
  for update;

  if state is null then raise exception 'membership_required'; end if;
  if state not in ('active', 'muted') then raise exception 'membership_restricted'; end if;
  if premium and not public.has_premium(uid) then raise exception 'premium_required'; end if;
  if char_length(btrim(p_body)) not between 1 and 1200 then raise exception 'message_length'; end if;

  select id into result
  from public.community_messages
  where user_id = uid and client_request_id = p_client_request_id;
  if result is not null then return result; end if;

  if (select count(*) from public.community_messages where user_id = uid and created_at > statement_timestamp() - interval '1 minute') >= 12 then
    update public.community_memberships
    set rejected_post_count = rejected_post_count + 1
    where channel_id = p_channel and user_id = uid;
    raise exception 'rate_limited';
  end if;

  if exists(
    select 1 from public.community_messages
    where user_id = uid
      and channel_id = p_channel
      and body = btrim(p_body)
      and created_at > statement_timestamp() - interval '20 seconds'
  ) then raise exception 'duplicate_message'; end if;

  if p_reply_to is not null and not exists(
    select 1 from public.community_messages
    where id = p_reply_to and channel_id = p_channel and removed_at is null
  ) then raise exception 'invalid_reply'; end if;

  insert into public.community_messages(channel_id, user_id, body, client_request_id, reply_to_id)
  values(p_channel, uid, btrim(p_body), p_client_request_id, p_reply_to)
  returning id into result;

  update public.community_memberships
  set last_read_at = statement_timestamp()
  where channel_id = p_channel and user_id = uid;

  return result;
end;
$$;

create or replace function public.mark_community_read(p_channel uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.community_memberships
  set last_read_at = statement_timestamp()
  where channel_id = p_channel
    and user_id = auth.uid()
    and left_at is null
    and status in ('active', 'muted');

  if not found then raise exception 'membership_required'; end if;
end;
$$;

create or replace function public.get_community_public_profile(p_sender_public_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with target as (
    select p.*
    from public.community_profiles p
    where public.community_public_user_id(p.user_id) = lower(btrim(p_sender_public_id))
      and p.visibility = 'community'
      and p.disabled_at is null
      and not public.community_is_blocked(auth.uid(), p.user_id)
      and exists(
        select 1
        from public.community_memberships mine
        join public.community_memberships theirs
          on theirs.channel_id = mine.channel_id
        where mine.user_id = auth.uid()
          and theirs.user_id = p.user_id
          and mine.left_at is null
          and theirs.left_at is null
          and mine.status in ('active', 'muted')
          and theirs.status in ('active', 'muted')
      )
    limit 1
  )
  select case when exists(select 1 from target) then (
    select jsonb_build_object(
      'sender_public_id', public.community_public_user_id(t.user_id),
      'display_name', t.display_name,
      'username', t.username,
      'avatar_url', t.avatar_url,
      'bio', t.bio,
      'show_momentum', t.show_momentum,
      'show_streak', t.show_streak,
      'show_verified_activity', t.show_verified_activity
    )
    from target t
  ) else null end;
$$;

create or replace function public.get_community_messages(
  p_channel uuid,
  p_before timestamptz default null,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with allowed as (
    select 1
    from public.community_memberships m
    join public.community_channels c on c.id = m.channel_id
    where m.channel_id = p_channel
      and m.user_id = auth.uid()
      and m.left_at is null
      and m.status in ('active', 'muted')
      and (not c.requires_premium or public.has_premium(auth.uid()))
  ),
  page as (
    select msg.*
    from public.community_messages msg, allowed
    where msg.channel_id = p_channel
      and (p_before is null or msg.created_at < p_before)
    order by msg.created_at desc, msg.id desc
    limit least(greatest(p_limit, 1), 50)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'client_request_id', p.client_request_id,
        'body', case when p.removed_at is null then p.body else 'Mensagem removida.' end,
        'created_at', p.created_at,
        'actor_type', p.actor_type,
        'sender_public_id', public.community_public_user_id(p.user_id),
        'display_name', case
          when p.actor_type = 'system' then 'KIVRYN'
          else coalesce(cp.display_name, 'Membro KIVRYN')
        end,
        'avatar_url', case when p.actor_type = 'user' then cp.avatar_url end,
        'is_self', p.user_id = auth.uid(),
        'removed', p.removed_at is not null,
        'reply_to_id', p.reply_to_id,
        'reactions', coalesce(rx.counts, '{}'::jsonb),
        'my_reaction', mine.reaction
      )
      order by p.created_at, p.id
    ),
    '[]'::jsonb
  )
  from page p
  left join public.community_profiles cp on cp.user_id = p.user_id
  left join lateral (
    select jsonb_object_agg(reaction, n) counts
    from (
      select reaction, count(*) n
      from public.community_message_reactions
      where message_id = p.id
      group by reaction
    ) x
  ) rx on true
  left join public.community_message_reactions mine
    on mine.message_id = p.id and mine.user_id = auth.uid()
  where p.user_id is null or not public.community_is_blocked(auth.uid(), p.user_id);
$$;

-- One transparent official conversation starter per day at most. It never impersonates a member.
create or replace function public.evaluate_community_host_prompt(
  p_channel uuid,
  p_now timestamptz default now(),
  p_timezone text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  local_now timestamp;
  day date;
  prompt text;
  prompt_index integer;
  key text;
  result uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;

  if not exists(
    select 1 from public.community_memberships
    where channel_id = p_channel
      and left_at is null
      and status in ('active', 'muted')
  ) then return null; end if;

  local_now := p_now at time zone p_timezone;
  day := local_now::date;

  -- Keep official prompts in a natural daytime window and never more than once per day.
  if extract(hour from local_now) < 9 or extract(hour from local_now) > 19 then return null; end if;

  insert into public.community_host_daily_state(channel_id, local_day, timezone)
  values(p_channel, day, p_timezone)
  on conflict do nothing;

  if exists(
    select 1 from public.community_host_daily_state
    where channel_id = p_channel and local_day = day and sent_count >= 1
  ) then return null; end if;

  prompt_index := extract(doy from day)::integer % 5;
  prompt := case prompt_index
    when 0 then 'Check-in do dia: qual é a prioridade mais importante para você hoje?'
    when 1 then 'O que travou seu progresso hoje? Talvez alguém aqui já tenha passado pelo mesmo.'
    when 2 then 'Compartilhe uma pequena vitória de hoje — tarefa, estudo, projeto ou criação.'
    when 3 then 'Qual parte do KIVRYN mais ajudou você esta semana? O que ainda deveria melhorar?'
    else 'Se você pudesse receber uma dica da comunidade agora, sobre o que seria?'
  end;

  key := 'kivryn:' || day::text || ':daily';
  insert into public.community_messages(channel_id, actor_type, message_type, body, host_key, created_at)
  values(p_channel, 'system', 'host_prompt', prompt, key, p_now)
  on conflict(channel_id, host_key) do nothing
  returning id into result;

  if result is not null then
    update public.community_host_daily_state
    set sent_count = 1,
        last_sent_at = p_now,
        last_message_type = 'DAILY_COMMUNITY_PROMPT'
    where channel_id = p_channel and local_day = day;
  end if;

  return result;
end;
$$;

create or replace function public.run_kivryn_community_host_cron()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  community_record record;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  for community_record in
    select id from public.community_channels where official = true
  loop
    perform public.evaluate_community_host_prompt(community_record.id, now(), 'America/Sao_Paulo');
  end loop;
end;
$$;

revoke all on function public.get_official_communities() from public, anon;
grant execute on function public.get_official_communities() to authenticated;
revoke all on function public.join_official_community(uuid) from public, anon;
grant execute on function public.join_official_community(uuid) to authenticated;
revoke all on function public.send_community_message(uuid,text,uuid,uuid) from public, anon;
grant execute on function public.send_community_message(uuid,text,uuid,uuid) to authenticated;
revoke all on function public.mark_community_read(uuid) from public, anon;
grant execute on function public.mark_community_read(uuid) to authenticated;
revoke all on function public.get_community_public_profile(text) from public, anon;
grant execute on function public.get_community_public_profile(text) to authenticated;
revoke all on function public.get_community_messages(uuid,timestamptz,integer) from public, anon;
grant execute on function public.get_community_messages(uuid,timestamptz,integer) to authenticated;
revoke all on function public.evaluate_community_host_prompt(uuid,timestamptz,text) from public, anon, authenticated;
grant execute on function public.evaluate_community_host_prompt(uuid,timestamptz,text) to service_role;
revoke all on function public.run_kivryn_community_host_cron() from public, anon, authenticated, service_role;

-- Replace the legacy scheduler only when pg_cron is installed.
do $$
declare
  legacy_job bigint;
begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    for legacy_job in
      select jobid from cron.job where jobname in ('nexora-community-host', 'kivryn-community-host')
    loop
      perform cron.unschedule(legacy_job);
    end loop;
    perform cron.schedule(
      'kivryn-community-host',
      '0 * * * *',
      'select public.run_kivryn_community_host_cron();'
    );
  end if;
end;
$$;
