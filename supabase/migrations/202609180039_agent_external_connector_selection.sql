-- Post-E62 — explicit external connector selection for KIVRYN Agents.
-- Existing internal connectors remain skill-derived; this column stores only
-- user-selected external OAuth read connectors.

alter table public.agents
  add column if not exists external_connector_ids text[] not null default '{}'::text[];

alter table public.agents
  drop constraint if exists agents_external_connector_ids_check;

alter table public.agents
  add constraint agents_external_connector_ids_check
  check (
    external_connector_ids <@ array[
      'google.gmail'::text,
      'google.calendar'::text,
      'google.drive'::text
    ]
    and cardinality(external_connector_ids) <= 3
  );

alter table public.agents
  drop constraint if exists agents_external_connectors_require_capability_check;

alter table public.agents
  add constraint agents_external_connectors_require_capability_check
  check (
    cardinality(external_connector_ids) = 0
    or 'integrations' = any(coalesce(capabilities, '{}'::text[]))
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_connector_ids_check;

alter table public.agent_runs
  add constraint agent_runs_connector_ids_check
  check (
    connector_ids <@ array[
      'workspace.tasks'::text,
      'workspace.projects'::text,
      'workspace.studies'::text,
      'workspace.documents'::text,
      'google.gmail'::text,
      'google.calendar'::text,
      'google.drive'::text
    ]
    and cardinality(connector_ids) <= 7
  );

comment on column public.agents.external_connector_ids is
  'User-selected external read connectors for this Agent. Credentials remain server-only.';
