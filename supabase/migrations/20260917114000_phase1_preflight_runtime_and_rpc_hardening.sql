-- Final Phase 1 preflight hardening (E1-E20 only; this is not E21).
-- Keep Agent observability constraints aligned with the E17 Documents context connector.
ALTER TABLE public.agent_runs
  DROP CONSTRAINT IF EXISTS agent_runs_context_scopes_check;

ALTER TABLE public.agent_runs
  ADD CONSTRAINT agent_runs_context_scopes_check
  CHECK (
    context_scopes <@ ARRAY[
      'profile',
      'preferences',
      'tasks',
      'projects',
      'studies',
      'passport',
      'documents'
    ]::text[]
  );

ALTER TABLE public.agent_runs
  DROP CONSTRAINT IF EXISTS agent_runs_connector_ids_check;

ALTER TABLE public.agent_runs
  ADD CONSTRAINT agent_runs_connector_ids_check
  CHECK (
    connector_ids <@ ARRAY[
      'workspace.tasks',
      'workspace.projects',
      'workspace.studies',
      'workspace.documents'
    ]::text[]
  );

-- Trigger/internal helpers are never client RPCs.
REVOKE EXECUTE ON FUNCTION public.apply_verified_mission_effects(public.journey_missions) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_verified_missions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_passport_language_track() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_passport_placement(uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;

-- Entitlement helpers are server-owned. Edge Functions call them with service_role.
REVOKE EXECUTE ON FUNCTION public.has_internal_full_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_premium(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_internal_full_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_premium(uuid, timestamptz) TO service_role;

-- Auth-bound public RPCs must never inherit anonymous EXECUTE from PUBLIC.
REVOKE EXECUTE ON FUNCTION public.claim_feature_usage(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_journey_action(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_studio_lesson(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_passport_daily_missions(uuid, date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_arena_challenges() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_distribution_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_access(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_passport_placement_questions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_unlimited_ai() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_arena_challenge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_passport_vocabulary(uuid, smallint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_journey_pack(uuid, uuid, text, date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_passport_placement(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_passport_profile(uuid, text, text, date, integer, integer, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_feature_usage(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_journey_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_studio_lesson(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_passport_daily_missions(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arena_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distribution_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_passport_placement_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_unlimited_ai() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_arena_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_passport_vocabulary(uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_journey_pack(uuid, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_passport_placement(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_passport_profile(uuid, text, text, date, integer, integer, boolean) TO authenticated;
