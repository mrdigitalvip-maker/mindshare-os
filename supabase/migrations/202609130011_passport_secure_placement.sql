-- KIVRYN Passport V1: server-scored placement test.
-- Keeps answer keys on the database and prevents clients from submitting arbitrary placement scores.

create table public.passport_placement_questions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  question_key text not null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  correct_index smallint not null check (correct_index >= 0),
  weight integer not null check (weight between 1 and 100),
  difficulty text not null check (difficulty in ('A0','A1','A2','B1','B2','C1')),
  order_index integer not null check (order_index > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(track_id, question_key),
  unique(track_id, order_index)
);

create index passport_placement_questions_track_idx
  on public.passport_placement_questions(track_id, active, order_index);

alter table public.passport_placement_questions enable row level security;
revoke all on table public.passport_placement_questions from anon, authenticated;

-- Eight weighted questions per initial language track. Weights total 100 per track.
insert into public.passport_placement_questions(
  track_id, question_key, prompt, options, correct_index, weight, difficulty, order_index
)
select t.id, q.question_key, q.prompt, q.options, q.correct_index, q.weight, q.difficulty, q.order_index
from public.studio_tracks t
join (
  values
    ('english','en-01','Choose the correct morning greeting.','["Good night","Good morning","Goodbye","See you"]'::jsonb,1,8,'A0',1),
    ('english','en-02','Complete: I ___ from Brazil.','["am","is","are","be"]'::jsonb,0,10,'A1',2),
    ('english','en-03','Which sentence correctly asks for the price?','["How much does it cost?","How many it costs?","What cost this?","How much is cost?"]'::jsonb,0,12,'A2',3),
    ('english','en-04','Complete: Yesterday we ___ to the airport early.','["go","gone","went","going"]'::jsonb,2,12,'A2',4),
    ('english','en-05','Choose the most natural sentence.','["If I miss the train, I will take a taxi.","If I will miss the train, I take a taxi.","If I missed the train, I will taking a taxi.","If I miss train, I would took taxi."]'::jsonb,0,14,'B1',5),
    ('english','en-06','Complete: The hotel ___ we stayed was near the station.','["which","where","who","whose"]'::jsonb,1,14,'B2',6),
    ('english','en-07','Choose the sentence with the most precise meaning.','["I had my passport renewed before the trip.","I renewed my passport by someone before the trip.","I was renewing my passport before someone trip.","I have renew passport before the trip."]'::jsonb,0,15,'B2',7),
    ('english','en-08','Choose the best completion: Had I known about the delay, I ___ a later connection.','["would book","would have booked","booked","had booked"]'::jsonb,1,15,'C1',8),

    ('spanish','es-01','Elige el saludo correcto por la mañana.','["Buenas noches","Buenos días","Hasta luego","Adiós"]'::jsonb,1,8,'A0',1),
    ('spanish','es-02','Completa: Yo ___ de Brasil.','["soy","eres","es","somos"]'::jsonb,0,10,'A1',2),
    ('spanish','es-03','¿Qué frase pregunta correctamente por el precio?','["¿Cuánto cuesta?","¿Cuántos cuesta?","¿Qué costar?","¿Cómo precio?"]'::jsonb,0,12,'A2',3),
    ('spanish','es-04','Completa: Ayer nosotros ___ al aeropuerto temprano.','["vamos","fuimos","iremos","íbamos a ir"]'::jsonb,1,12,'A2',4),
    ('spanish','es-05','Elige la frase más natural.','["Si pierdo el tren, tomaré un taxi.","Si perderé el tren, tomo un taxi.","Si pierdo el tren, tomaba un taxi.","Si perdido el tren, tomar taxi."]'::jsonb,0,14,'B1',5),
    ('spanish','es-06','Completa: El hotel ___ nos alojamos estaba cerca de la estación.','["que","donde","quien","cuyo"]'::jsonb,1,14,'B2',6),
    ('spanish','es-07','Elige la construcción más precisa.','["Hice renovar mi pasaporte antes del viaje.","Hice mi pasaporte renovar antes viaje.","Me renové por alguien el pasaporte.","Había renovar mi pasaporte antes."]'::jsonb,0,15,'B2',7),
    ('spanish','es-08','Completa: Si hubiera sabido del retraso, ___ una conexión posterior.','["reservaría","habría reservado","reservé","había reservado"]'::jsonb,1,15,'C1',8),

    ('portuguese','pt-01','Escolha a saudação correta para a manhã.','["Boa noite","Bom dia","Até logo","Tchau"]'::jsonb,1,8,'A0',1),
    ('portuguese','pt-02','Complete: Eu ___ do Brasil.','["sou","é","somos","ser"]'::jsonb,0,10,'A1',2),
    ('portuguese','pt-03','Qual frase pergunta corretamente o preço?','["Quanto custa?","Quantos custa?","Que custar?","Como preço?"]'::jsonb,0,12,'A2',3),
    ('portuguese','pt-04','Complete: Ontem nós ___ cedo para o aeroporto.','["vamos","fomos","iremos","ir"]'::jsonb,1,12,'A2',4),
    ('portuguese','pt-05','Escolha a frase mais natural.','["Se eu perder o trem, vou pegar um táxi.","Se eu perderei o trem, pego um táxi.","Se eu perder o trem, pegava um táxi.","Se perdido o trem, pegar táxi."]'::jsonb,0,14,'B1',5),
    ('portuguese','pt-06','Complete: O hotel ___ ficamos era perto da estação.','["que","onde","quem","cujo"]'::jsonb,1,14,'B2',6),
    ('portuguese','pt-07','Escolha a construção mais precisa.','["Mandei renovar meu passaporte antes da viagem.","Mandei meu passaporte renovar por eu.","Eu renovei por alguém meu passaporte.","Tinha renovar meu passaporte antes."]'::jsonb,0,15,'B2',7),
    ('portuguese','pt-08','Complete: Se eu soubesse do atraso antes, ___ uma conexão mais tarde.','["reservaria","teria reservado","reservei","tinha reservado"]'::jsonb,1,15,'C1',8),

    ('french','fr-01','Choisissez la salutation correcte le matin.','["Bonsoir","Bonjour","Bonne nuit","Au revoir"]'::jsonb,1,8,'A0',1),
    ('french','fr-02','Complétez : Je ___ du Brésil.','["suis","es","est","sommes"]'::jsonb,0,10,'A1',2),
    ('french','fr-03','Quelle phrase demande correctement le prix ?','["Combien ça coûte ?","Combien ça coûtes ?","Quel coûter ?","Comment prix ?"]'::jsonb,0,12,'A2',3),
    ('french','fr-04','Complétez : Hier, nous ___ tôt à l’aéroport.','["allons","sommes allés","irons","aller"]'::jsonb,1,12,'A2',4),
    ('french','fr-05','Choisissez la phrase la plus naturelle.','["Si je rate le train, je prendrai un taxi.","Si je raterai le train, je prends un taxi.","Si je rate le train, je prenais un taxi.","Si raté le train, prendre taxi."]'::jsonb,0,14,'B1',5),
    ('french','fr-06','Complétez : L’hôtel ___ nous avons séjourné était près de la gare.','["que","où","qui","dont"]'::jsonb,1,14,'B2',6),
    ('french','fr-07','Choisissez la construction la plus précise.','["J’ai fait renouveler mon passeport avant le voyage.","J’ai renouvelé mon passeport par quelqu’un avant voyage.","Je faisais renouvelé mon passeport.","J’avais renouveler mon passeport avant."]'::jsonb,0,15,'B2',7),
    ('french','fr-08','Complétez : Si j’avais su pour le retard, j’___ une correspondance plus tardive.','["aurais réservé","avais réservé","réserverais","ai réservé"]'::jsonb,0,15,'C1',8)
) as q(track_slug, question_key, prompt, options, correct_index, weight, difficulty, order_index)
  on t.slug = q.track_slug
