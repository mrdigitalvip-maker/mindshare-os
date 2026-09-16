-- Edition 7: make Passport daily missions an actual runtime feature.
-- Missions are owner-scoped, deterministic, idempotent, and limited to actions
-- the Passport can execute itself. Opening Passport may ensure today's rows;
-- it never creates Projects/Tasks or any other workspace mutation.

create or replace function public.ensure_passport_daily_missions(
  p_track_id uuid,
  p_mission_date date,
  p_locale text default 'pt-BR'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized_locale text := case
    when lower(coalesce(p_locale, '')) like 'en%' then 'en'
    else 'pt-BR'
  end;
  inserted_count integer := 0;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if p_track_id is null then
    raise exception 'language track required';
  end if;

  if p_mission_date is null then
    raise exception 'mission date required';
  end if;

  if not exists (
    select 1
    from public.passport_profiles p
    join public.studio_tracks t on t.id = p.track_id
    where p.user_id = uid
      and p.track_id = p_track_id
      and t.category = 'language'
      and t.active
  ) then
    raise exception 'passport profile not found for language track';
  end if;

  insert into public.passport_daily_missions(
    user_id,
    track_id,
    mission_date,
    mission_key,
    mission_type,
    title,
    prompt,
    metadata
  )
  values
    (
      uid,
      p_track_id,
      p_mission_date,
      'daily-vocabulary-v1',
      'vocabulary',
      case when normalized_locale = 'en' then 'One real word' else 'Uma palavra real' end,
      case
        when normalized_locale = 'en' then 'Add one useful word you encountered today, or review one word that is due in Passport.'
        else 'Adicione uma palavra útil que você encontrou hoje ou revise uma palavra vencida no Passport.'
      end,
      jsonb_build_object('source', 'passport', 'version', 1, 'action', 'vocabulary_review_or_add')
    ),
    (
      uid,
      p_track_id,
      p_mission_date,
      'daily-listening-v1',
      'listening',
      case when normalized_locale = 'en' then 'Listen and repeat' else 'Ouça e repita' end,
      case
        when normalized_locale = 'en' then 'Open your current lesson, play its listening example, and repeat one sentence out loud.'
        else 'Abra sua lição atual, ouça o exemplo de listening e repita uma frase em voz alta.'
      end,
      jsonb_build_object('source', 'passport', 'version', 1, 'action', 'lesson_listening')
    ),
    (
      uid,
      p_track_id,
      p_mission_date,
      'daily-speaking-v1',
      'speaking',
      case when normalized_locale = 'en' then 'One role-play exchange' else 'Uma troca de role-play' end,
      case
        when normalized_locale = 'en' then 'Open AI role-play and complete at least one exchange in your Passport language.'
        else 'Abra o role-play com IA e complete pelo menos uma troca no idioma do seu Passport.'
      end,
      jsonb_build_object('source', 'passport', 'version', 1, 'action', 'roleplay_exchange')
    )
  on conflict(user_id, track_id, mission_date, mission_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.ensure_passport_daily_missions(uuid, date, text) from public;
grant execute on function public.ensure_passport_daily_missions(uuid, date, text) to authenticated;
