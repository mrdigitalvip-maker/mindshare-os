-- Journey Packs V1: immutable first-party blueprints instantiated as user-owned Journeys.
create table public.journey_packs (
  id uuid primary key default gen_random_uuid(), slug text not null, version integer not null check (version > 0),
  title text not null check (length(btrim(title)) between 1 and 160), short_description text not null,
  description text not null, category text not null check (category in ('creator','business','fitness','study','travel','personal')),
  duration_days integer check (duration_days between 1 and 365), difficulty text not null check (difficulty in ('beginner','intermediate')),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(slug, version)
);
create table public.journey_pack_steps (
  id uuid primary key default gen_random_uuid(), pack_id uuid not null references public.journey_packs(id) on delete restrict,
  sequence integer not null check (sequence > 0), phase text not null, title text not null, description text not null,
  action_type text not null default 'journey_action' check (action_type = 'journey_action'), required boolean not null default true,
  created_at timestamptz not null default now(), unique(pack_id, sequence)
);
alter table public.journeys add column source_pack_id uuid references public.journey_packs(id) on delete set null;
alter table public.journeys add column source_pack_version integer;
alter table public.journeys add constraint journeys_pack_source_complete check
  ((source_pack_id is null and source_pack_version is null) or (source_pack_id is not null and source_pack_version is not null));
create or replace function public.protect_journey_pack_source() returns trigger language plpgsql
security definer set search_path=pg_catalog,public as $$
begin
 if current_setting('nexora.pack_start',true)='1' then return new; end if;
 if tg_op='INSERT' and new.source_pack_id is not null then raise exception 'pack_source_server_only'; end if;
 if tg_op='UPDATE' and (new.source_pack_id is distinct from old.source_pack_id or new.source_pack_version is distinct from old.source_pack_version) then raise exception 'pack_source_server_only'; end if;
 return new;
end $$;
create trigger journeys_protect_pack_source before insert or update of source_pack_id,source_pack_version on public.journeys
for each row execute function public.protect_journey_pack_source();
revoke all on function public.protect_journey_pack_source() from public, authenticated;
create table public.journey_pack_starts (
  user_id uuid not null references auth.users(id) on delete cascade, request_key uuid not null,
  pack_id uuid not null references public.journey_packs(id) on delete restrict, journey_id uuid not null references public.journeys(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, request_key)
);
create table public.journey_pack_step_instances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade, source_step_id uuid not null references public.journey_pack_steps(id) on delete restrict,
  sequence integer not null, phase text not null, title text not null, description text not null, required boolean not null,
  completed_at timestamptz, created_at timestamptz not null default now(), unique(journey_id, sequence)
);
create index journey_packs_catalog_idx on public.journey_packs(status, category, slug, version desc);
create index journey_pack_steps_order_idx on public.journey_pack_steps(pack_id, sequence);
create index journey_pack_instances_next_idx on public.journey_pack_step_instances(user_id, journey_id, completed_at, sequence);

alter table public.journey_packs enable row level security; alter table public.journey_pack_steps enable row level security;
alter table public.journey_pack_starts enable row level security; alter table public.journey_pack_step_instances enable row level security;
create policy "published packs are readable" on public.journey_packs for select to authenticated using(status='published');
create policy "published pack steps are readable" on public.journey_pack_steps for select to authenticated using(exists(select 1 from public.journey_packs p where p.id=pack_id and p.status='published'));
create policy "owners read pack starts" on public.journey_pack_starts for select to authenticated using(user_id=auth.uid());
create policy "owners read instantiated steps" on public.journey_pack_step_instances for select to authenticated using(user_id=auth.uid());
revoke insert, update, delete on public.journey_packs, public.journey_pack_steps, public.journey_pack_starts, public.journey_pack_step_instances from authenticated;

create or replace function public.get_journey_packs() returns setof public.journey_packs
language sql stable security definer set search_path=pg_catalog,public as $$
  select p.* from public.journey_packs p where p.status='published' order by p.category,p.title;
