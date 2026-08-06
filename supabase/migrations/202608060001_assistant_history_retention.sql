-- NEXORA Assistant history retention.
-- Only Assistant conversations/messages are eligible; subscriptions is authoritative.

create table if not exists public.ai_history_retention_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  deleted_conversations integer not null check (deleted_conversations >= 0),
  deleted_messages integer not null check (deleted_messages >= 0)
);

alter table public.ai_history_retention_runs enable row level security;
revoke all on public.ai_history_retention_runs from anon, authenticated;

create index if not exists ai_conversations_retention_idx
  on public.ai_conversations (user_id, updated_at, created_at);
create index if not exists ai_messages_retention_idx
  on public.ai_messages (conversation_id, created_at);

create or replace function public.purge_expired_ai_history(retention_days integer default 30)
returns table (deleted_conversations integer, deleted_messages integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed_conversations integer := 0;
  removed_messages integer := 0;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be positive';
  end if;

  create temporary table expired_ai_conversations (id uuid primary key) on commit drop;

  insert into expired_ai_conversations (id)
  select c.id
  from public.ai_conversations c
  where coalesce(c.updated_at, c.created_at, '-infinity'::timestamptz)
          < now() - make_interval(days => retention_days)
    and not exists (
      select 1 from public.ai_messages m
      where m.conversation_id = c.id
        and m.created_at >= now() - make_interval(days => retention_days)
    )
    and not exists (
      select 1
      from public.subscriptions s
      where s.user_id = c.user_id
        and s.status in ('active', 'trialing')
        and s.current_period_end is not null
        and s.current_period_end > now()
    )
  for update of c skip locked;

  delete from public.ai_messages m
  using expired_ai_conversations e
  where m.conversation_id = e.id;
  get diagnostics removed_messages = row_count;

  delete from public.ai_conversations c
  using expired_ai_conversations e
  where c.id = e.id;
  get diagnostics removed_conversations = row_count;

  insert into public.ai_history_retention_runs (deleted_conversations, deleted_messages)
  values (removed_conversations, removed_messages);

  return query select removed_conversations, removed_messages;
end;
$$;

revoke all on function public.purge_expired_ai_history(integer) from public, anon, authenticated;

-- Supabase projects expose pg_cron through the extensions schema. The job is
-- idempotently replaced and runs daily at 03:17 UTC.
create extension if not exists pg_cron with schema extensions;
do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'nexora-ai-history-retention';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'nexora-ai-history-retention',
    '17 3 * * *',
    'select public.purge_expired_ai_history(30);'
  );
end $$;

