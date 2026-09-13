-- Do not expose conversation previews to users who have not joined or are not eligible.
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
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
            or (c.requires_premium and not public.has_premium(auth.uid()))
          then 0
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
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
            or (c.requires_premium and not public.has_premium(auth.uid()))
          then null
          when recent.removed_at is null then recent.body
          else 'Mensagem removida.'
        end,
        'recent_at', case
          when m.user_id is null
            or m.left_at is not null
            or m.status not in ('active', 'muted')
            or (c.requires_premium and not public.has_premium(auth.uid()))
          then null
          else recent.created_at
        end
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

revoke all on function public.get_official_communities() from public, anon;
grant execute on function public.get_official_communities() to authenticated;