$$;
create or replace function public.get_journey_pack_detail(p_slug text) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('pack',to_jsonb(p),'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.sequence) from public.journey_pack_steps s where s.pack_id=p.id),'[]'::jsonb))
 from public.journey_packs p where p.slug=p_slug and p.status='published' order by p.version desc limit 1;
$$;

create or replace function public.start_journey_pack(p_pack_id uuid, p_request_key uuid, p_goal text, p_target_date date default null, p_context text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); pack public.journey_packs; existing uuid; created uuid;
begin
 if uid is null then raise exception using errcode='P0001',message='authentication_required'; end if;
 if p_request_key is null or length(btrim(coalesce(p_goal,''))) not between 1 and 160 or length(coalesce(p_context,''))>1000 or (p_target_date is not null and p_target_date<current_date) then
   raise exception using errcode='P0001',message='invalid_pack_input';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select journey_id into existing from public.journey_pack_starts where user_id=uid and request_key=p_request_key;
 if existing is not null then return existing; end if;
 select * into pack from public.journey_packs where id=p_pack_id for share;
 if pack.id is null then raise exception using errcode='P0001',message='pack_not_found'; end if;
 if pack.status='retired' then raise exception using errcode='P0001',message='pack_retired'; end if;
 if pack.status<>'published' then raise exception using errcode='P0001',message='pack_not_available'; end if;
 perform set_config('nexora.pack_start','1',true);
 insert into public.journeys(user_id,title,category,objective,context,target_date,source_pack_id,source_pack_version)
 values(uid,btrim(p_goal),pack.category,btrim(p_goal),nullif(btrim(p_context),''),p_target_date,pack.id,pack.version) returning id into created;
 insert into public.journey_pack_step_instances(user_id,journey_id,source_step_id,sequence,phase,title,description,required)
 select uid,created,s.id,s.sequence,s.phase,s.title,s.description,s.required from public.journey_pack_steps s where s.pack_id=pack.id order by s.sequence;
 if not found then raise exception using errcode='P0001',message='creation_failed'; end if;
 insert into public.journey_pack_starts(user_id,request_key,pack_id,journey_id) values(uid,p_request_key,pack.id,created);
 return created;
exception when unique_violation then
 select journey_id into existing from public.journey_pack_starts where user_id=uid and request_key=p_request_key;
 if existing is not null then return existing; end if; raise;
end $$;

-- Pack steps join the existing mission selector; no second mission or reward engine.
create or replace function public.ensure_daily_journey_mission(p_local_date date) returns public.journey_missions
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); found public.journey_missions; candidate record;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if p_local_date is null or p_local_date<current_date-1 or p_local_date>current_date+1 then raise exception 'invalid_mission_date'; end if;
 select * into found from public.journey_missions where user_id=uid and scheduled_date=p_local_date; if found.id is not null then return found; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_local_date::text,0));
 select * into found from public.journey_missions where user_id=uid and scheduled_date=p_local_date; if found.id is not null then return found; end if;
 select 'task'::text source_type,t.id source_id,t.title,coalesce(t.next_action,t.description) description,null::uuid journey_id,
  case when t.due_date<p_local_date then 0 when t.due_date=p_local_date then 10 when t.next_action is not null then 20 else 60 end rank into candidate
 from public.tasks t left join public.projects p on p.id=t.project_id where t.user_id=uid and not t.completed and (t.project_id is null or p.status='active') order by rank,t.title,t.id limit 1;
 if candidate.source_id is null then select 'study_session',s.id,'Estudar '||s.name,s.next_action,null::uuid,30 into candidate from public.study_subjects s where s.user_id=uid and s.status='active' and nullif(btrim(s.next_action),'') is not null order by s.updated_at desc,s.id limit 1; end if;
 if candidate.source_id is null then select 'journey_action',i.id,i.title,i.description,i.journey_id,40 into candidate from public.journey_pack_step_instances i join public.journeys j on j.id=i.journey_id where i.user_id=uid and i.completed_at is null and j.status='active' order by j.updated_at desc,i.sequence limit 1; end if;
 if candidate.source_id is null then return null; end if;
 insert into public.journey_missions(user_id,journey_id,source_type,source_id,title,description,status,scheduled_date) values(uid,candidate.journey_id,candidate.source_type,candidate.source_id,candidate.title,candidate.description,'active',p_local_date) returning * into found; return found;
end $$;

create or replace function public.complete_journey_action(p_mission uuid) returns public.journey_missions
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); result public.journey_missions;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select m.* into result from public.journey_missions m join public.journeys j on j.id=m.journey_id where m.id=p_mission and m.user_id=uid and j.user_id=uid and m.source_type='journey_action' for update of m;
 if result.id is null then raise exception 'mission_not_confirmable'; end if; if result.status='completed' then return result; end if;
 if result.status not in ('pending','active') then raise exception 'mission_not_confirmable'; end if;
 update public.journey_missions set status='completed',completed_at=statement_timestamp(),updated_at=statement_timestamp() where id=result.id returning * into result;
 update public.journey_pack_step_instances set completed_at=coalesce(completed_at,statement_timestamp()) where id=result.source_id and user_id=uid and journey_id=result.journey_id;
 perform public.apply_verified_mission_effects(result); return result;
