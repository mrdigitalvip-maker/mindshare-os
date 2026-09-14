create table if not exists public.internal_access_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_role text not null check (access_role in ('owner','tester')),
  unlimited_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.internal_access_overrides enable row level security;
revoke all on table public.internal_access_overrides from anon, authenticated;
grant all on table public.internal_access_overrides to service_role;

create or replace function public.has_unlimited_ai()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select iao.unlimited_ai
    from public.internal_access_overrides iao
    where iao.user_id = auth.uid()
  ), false);
$$;

revoke all on function public.has_unlimited_ai() from public;
grant execute on function public.has_unlimited_ai() to authenticated, service_role;

create or replace function public.claim_assistant_usage(
  p_request_id uuid,
  p_request_fingerprint text,
  p_has_attachment boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  premium boolean;
  unlimited boolean;
  assistant_cap integer;
  attachment_cap integer;
  assistant_used integer;
  attachment_used integer;
  today date := (now() at time zone 'UTC')::date;
  prior public.assistant_usage_claims%rowtype;
  entitlement_name text;
begin
  if uid is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  if p_request_id is null or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' or p_has_attachment is null then
    raise exception using errcode = '22023', message = 'invalid_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':assistant:' || today::text, 0));

  select exists(
    select 1 from public.internal_access_overrides iao
    where iao.user_id = uid and iao.unlimited_ai = true
  ) into unlimited;

  select * into prior from public.assistant_usage_claims
    where user_id = uid and request_id = p_request_id;
  if found then
    if prior.request_fingerprint <> p_request_fingerprint
      or prior.has_attachment <> p_has_attachment then
      raise exception using errcode = 'P0001', message = 'request_id_conflict';
    end if;
    assistant_cap := case when unlimited then 2147483647 when prior.entitlement = 'premium' then 100 else 10 end;
    attachment_cap := case when unlimited then 2147483647 when prior.entitlement = 'premium' then 20 else 2 end;
    select count(*) into assistant_used from public.ai_usage
      where user_id = uid and usage_date = prior.usage_date and action = 'assistant_standard';
    select count(*) into attachment_used from public.ai_usage
      where user_id = uid and usage_date = prior.usage_date and action = 'assistant_attachment';
    return jsonb_build_object(
      'allowed', true, 'replay', true,
      'entitlement', case when unlimited then 'premium' else prior.entitlement end,
      'assistant', jsonb_build_object('used', assistant_used, 'limit', assistant_cap),
      'attachment', case when prior.has_attachment then jsonb_build_object('used', attachment_used, 'limit', attachment_cap) else null end
    ) - case when prior.has_attachment then '__none__' else 'attachment' end;
  end if;

  premium := public.has_premium(uid) or unlimited;
  entitlement_name := case when premium then 'premium' else 'free' end;
  assistant_cap := case when unlimited then 2147483647 when premium then 100 else 10 end;
  attachment_cap := case when unlimited then 2147483647 when premium then 20 else 2 end;

  select count(*) into assistant_used from public.ai_usage
    where user_id = uid and usage_date = today and action = 'assistant_standard';
  select count(*) into attachment_used from public.ai_usage
    where user_id = uid and usage_date = today and action = 'assistant_attachment';

  if assistant_used >= assistant_cap then
    return jsonb_build_object(
      'allowed', false, 'replay', false, 'deniedFeature', 'assistant_standard',
      'entitlement', entitlement_name,
      'assistant', jsonb_build_object('used', assistant_used, 'limit', assistant_cap)
    );
  end if;
  if p_has_attachment and attachment_used >= attachment_cap then
    return jsonb_build_object(
      'allowed', false, 'replay', false, 'deniedFeature', 'assistant_attachment',
      'entitlement', entitlement_name,
      'assistant', jsonb_build_object('used', assistant_used, 'limit', assistant_cap),
      'attachment', jsonb_build_object('used', attachment_used, 'limit', attachment_cap)
    );
  end if;

  insert into public.ai_usage (user_id, action, usage_date, request_id)
    values (uid, 'assistant_standard', today, p_request_id::text || ':standard');
  assistant_used := assistant_used + 1;
  if p_has_attachment then
    insert into public.ai_usage (user_id, action, usage_date, request_id)
      values (uid, 'assistant_attachment', today, p_request_id::text || ':attachment');
    attachment_used := attachment_used + 1;
  end if;
  insert into public.assistant_usage_claims
    (user_id, request_id, request_fingerprint, has_attachment, entitlement, usage_date)
    values (uid, p_request_id, p_request_fingerprint, p_has_attachment, entitlement_name, today);

  return jsonb_build_object(
    'allowed', true, 'replay', false, 'entitlement', entitlement_name,
    'assistant', jsonb_build_object('used', assistant_used, 'limit', assistant_cap),
    'attachment', case when p_has_attachment then jsonb_build_object('used', attachment_used, 'limit', attachment_cap) else null end
  ) - case when p_has_attachment then '__none__' else 'attachment' end;
end;
$$;

with owner_user as (
  select u.id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('brunobrandao179@gmail.com')
  limit 1
)
insert into public.subscriptions (
  user_id, plan, status, current_period_end, cancel_at_period_end,
  provider, entitlement, updated_at
)
select id, 'pro', 'active', null, false, 'manual', 'premium', now()
from owner_user
on conflict (user_id) do update set
  plan = 'pro',
  status = 'active',
  current_period_end = null,
  cancel_at_period_end = false,
  provider = 'manual',
  entitlement = 'premium',
  updated_at = now();

with owner_user as (
  select u.id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('brunobrandao179@gmail.com')
  limit 1
)
insert into public.internal_access_overrides (user_id, access_role, unlimited_ai, updated_at)
select id, 'owner', true, now()
from owner_user
on conflict (user_id) do update set
  access_role = 'owner',
  unlimited_ai = true,
  updated_at = now();
