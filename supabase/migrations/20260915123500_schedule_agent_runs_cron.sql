select cron.schedule(
  'kivryn-scheduled-agent-runs',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://qoxtwbhpovkxfiambwgz.supabase.co/functions/v1/scheduled-agent-runs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-scheduler-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'kivryn_scheduler_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    ) as request_id;
  $$
);
