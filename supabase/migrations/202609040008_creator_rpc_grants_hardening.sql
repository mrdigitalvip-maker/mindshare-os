-- NEXORA pre-v6 Creator RPC grant hardening.
-- Forward-only. Historical migrations remain immutable.

-- ============================================================
-- CLIENT RPCs
-- Authenticated users only; service_role retained for backend use.
-- ============================================================

revoke all on function public.enqueue_creator_job(uuid)
from public, anon, authenticated;

grant execute on function public.enqueue_creator_job(uuid)
to authenticated, service_role;


revoke all on function public.cancel_creator_job(uuid)
from public, anon, authenticated;

grant execute on function public.cancel_creator_job(uuid)
to authenticated, service_role;


revoke all on function public.enqueue_creator_rerender(
  uuid,
  bigint,
  bigint,
  text,
  boolean,
  text
)
from public, anon, authenticated;

grant execute on function public.enqueue_creator_rerender(
  uuid,
  bigint,
  bigint,
  text,
  boolean,
  text
)
to authenticated, service_role;


-- ============================================================
-- CREATOR WORKER RPCs
-- Never callable by client roles.
-- ============================================================

revoke all on function public.creator_claim_job(
  text,
  integer,
  integer
)
from public, anon, authenticated;

grant execute on function public.creator_claim_job(
  text,
  integer,
  integer
)
to service_role;


revoke all on function public.creator_heartbeat(
  uuid,
  text,
  integer
)
from public, anon, authenticated;

grant execute on function public.creator_heartbeat(
  uuid,
  text,
  integer
)
to service_role;


revoke all on function public.creator_worker_stage(
  uuid,
  text,
  public.creator_job_status
)
from public, anon, authenticated;

grant execute on function public.creator_worker_stage(
  uuid,
  text,
  public.creator_job_status
)
to service_role;


revoke all on function public.creator_worker_cancel_requested(
  uuid,
  text
)
from public, anon, authenticated;

grant execute on function public.creator_worker_cancel_requested(
  uuid,
  text
)
to service_role;


revoke all on function public.creator_worker_complete(
  uuid,
  text,
  jsonb,
  text,
  integer
)
from public, anon, authenticated;

grant execute on function public.creator_worker_complete(
  uuid,
  text,
  jsonb,
  text,
  integer
)
to service_role;


revoke all on function public.creator_worker_fail(
  uuid,
  text,
  text,
  boolean,
  integer
)
from public, anon, authenticated;

grant execute on function public.creator_worker_fail(
  uuid,
  text,
  text,
  boolean,
  integer
)
to service_role;


-- ============================================================
-- DAILY MISSION
-- Authenticated app users only.
-- ============================================================

revoke all on function public.ensure_daily_journey_mission(date)
from public, anon, authenticated;

grant execute on function public.ensure_daily_journey_mission(date)
to authenticated, service_role;