end $$;
revoke all on function public.get_journey_packs() from public; grant execute on function public.get_journey_packs() to authenticated;
revoke all on function public.get_journey_pack_detail(text) from public; grant execute on function public.get_journey_pack_detail(text) to authenticated;
revoke all on function public.start_journey_pack(uuid,uuid,text,date,text) from public; grant execute on function public.start_journey_pack(uuid,uuid,text,date,text) to authenticated;
revoke all on function public.ensure_daily_journey_mission(date) from public; grant execute on function public.ensure_daily_journey_mission(date) to authenticated;
revoke all on function public.complete_journey_action(uuid) from public; grant execute on function public.complete_journey_action(uuid) to authenticated;

insert into public.journey_packs(id,slug,version,title,short_description,description,category,duration_days,difficulty,status) values
('10000000-0000-4000-8000-000000000001','launch-project',1,'Tire um projeto do papel','Transforme uma ideia em um projeto com próximas ações claras.','Defina o resultado, reduza o escopo e execute os primeiros passos verificáveis.','creator',14,'beginner','published'),
('10000000-0000-4000-8000-000000000002','study-sprint',1,'Sprint de estudos — 30 dias','Construa uma rotina de estudo consistente e mensurável.','Organize o foco, planeje sessões e revise o aprendizado com ações reais.','study',30,'beginner','published'),
('10000000-0000-4000-8000-000000000003','validate-business',1,'Valide uma ideia de negócio','Teste o problema e a proposta antes de investir mais.','Converta hipóteses em conversas, evidências e uma decisão fundamentada.','business',21,'intermediate','published'),
('10000000-0000-4000-8000-000000000004','consistent-routine',1,'Construa uma rotina consistente','Crie um ritmo sustentável apoiado em execução real.','Escolha um comportamento, prepare o ambiente e revise evidências de consistência.','personal',30,'beginner','published'),
('10000000-0000-4000-8000-000000000005','plan-trip',1,'Planeje uma viagem','Organize decisões e preparativos essenciais sem sobrecarga.','Defina limites, confirme logística e acompanhe preparativos importantes.','travel',21,'beginner','published');
insert into public.journey_pack_steps(pack_id,sequence,phase,title,description) values
('10000000-0000-4000-8000-000000000001',1,'Descobrir','Defina o resultado do projeto','Escreva o resultado concreto que indicará que este projeto foi entregue.'),('10000000-0000-4000-8000-000000000001',2,'Planejar','Reduza o primeiro escopo','Escolha a menor entrega útil que pode ser concluída.'),('10000000-0000-4000-8000-000000000001',3,'Executar','Execute a primeira entrega','Conclua e verifique a primeira ação do escopo.'),
('10000000-0000-4000-8000-000000000002',1,'Planejar','Defina o foco do sprint','Registre o tema e o resultado de aprendizagem esperado.'),('10000000-0000-4000-8000-000000000002',2,'Executar','Complete uma sessão focada','Realize uma sessão de estudo e registre o que foi aprendido.'),('10000000-0000-4000-8000-000000000002',3,'Revisar','Revise seu aprendizado','Recupere os pontos principais sem consultar o material.'),
('10000000-0000-4000-8000-000000000003',1,'Descobrir','Escreva a hipótese do problema','Defina quem enfrenta o problema e em qual contexto.'),('10000000-0000-4000-8000-000000000003',2,'Executar','Converse com uma pessoa real','Busque evidência sem apresentar sua solução primeiro.'),('10000000-0000-4000-8000-000000000003',3,'Revisar','Registre evidências e decisão','Separe fatos de suposições e decida o próximo teste.'),
('10000000-0000-4000-8000-000000000004',1,'Descobrir','Escolha o comportamento mínimo','Defina uma ação pequena e observável.'),('10000000-0000-4000-8000-000000000004',2,'Planejar','Prepare o ambiente','Remova uma barreira e defina o gatilho da ação.'),('10000000-0000-4000-8000-000000000004',3,'Revisar','Revise evidências reais','Observe execuções concluídas e ajuste o comportamento.'),
('10000000-0000-4000-8000-000000000005',1,'Descobrir','Defina limites da viagem','Registre destino, datas possíveis e orçamento limite.'),('10000000-0000-4000-8000-000000000005',2,'Planejar','Confirme a logística essencial','Verifique transporte, hospedagem e documentos necessários.'),('10000000-0000-4000-8000-000000000005',3,'Executar','Conclua o próximo preparativo','Finalize o item mais importante ainda pendente.');
