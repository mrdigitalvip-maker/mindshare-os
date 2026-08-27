-- Atomically claim the canonical Assistant meters as one idempotent operation.
-- Existing usage and user data are preserved across entitlement changes.
create table public.assistant_usage_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  has_attachment boolean not null,
  entitlement text not null check (entitlement in ('free', 'premium')),
  usage_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.assistant_usage_claims enable row level security;
revoke all on table public.assistant_usage_claims from public, anon, authenticated;

create index assistant_usage_claims_owner_date_idx
  on public.assistant_usage_claims (user_id, usage_date desc);

create or replace function public.claim_assistant_usage(
  p_request_id uuid,
  p_request_fingerprint text,
  p_has_attachment boolean
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  premium boolean;
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

  -- Serialize both retries of one request and all daily claims for this user.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':assistant:' || today::text, 0));
  select * into prior from public.assistant_usage_claims
    where user_id = uid and request_id = p_request_id;
  if found then
    if prior.request_fingerprint <> p_request_fingerprint
      or prior.has_attachment <> p_has_attachment then
      raise exception using errcode = 'P0001', message = 'request_id_conflict';
    end if;
    select count(*) into assistant_used from public.ai_usage
      where user_id = uid and usage_date = prior.usage_date and action = 'assistant_standard';
    select count(*) into attachment_used from public.ai_usage
      where user_id = uid and usage_date = prior.usage_date and action = 'assistant_attachment';
    return jsonb_build_object(
      'allowed', true, 'replay', true, 'entitlement', prior.entitlement,
      'assistant', jsonb_build_object('used', assistant_used, 'limit', case when prior.entitlement = 'premium' then 100 else 10 end),
      'attachment', case when prior.has_attachment then jsonb_build_object('used', attachment_used, 'limit', case when prior.entitlement = 'premium' then 20 else 2 end) else null end
    ) - case when prior.has_attachment then '__none__' else 'attachment' end;
  end if;

  premium := public.has_premium(uid);
  entitlement_name := case when premium then 'premium' else 'free' end;
  assistant_cap := case when premium then 100 else 10 end;
  attachment_cap := case when premium then 20 else 2 end;
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

revoke all on function public.claim_assistant_usage(uuid, text, boolean) from public, anon;
grant execute on function public.claim_assistant_usage(uuid, text, boolean) to authenticated;
