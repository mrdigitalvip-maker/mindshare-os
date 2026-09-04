create extension if not exists pg_cron;

create or replace function public.run_nexora_community_host_cron()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  community_record record;
begin
  -- evaluate_community_host_prompt is intentionally service-role-only.
  -- This internal cron wrapper runs as the database owner and supplies
  -- that server-only execution context.
  perform set_config('request.jwt.claim.role', 'service_role', true);

  for community_record in
    select id
    from public.community_channels
    where official = true
  loop
    perform public.evaluate_community_host_prompt(
      community_record.id,
      now(),
      'America/Sao_Paulo'
    );
  end loop;
end;
$$;

revoke all
on function public.run_nexora_community_host_cron()
from public, anon, authenticated, service_role;

-- Avoid duplicate scheduler if this setup is recreated.
select cron.unschedule(jobid)
from cron.job
where jobname = 'nexora-community-host';

select cron.schedule(
  'nexora-community-host',
  '*/15 * * * *',
  'select public.run_nexora_community_host_cron();'
);
