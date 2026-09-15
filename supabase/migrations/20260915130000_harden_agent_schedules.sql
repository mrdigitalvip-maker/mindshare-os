alter table public.agents
  drop constraint if exists agents_schedule_coherence_check,
  add constraint agents_schedule_coherence_check
    check (
      schedule_frequency is null
      or (
        schedule_time is not null
        and schedule_timezone is not null
        and schedule_prompt is not null
        and (
          schedule_frequency = 'daily'
          or (
            schedule_frequency = 'weekly'
            and schedule_weekdays is not null
            and cardinality(schedule_weekdays) > 0
          )
        )
      )
    );

-- The authenticated caller may configure only an Agent it owns (the function
-- itself enforces a.user_id = auth.uid()). SECURITY DEFINER is intentional so
-- the public caller never needs EXECUTE on the private next-run helper.
alter function public.configure_agent_schedule(
  uuid,
  text,
  time without time zone,
  smallint[],
  text,
  text,
  boolean
) security definer;

revoke all on function public.configure_agent_schedule(
  uuid,
  text,
  time without time zone,
  smallint[],
  text,
  text,
  boolean
) from public, anon;

grant execute on function public.configure_agent_schedule(
  uuid,
  text,
  time without time zone,
  smallint[],
  text,
  text,
  boolean
) to authenticated;
