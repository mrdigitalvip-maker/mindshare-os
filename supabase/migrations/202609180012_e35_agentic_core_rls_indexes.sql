-- E35 — Agentic Core RLS and FK index hardening.
-- Preserve the existing owner/owned-agent authorization semantics while:
--   1. evaluating auth.uid() once per statement,
--   2. removing duplicate permissive SELECT evaluation on agent_runs,
--   3. covering agents.user_id for FK/owner lookups.
--
-- No client privilege is expanded by this migration.

create index if not exists agents_user_id_idx
  on public.agents(user_id);

drop policy if exists agents_all on public.agents;
create policy agents_all
on public.agents
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- The legacy runs_all policy overlapped with "Owners read agent runs" for SELECT.
-- Consolidate the exact read union into one SELECT policy, then keep mutations
-- independently gated by ownership of the referenced Agent.
drop policy if exists runs_all on public.agent_runs;
drop policy if exists "Owners read agent runs" on public.agent_runs;
drop policy if exists "Owners create agent runs" on public.agent_runs;
drop policy if exists "Owners update agent runs" on public.agent_runs;
drop policy if exists "Owners delete agent runs" on public.agent_runs;

create policy "Owners read agent runs"
on public.agent_runs
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.agents a
    where a.id = agent_runs.agent_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Owners create agent runs"
on public.agent_runs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.agents a
    where a.id = agent_runs.agent_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Owners update agent runs"
on public.agent_runs
for update
to authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.id = agent_runs.agent_id
      and a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.agents a
    where a.id = agent_runs.agent_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Owners delete agent runs"
on public.agent_runs
for delete
to authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.id = agent_runs.agent_id
      and a.user_id = (select auth.uid())
  )
);
