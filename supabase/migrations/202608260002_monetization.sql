-- Canonical, provider-neutral monetization and server-enforced Free limits.
alter table public.subscriptions add column if not exists provider text not null default 'stripe';
alter table public.subscriptions add column if not exists entitlement text not null default 'free';
alter table public.subscriptions add column if not exists provider_product_id text;
alter table public.subscriptions add column if not exists provider_purchase_token text;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider in ('stripe','google_play','manual')) not valid;
alter table public.subscriptions add constraint subscriptions_entitlement_check check (entitlement in ('free','premium')) not valid;
create unique index if not exists subscriptions_google_token_idx on public.subscriptions(provider_purchase_token) where provider_purchase_token is not null;

-- Billing state is server-owned. Users may read their row, but never grant access.
alter table public.subscriptions enable row level security;
drop policy if exists "owner insert" on public.subscriptions;
drop policy if exists "owner update" on public.subscriptions;
drop policy if exists "owner delete" on public.subscriptions;
drop policy if exists "Users can insert own subscription" on public.subscriptions;
drop policy if exists "Users can update own subscription" on public.subscriptions;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='owner read subscription') then
    create policy "owner read subscription" on public.subscriptions for select to authenticated using(user_id=auth.uid());
  end if;
end $$;

create or replace function public.has_premium(p_user uuid, p_at timestamptz default now()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from subscriptions where user_id=p_user and entitlement='premium'
    and status in ('active','trialing','canceled','grace_period')
    and (current_period_end is null or current_period_end > p_at));
$$;
revoke all on function public.has_premium(uuid,timestamptz) from public;

-- UTC daily quotas; advisory lock makes check+claim atomic across concurrent requests.
create or replace function public.claim_feature_usage(p_feature text, p_request_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); premium boolean; cap integer; used integer; today date:=(now() at time zone 'UTC')::date;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_feature not in ('assistant_standard','assistant_attachment','project_intelligence','task_intelligence','study_tutor') then raise exception 'invalid_feature'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_feature||':'||today::text,0));
  premium:=public.has_premium(uid);
  cap:=case p_feature when 'assistant_standard' then case when premium then 100 else 10 end
    when 'assistant_attachment' then case when premium then 20 else 2 end
    else case when premium then 50 else 0 end end;
  select count(*) into used from ai_usage where user_id=uid and usage_date=today and action=p_feature;
  if used >= cap then return jsonb_build_object('allowed',false,'feature',p_feature,'limit',cap,'used',used,'resetAt',(today+1)::timestamptz,'entitlement',case when premium then 'premium' else 'free' end); end if;
  insert into ai_usage(user_id,action,usage_date,request_id) values(uid,p_feature,today,p_request_id) on conflict(user_id,request_id) do nothing;
  get diagnostics used = row_count;
  return jsonb_build_object('allowed',true,'feature',p_feature,'limit',cap,'used',(select count(*) from ai_usage where user_id=uid and usage_date=today and action=p_feature),'resetAt',(today+1)::timestamptz,'entitlement',case when premium then 'premium' else 'free' end);
end $$;
revoke all on function public.claim_feature_usage(text,text) from public;
grant execute on function public.claim_feature_usage(text,text) to authenticated;

create or replace function public.enforce_free_creation_limits() returns trigger language plpgsql security definer set search_path=public as $$
declare amount integer; cap integer;
begin
  if public.has_premium(new.user_id) then return new; end if;
  if tg_table_name='projects' and coalesce(new.status,'active')='active' then cap:=3; select count(*) into amount from projects where user_id=new.user_id and status='active';
  elsif tg_table_name='tasks' and coalesce(new.completed,false)=false then cap:=30; select count(*) into amount from tasks where user_id=new.user_id and completed=false;
  elsif tg_table_name='study_subjects' and coalesce(new.status,'active')='active' then cap:=3; select count(*) into amount from study_subjects where user_id=new.user_id and status='active';
  else return new; end if;
  if amount>=cap then raise exception using errcode='P0001', message='FREE_CREATION_LIMIT_REACHED', detail=jsonb_build_object('resource',tg_table_name,'limit',cap,'used',amount)::text; end if;
  return new;
end $$;
drop trigger if exists projects_free_limit on public.projects; create trigger projects_free_limit before insert on public.projects for each row execute function public.enforce_free_creation_limits();
drop trigger if exists tasks_free_limit on public.tasks; create trigger tasks_free_limit before insert on public.tasks for each row execute function public.enforce_free_creation_limits();
drop trigger if exists studies_free_limit on public.study_subjects; create trigger studies_free_limit before insert on public.study_subjects for each row execute function public.enforce_free_creation_limits();

