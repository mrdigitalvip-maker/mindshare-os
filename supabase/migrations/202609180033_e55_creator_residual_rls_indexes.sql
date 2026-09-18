-- E55 — Creator residual RLS + FK index hardening.
-- Preserve existing authenticated owner semantics while evaluating auth.uid()
-- once per statement. Add only advisor-backed missing leading FK indexes.

create index if not exists creator_goals_user_id_idx
  on public.creator_goals(user_id);
create index if not exists creator_jobs_project_id_user_id_idx
  on public.creator_jobs(project_id, user_id);
create index if not exists creator_manual_country_observations_user_id_idx
  on public.creator_manual_country_observations(user_id);
create index if not exists creator_manual_metric_snapshots_content_id_idx
  on public.creator_manual_metric_snapshots(content_id);
create index if not exists creator_oauth_states_user_id_idx
  on public.creator_oauth_states(user_id);

drop policy if exists creator_content_log_owner_all on public.creator_content_log;
create policy creator_content_log_owner_all
on public.creator_content_log
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_goals_owner_all on public.creator_goals;
create policy creator_goals_owner_all
on public.creator_goals
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_jobs_owner_select on public.creator_jobs;
create policy creator_jobs_owner_select
on public.creator_jobs
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.creator_projects p
    where p.id = creator_jobs.project_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists creator_learning_owner_all on public.creator_learning_progress;
create policy creator_learning_owner_all
on public.creator_learning_progress
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_manual_country_owner_all on public.creator_manual_country_observations;
create policy creator_manual_country_owner_all
on public.creator_manual_country_observations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_manual_metrics_owner_all on public.creator_manual_metric_snapshots;
create policy creator_manual_metrics_owner_all
on public.creator_manual_metric_snapshots
for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.creator_content_log c
    where c.id = creator_manual_metric_snapshots.content_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists creator_strategies_owner_all on public.creator_strategies;
create policy creator_strategies_owner_all
on public.creator_strategies
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists creator_usage_owner_select on public.creator_usage;
create policy creator_usage_owner_select
on public.creator_usage
for select
to authenticated
using ((select auth.uid()) = user_id);
