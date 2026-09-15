# KIVRYN Edition 10 — Action History & Audit Trail

Edition 10 makes KIVRYN workspace actions traceable across Web and Android without creating a second executor or a new top-level module.

## What changed

- Reuses the existing owner-scoped `nexora_action_runs` table as the persistent source of truth for applied workspace actions.
- Adds a Web action-history service and an Android action-history service with explicit owner filtering and bounded result limits.
- Surfaces recent action history inside the existing Agents experience on Web and Android.
- Keeps action history limited to execution metadata: action type, status, resource reference and timestamps. Planner payload contents are not exposed by the new history services.
- Fixes the Edition 9 execution-command identifiers so `actionId` and `requestId` are deterministic UUID-shaped values compatible with the existing `apply_nexora_action(uuid, uuid, ...)` RPC.

## Security and truth boundaries

- RLS and owner filtering remain the data-access boundary.
- Clients can read their own history; they do not gain mutation authority over audit records.
- No schedule is treated as approval to mutate workspace data.
- Unknown or unauthorized actions still fail closed through the Edition 9 Action Registry and plan/approval boundary.
- This edition does not claim that failed executor attempts are durably persisted: the legacy executor currently rolls back its claim when the transaction raises. Successfully applied actions are persistently auditable.

## Architecture

`Plan → exact approval → guarded execution command → existing apply_nexora_action → nexora_action_runs → Web/Android audit UI`

No new database table or migration is required for Edition 10 because the existing action-run table already provides the necessary persistent owner-scoped history for successful actions.

## Scope boundary

Edition 10 does not introduce autonomous OpenAI tool loops, silent background mutations, a new navigation destination, or an Android AAB. Final OpenAI Agentic Integration remains deferred to the last ordered Agentic Core task.
