-- E29 — canonical Premium/runtime authority.
-- Provider semantics live here so Web, Android, Community, Agents and AI gates converge.

create or replace function public.has_premium(
  p_user uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from public.subscriptions s
    where s.user_id = p_user
      and s.entitlement = 'premium'
      and (
        (
          s.provider = 'google_play'
          and s.status in ('active','grace_period','canceled')
          and s.current_period_end is not null
          and s.current_period_end > p_at
        )
        or
        (
          s.provider = 'stripe'
          and s.status in ('active','trialing')
          and (s.current_period_end is null or s.current_period_end > p_at)
        )
        or
        (
          s.provider = 'manual'
          and s.status in ('active','trialing')
          and (s.current_period_end is null or s.current_period_end > p_at)
        )
      )
  );
$$;

create or replace function public.get_subscription_runtime()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  sub public.subscriptions;
  subscription_premium boolean := false;
  internal_access boolean := false;
  effective_premium boolean := false;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select *
  into sub
  from public.subscriptions s
  where s.user_id = uid
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;

  subscription_premium := public.has_premium(uid);
  internal_access := public.has_internal_full_access(uid);
  effective_premium := subscription_premium or internal_access;

  return jsonb_build_object(
    'is_premium', effective_premium,
    'subscription_premium', subscription_premium,
    'internal_access', internal_access,
    'effective_entitlement', case when effective_premium then 'premium' else 'free' end,
    'provider', sub.provider,
    'status', sub.status,
    'plan', case when effective_premium then 'pro' else 'free' end,
    'current_period_end', sub.current_period_end,
    'cancel_at_period_end', coalesce(sub.cancel_at_period_end,false),
    'source', case
      when internal_access then 'internal_override'
      else 'subscriptions'
    end
  );
end;
$$;

revoke all on function public.get_subscription_runtime() from public, anon;
grant execute on function public.get_subscription_runtime() to authenticated;
