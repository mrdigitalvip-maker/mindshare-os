-- NEXORA pre-v6 Creator table grant hardening.
-- Forward-only. RLS remains authoritative for row ownership.

-- ============================================================
-- ANON
-- Creator and push state require an authenticated session.
-- Remove every direct table privilege, including TRUNCATE.
-- ============================================================

revoke all privileges on table
  public.creator_analytics_content,
  public.creator_analytics_snapshots,
  public.creator_benchmarks,
  public.creator_clips,
  public.creator_content_log,
  public.creator_country_observations,
  public.creator_goals,
  public.creator_jobs,
  public.creator_learning_progress,
  public.creator_manual_country_observations,
  public.creator_manual_metric_snapshots,
  public.creator_oauth_states,
  public.creator_platform_connections,
  public.creator_profiles,
  public.creator_projects,
  public.creator_provider_credentials,
  public.creator_strategies,
  public.creator_usage,
  public.push_devices
from anon;


-- ============================================================
-- AUTHENTICATED
-- Start from zero so structural privileges such as TRUNCATE,
-- REFERENCES and TRIGGER cannot survive default grants.
-- ============================================================

revoke all privileges on table
  public.creator_analytics_content,
  public.creator_analytics_snapshots,
  public.creator_benchmarks,
  public.creator_clips,
  public.creator_content_log,
  public.creator_country_observations,
  public.creator_goals,
  public.creator_jobs,
  public.creator_learning_progress,
  public.creator_manual_country_observations,
  public.creator_manual_metric_snapshots,
  public.creator_oauth_states,
  public.creator_platform_connections,
  public.creator_profiles,
  public.creator_projects,
  public.creator_provider_credentials,
  public.creator_strategies,
  public.creator_usage,
  public.push_devices
from authenticated;


-- ============================================================
-- AUTHENTICATED READ-ONLY TABLES
-- Writes are backend / worker controlled.
-- ============================================================

grant select on table
  public.creator_analytics_content,
  public.creator_analytics_snapshots,
  public.creator_benchmarks,
  public.creator_clips,
  public.creator_country_observations,
  public.creator_jobs,
  public.creator_platform_connections,
  public.creator_usage
to authenticated;


-- ============================================================
-- AUTHENTICATED OWNER CRUD
-- Existing RLS policies continue enforcing auth.uid().
-- ============================================================

grant select, insert, update, delete on table
  public.creator_content_log,
  public.creator_goals,
  public.creator_learning_progress,
  public.creator_manual_country_observations,
  public.creator_manual_metric_snapshots,
  public.creator_profiles,
  public.creator_projects,
  public.creator_strategies,
  public.push_devices
to authenticated;


-- ============================================================
-- SERVER-ONLY TABLES
-- No direct anon/authenticated access:
-- creator_oauth_states
-- creator_provider_credentials
-- service_role grants remain untouched.
-- ============================================================
