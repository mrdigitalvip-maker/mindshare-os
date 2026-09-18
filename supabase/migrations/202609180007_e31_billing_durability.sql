-- E31 — Stripe billing durability.
-- Immutable trial consumption and atomic webhook event/state convergence.

create table if not exists public.subscription_trial_ledger (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_trial_started_at timestamptz not null,
  stripe_subscription_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists subscription_trial_ledger_stripe_subscription_idx
  on public.subscription_trial_ledger(stripe_subscription_id);

alter table public.subscription_trial_ledger enable row level security;
revoke all on table public.subscription_trial_ledger from public, anon, authenticated;

-- Existing Stripe users must never become first-trial eligible just because this ledger is new.
insert into public.subscription_trial_ledger(user_id, first_trial_started_at, stripe_subscription_id)
select s.user_id, coalesce(s.created_at, now()), s.stripe_subscription_id
from public.subscriptions s
where s.provider='stripe'
  and s.stripe_subscription_id is not null
  and s.user_id is not null
on conflict(user_id) do nothing;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created_at timestamptz not null,
  user_id uuid references public.profiles(id) on delete set null,
  stripe_subscription_id text,
  outcome text not null check (outcome in ('applied','stale')),
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_user_created_idx
  on public.stripe_webhook_events(user_id,event_created_at desc);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;

alter table public.subscriptions
  add column if not exists stripe_last_event_created_at timestamptz,
  add column if not exists stripe_last_event_id text;

create or replace function public.persist_stripe_subscription_state(
  p_user uuid,
  p_customer_id text,
  p_subscription_id text,
  p_product_id text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_subscription_created_at timestamptz,
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_trial_started_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entitled boolean;
  v_outcome text := 'applied';
begin
  if p_user is null
     or nullif(btrim(p_subscription_id),'') is null
     or nullif(btrim(p_event_id),'') is null
     or p_event_created_at is null then
    raise exception 'invalid_billing_event';
  end if;

  if exists(
    select 1 from public.stripe_webhook_events e where e.event_id=p_event_id
  ) then
    return 'duplicate';
  end if;

  if exists(
    select 1
    from public.subscriptions s
    where s.user_id=p_user
      and s.stripe_last_event_created_at is not null
      and s.stripe_last_event_created_at > p_event_created_at
  ) then
    v_outcome := 'stale';
  else
    v_entitled :=
      p_status in ('active','trialing')
      and (p_period_end is null or p_period_end > now());

    insert into public.subscriptions(
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      provider,
      entitlement,
      provider_product_id,
      plan,
      status,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at,
      stripe_last_event_created_at,
      stripe_last_event_id
    )
    values(
      p_user,
      p_customer_id,
      p_subscription_id,
      'stripe',
      case when v_entitled then 'premium' else 'free' end,
      p_product_id,
      case when v_entitled then 'pro' else 'free' end,
      p_status,
      p_period_end,
      coalesce(p_cancel_at_period_end,false),
      coalesce(p_subscription_created_at,now()),
      now(),
      p_event_created_at,
      p_event_id
    )
    on conflict(user_id) do update set
      stripe_customer_id=excluded.stripe_customer_id,
      stripe_subscription_id=excluded.stripe_subscription_id,
      provider='stripe',
      entitlement=excluded.entitlement,
      provider_product_id=excluded.provider_product_id,
      plan=excluded.plan,
      status=excluded.status,
      current_period_end=excluded.current_period_end,
      cancel_at_period_end=excluded.cancel_at_period_end,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      stripe_last_event_created_at=excluded.stripe_last_event_created_at,
      stripe_last_event_id=excluded.stripe_last_event_id
    where public.subscriptions.stripe_last_event_created_at is null
       or public.subscriptions.stripe_last_event_created_at <= excluded.stripe_last_event_created_at;

    if not found then
      v_outcome := 'stale';
    end if;

    if v_outcome='applied' and p_trial_started_at is not null then
      insert into public.subscription_trial_ledger(
        user_id,first_trial_started_at,stripe_subscription_id
      )
      values(p_user,p_trial_started_at,p_subscription_id)
      on conflict(user_id) do nothing;
    end if;
  end if;

  insert into public.stripe_webhook_events(
    event_id,event_type,event_created_at,user_id,stripe_subscription_id,outcome
  )
  values(
    p_event_id,
    coalesce(nullif(btrim(p_event_type),''),'unknown'),
    p_event_created_at,
    p_user,
    p_subscription_id,
    v_outcome
  );

  return v_outcome;
end;
$$;

revoke all on function public.persist_stripe_subscription_state(
  uuid,text,text,text,text,timestamptz,boolean,timestamptz,text,text,timestamptz,timestamptz
) from public, anon, authenticated;
grant execute on function public.persist_stripe_subscription_state(
  uuid,text,text,text,text,timestamptz,boolean,timestamptz,text,text,timestamptz,timestamptz
) to service_role;
