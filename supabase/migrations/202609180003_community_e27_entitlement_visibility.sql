-- E27 — official Community entitlement visibility.
-- Free users receive only Free official communities.
-- Premium users receive both Free and Premium communities.
create or replace function public.get_official_communities()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with viewer as (
    select auth.uid() as uid,
           public.has_premium(auth.uid()) as premium
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'name', c.name,
        'description', c.description,
        'premium', c.requires_premium,
        'eligible', true,
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
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
          then 0
          else (
            select count(*)
            from public.community_messages unread
            where unread.channel_id = c.id
              and unread.removed_at is null
              and unread.created_at > coalesce(m.last_read_at, m.joined_at)
              and (unread.user_id is null or unread.user_id <> viewer.uid)
          )
        end,
        'recent_body', case
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
          then null
          when recent.removed_at is null then recent.body
          else 'Mensagem removida.'
        end,
        'recent_at', case
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
          then null
          else recent.created_at
        end
      )
      order by c.requires_premium, c.created_at
    ),
    '[]'::jsonb
  )
  from public.community_channels c
  cross join viewer
  left join public.community_memberships m
    on m.channel_id = c.id and m.user_id = viewer.uid
  left join lateral (
    select body, created_at, removed_at
    from public.community_messages
    where channel_id = c.id
    order by created_at desc, id desc
    limit 1
  ) recent on true
  where c.official
    and viewer.uid is not null
    and (not c.requires_premium or viewer.premium);
$$;

revoke all on function public.get_official_communities() from public, anon;
grant execute on function public.get_official_communities() to authenticated;
