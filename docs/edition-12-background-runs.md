# KIVRYN Edition 12 — Background Runs Integration

Edition 12 turns scheduled/system Agent execution into a resilient background lifecycle while retaining the same KIVRYN Agent executor, entitlements and Personal Context Engine.

## Lifecycle

1. `enqueue_due_agent_runs` creates each due schedule occurrence once and advances the Agent schedule.
2. `claim_background_agent_runs` leases queued work using `FOR UPDATE SKIP LOCKED`.
3. The shared `executeAgentRun` executor records context scopes, heartbeat and attempt state.
4. Success persists output and completes the run.
5. Transient provider failures enter `retry_wait` with bounded backoff.
6. The next worker pass promotes due retries back to the queue.
7. Stale running leases are recovered after 15 minutes; after three attempts the run fails terminally.

The legacy `claim_due_agent_runs` RPC remains only as a rolling-deployment compatibility bridge and delegates to the same new enqueue/claim lifecycle. There is no second background execution authority.

## Retry policy

Automatic retries apply only to background `scheduled` / `system` runs and only for transient provider failures:

- provider rate limiting
- provider 5xx / unavailable
- provider transport/error
- provider timeout

Maximum attempts: 3.

Backoff after failed attempt:

- attempt 1 → 5 minutes
- attempt 2 → 15 minutes

Manual Agent runs remain synchronous and terminal: they do not silently become background retries.

## Safety and idempotency

- Existing scheduled occurrence uniqueness `(agent_id, scheduled_for)` remains the idempotency boundary.
- Queue claims use row locking / `SKIP LOCKED`.
- Only `service_role` can enqueue or claim background work.
- Users can read only their own background run state through existing RLS plus explicit owner filters.
- Web/Android status services are read-only and cannot mutate lifecycle state.
- Retry does not create another scheduled occurrence.
- Failure notifications are sent only when the run is terminal; retry-wait is not presented as final failure.
- Personal Context scopes used by the run are persisted for observability.
- Background execution does not imply permission to mutate Tasks, Projects or Studies; Action Layer approval rules remain authoritative.

## Product surface

Web Agents shows current background work count and whether any run is waiting for retry. Android has the equivalent owner-scoped status service ready inside the existing Agents surface; no new top-level navigation or background control panel is introduced.

## Production activation

After the stacked PR reaches `main`:

1. apply `20260915134000_agent_background_runs.sql` to the verified KIVRYN production Supabase project;
2. redeploy `agent-run` because the shared executor changed;
3. redeploy `scheduled-agent-runs` because the worker lifecycle changed;
4. verify one due schedule can enqueue → claim → complete and that transient failure enters retry without duplicate notification;
5. Web delivery can follow the normal Vercel queue if Vercel remains rate-limited.

Final OpenAI Agentic Integration remains deferred to the last ordered Agentic Core task.