where t.category = 'language'
on conflict(track_id, question_key) do nothing;

create or replace function public.get_passport_placement_questions(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.studio_tracks
    where id = p_track_id and category = 'language' and active
  ) then
    raise exception 'passport requires an active language track';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', question_key,
        'prompt', prompt,
        'options', options,
        'difficulty', difficulty,
        'orderIndex', order_index
      ) order by order_index
    ),
    '[]'::jsonb
  ) into result
  from public.passport_placement_questions
  where track_id = p_track_id and active;

  return result;
end;
$$;

revoke all on function public.get_passport_placement_questions(uuid) from public;
grant execute on function public.get_passport_placement_questions(uuid) to authenticated;

create or replace function public.submit_passport_placement(
  p_track_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q record;
  selected integer;
  total_weight integer := 0;
  earned_weight integer := 0;
  question_count integer := 0;
  computed_score integer;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.studio_tracks
    where id = p_track_id and category = 'language' and active
  ) then
    raise exception 'passport requires an active language track';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'placement answers must be a JSON object';
  end if;

  for q in
    select question_key, correct_index, weight, jsonb_array_length(options) as option_count
    from public.passport_placement_questions
    where track_id = p_track_id and active
    order by order_index
  loop
    question_count := question_count + 1;
    total_weight := total_weight + q.weight;

    if not (p_answers ? q.question_key) then
      raise exception 'missing answer for placement question %', q.question_key;
    end if;

    begin
      selected := (p_answers ->> q.question_key)::integer;
    exception when invalid_text_representation then
      raise exception 'invalid answer for placement question %', q.question_key;
    end;

    if selected < 0 or selected >= q.option_count then
      raise exception 'answer out of range for placement question %', q.question_key;
    end if;

    if selected = q.correct_index then
      earned_weight := earned_weight + q.weight;
    end if;
  end loop;

  if question_count = 0 or total_weight <= 0 then
    raise exception 'placement question bank is unavailable';
  end if;

  computed_score := round((earned_weight::numeric / total_weight::numeric) * 100)::integer;

  return public.complete_passport_placement(p_track_id, computed_score, p_answers);
end;
$$;

-- The legacy scoring RPC remains for trusted internal use only.
revoke execute on function public.complete_passport_placement(uuid, integer, jsonb) from authenticated;
revoke all on function public.submit_passport_placement(uuid, jsonb) from public;
grant execute on function public.submit_passport_placement(uuid, jsonb) to authenticated;
