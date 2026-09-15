-- KIVRYN Edition 13 — Agents -> Specialized Skills
-- Persist the exact versioned skill set used by each Agent run for observability.

alter table public.agent_runs
  add column if not exists skill_ids text[] not null default '{}'::text[],
  add column if not exists skill_registry_version smallint not null default 1;

alter table public.agent_runs
  drop constraint if exists agent_runs_skill_ids_check,
  add constraint agent_runs_skill_ids_check
    check (
      skill_ids <@ array[
        'writing.v1',
        'planning.v1',
        'summarization.v1',
        'study.v1',
        'productivity.v1'
      ]::text[]
    ),
  drop constraint if exists agent_runs_skill_registry_version_check,
  add constraint agent_runs_skill_registry_version_check
    check (skill_registry_version between 1 and 100);

create index if not exists agent_runs_user_skills_created_idx
  on public.agent_runs (user_id, created_at desc)
  where cardinality(skill_ids) > 0;
