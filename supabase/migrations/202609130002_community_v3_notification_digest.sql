-- Service-only unread summary for scheduled Community notifications.
create or replace function public.get_community_notification_digests(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'channel_id', c.id,
        'name', c.name,
        'unread_count', unread.count,
        'notification_mode', m.notification_mode
      )
      order by c.requires_premium
    ),
    '[]'::jsonb
  )
  into result
  from public.community_memberships m
  join public.community_channels c on c.id = m.channel_id
  join lateral (
    select count(*)::integer as count
    from public.community_messages msg
    where msg.channel_id = c.id
      and msg.removed_at is null
      and msg.created_at > coalesce(m.last_read_at, m.joined_at)
      and (msg.user_id is null or msg.user_id <> p_user)
  ) unread on true
  where m.user_id = p_user
    and m.left_at is null
    and m.status in ('active', 'muted')
    and m.notification_mode <> 'muted'
    and unread.count > 0
    and (not c.requires_premium or public.has_premium(p_user));

  return result;
end;
$$;

revoke all on function public.get_community_notification_digests(uuid) from public, anon, authenticated;
grant execute on function public.get_community_notification_digests(uuid) to service_role;
