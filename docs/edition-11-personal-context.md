# KIVRYN Edition 11 — Personal Context Engine

## Purpose

Edition 11 makes KIVRYN context-aware without creating a second memory system or giving the model unrestricted database access.

The context authority remains KIVRYN. The model receives only a bounded snapshot selected by KIVRYN from the authenticated user's own data.

## Context scopes

Every Agent receives the minimal baseline scopes:

- `profile`: display name, language, country, timezone, primary goal
- `preferences`: language, timezone, daily goal, week start

Existing Agent capabilities expand context deliberately:

- `planning` / `productivity` → Tasks + Projects
- `study` → Studies + Passport learning profile
- `writing` / `summarization` → no additional workspace domain

Capabilities select readable context. They do not grant mutation approval.

## Security and privacy boundaries

- All service-role reads are explicitly owner-scoped by `userId`.
- No email, auth token, billing data, subscription record, provider secret, arbitrary profile preferences JSON, or cross-user record is included.
- Context rows and fields are allowlisted and length-bounded.
- Context is serialized under a hard character budget before provider calls.
- User-owned context is marked as untrusted data so instructions embedded in a task, project, goal, or profile cannot become system instructions.
- Failed optional context reads are omitted instead of broadening access.
- The model never chooses its own context scope.

## Runtime integration

`agent-execution.ts` loads Personal Context after Agent ownership/entitlement validation and before the provider request. The same executor powers manual and scheduled Agent runs, so background runs inherit the same scope and privacy rules.

The existing Assistant keeps its current owner-scoped workspace loader, but its final workspace snapshot now uses the same `serializeKivrynPersonalContext` bounding contract. This prevents separate Assistant/Agent context formats from drifting.

Manual `agent-run` responses expose the applied `contextScopes` for product transparency. Android Agent models compute the same capability-to-scope mapping so the client can surface it without inventing permissions.

## Deployment

No database migration is required for Edition 11. Production activation requires redeploying the Edge Functions that bundle the shared executor:

- `agent-run`
- `scheduled-agent-runs`

Web deployment contains only contract/documentation changes for this edition; the runtime context change is server-side in Supabase Edge Functions.

## Scope boundary

Edition 11 does not add new mutation tools, autonomous approval, long-running orchestration, connectors, subagents, or the final OpenAI integration. Those remain in the ordered Agentic Core backlog.
