-- Adaptive challenge suggestions and evidence integrity.

create or replace function public.apply_personal_challenge_progress(
  p_user uuid,
  p_metric text,
  p_amount integer,
  p_source_type text,
  p_source_id uuid,
  p_occurred_at timestamptz default now(),
  p_local_date date default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  challenge public.personal_challenges;
  event_id uuid;
  new_progress integer;
begin
  if p_user is null or p_amount <= 0 or p_source_id is null then return; end if;

  for challenge in
    select *
    from public.personal_challenges
    where user_id = p_user
      and status = 'active'
      and metric = p_metric
      and p_occurred_at >= starts_at
      and p_occurred_at < ends_at
    for update
  loop
    event_id := null;
    insert into public.personal_challenge_progress_events(
      challenge_id,user_id,source_type,source_id,local_date,amount,created_at
    ) values (
      challenge.id,p_user,p_source_type,p_source_id,p_local_date,p_amount,p_occurred_at
    )
    on conflict do nothing
    returning id into event_id;
    if event_id is null then continue; end if;

    update public.personal_challenges
    set progress = least(target_value, progress + p_amount),
        updated_at = statement_timestamp()
    where id = challenge.id
    returning progress into new_progress;

    if new_progress >= challenge.target_value then
      update public.personal_challenges
      set status = 'completed',
          completed_at = coalesce(completed_at,p_occurred_at),
          updated_at = statement_timestamp()
      where id = challenge.id and status = 'active';

      if found then
        insert into public.momentum_events(user_id,source_type,source_id,event_type,points,created_at)
        values(
          p_user,'personal_challenge',challenge.id,'personal_challenge_completed',
          challenge.reward_points,p_occurred_at
        )
        on conflict(user_id,source_type,source_id,event_type) do nothing;

        -- Community's verified-activity feed must never label a self-report as verified.
        if challenge.evidence_mode = 'verified' then
          insert into public.community_activity(actor_user_id,event_type,source_type,source_id,occurred_at)
          values(p_user,'challenge_completed','challenge',challenge.id,p_occurred_at)
          on conflict(actor_user_id,source_type,source_id,event_type) do nothing;
        end if;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.apply_personal_challenge_progress(uuid,text,integer,text,uuid,timestamptz,date)
  from public, anon, authenticated;

create or replace function public.get_personal_challenge_suggestions(p_local_date date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  open_tasks integer := 0;
  active_subjects integer := 0;
  active_journeys integer := 0;
  recent_completed integer := 0;
  recent_abandoned integer := 0;
  execution_target integer := 3;
  study_target integer := 90;
  journey_target integer := 3;
  self_target integer := 3;
  result jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_local_date is null or p_local_date < current_date - 1 or p_local_date > current_date + 1 then
    raise exception 'invalid_local_date';
  end if;

  select count(*) into open_tasks
  from public.tasks where user_id = uid and completed = false;
  select count(*) into active_subjects
  from public.study_subjects where user_id = uid and status = 'active';
  select count(*) into active_journeys
  from public.journeys where user_id = uid and status = 'active';
  select count(*) into recent_completed
  from public.personal_challenges
  where user_id = uid and status = 'completed' and created_at >= statement_timestamp() - interval '30 days';
  select count(*) into recent_abandoned
  from public.personal_challenges
  where user_id = uid and status = 'abandoned' and created_at >= statement_timestamp() - interval '30 days';

  if recent_abandoned > recent_completed then
    execution_target := 2;
    study_target := 60;
    journey_target := 2;
    self_target := 2;
  elsif recent_completed >= recent_abandoned + 2 then
    execution_target := 4;
    study_target := 120;
    journey_target := 4;
    self_target := 4;
  end if;

  if open_tasks > 0 and not exists(
    select 1 from public.personal_challenges
    where user_id = uid and status = 'active' and category = 'execution' and period = 'daily'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','execution-daily','title','Sprint de execução',
      'description','Conclua tarefas reais do seu sistema hoje.',
      'category','execution','period','daily','metric','task_completions',
      'target_value',least(open_tasks,execution_target),
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('daily','verified')
    ));
  end if;

  if active_subjects > 0 and not exists(
    select 1 from public.personal_challenges
    where user_id = uid and status = 'active' and category = 'study' and period = 'weekly'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','study-weekly','title','Foco de aprendizado',
      'description','Acumule minutos de estudo registrados na KIVRYN nesta semana.',
      'category','study','period','weekly','metric','study_minutes','target_value',study_target,
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('weekly','verified')
    ));
  end if;

  if active_journeys > 0 and not exists(
    select 1 from public.personal_challenges
    where user_id = uid and status = 'active' and category = 'journey' and period = 'weekly'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','journey-weekly','title','Avanço de Jornada',
      'description','Complete missões verificadas das suas Jornadas nesta semana.',
      'category','journey','period','weekly','metric','journey_missions','target_value',journey_target,
      'evidence_mode','verified','reward_points',public.kivryn_challenge_reward('weekly','verified')
    ));
  end if;

  if not exists(
    select 1 from public.personal_challenges
    where user_id = uid and status = 'active' and category = 'fitness' and period = 'weekly'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','fitness-weekly','title','Consistência física',
      'description','Registre até um treino por dia. A evidência é declarada por você.',
      'category','fitness','period','weekly','metric','self_checkins','target_value',self_target,
      'evidence_mode','self_reported','reward_points',public.kivryn_challenge_reward('weekly','self_reported')
    ));
  end if;

  if not exists(
    select 1 from public.personal_challenges
    where user_id = uid and status = 'active' and category = 'wellbeing' and period = 'daily'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'key','wellbeing-daily','title','Reset diário',
      'description','Faça uma ação intencional de bem-estar e confirme uma vez hoje.',
      'category','wellbeing','period','daily','metric','self_checkins','target_value',1,
      'evidence_mode','self_reported','reward_points',public.kivryn_challenge_reward('daily','self_reported')
    ));
  end if;

  return result;
end;
$$;
revoke all on function public.get_personal_challenge_suggestions(date) from public, anon;
grant execute on function public.get_personal_challenge_suggestions(date) to authenticated;
