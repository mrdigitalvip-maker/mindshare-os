# KIVRYN Edition 14 — Final Agentic Core

## Product rule

**OPENAI THINKS. KIVRYN DECIDES WHAT OPENAI CAN TOUCH.**

OpenAI is the reasoning engine. KIVRYN remains the authority for identity, entitlement, personal context, skills, connectors, subagents, action permissions, approvals, persistence and audit history.

## Runtime architecture

1. The authenticated user runs an Agent manually or a scheduled occurrence is claimed by the existing background worker.
2. KIVRYN verifies Premium/internal entitlement and claims the logical Agent run against the server-side daily usage budget.
3. KIVRYN resolves the Agent's versioned Skills.
4. Skills determine the maximum personal-context scopes and Action Layer domains.
5. KIVRYN resolves only registered internal connectors for those scopes.
6. KIVRYN resolves only registered internal subagents for those Skills.
7. The Personal Context Engine loads bounded, owner-scoped context.
8. The Agent executor calls the OpenAI Responses API with strict function tools and `parallel_tool_calls: false`.
9. A subagent delegation is executed by KIVRYN as a second bounded Responses request with no tools, no mutation authority and no recursive delegation.
10. A workspace function call can only propose a plan. The proposal is parsed as untrusted data through the existing KIVRYN Agentic Core/Action Registry.
11. The validated plan and fingerprint are persisted on the Agent run as `pending_approval`. No workspace mutation occurs.
12. Web or Android displays the stored plan to the owner.
13. Approval sends only the run id, exact plan fingerprint and selected step ids to `agent-action-review`.
14. The review function reloads the stored plan, revalidates capabilities + fingerprint, prepares deterministic commands and invokes the existing authenticated `apply_nexora_action` RPC.
15. Applied actions continue to be idempotent and auditable in `nexora_action_runs`.

## OpenAI tools

The final Agent runtime exposes only two KIVRYN-controlled function tools:

- `kivryn_delegate_subagent`: delegate a bounded analysis task to an allowed internal specialist.
- `kivryn_propose_workspace_plan`: propose an Action Registry-backed plan for later explicit approval.

No Computer Use tool is enabled. No arbitrary database, shell, URL, connector, MCP or client-defined tool can be invented by the model.

## Connectors

Edition 14 establishes the connector authority boundary with three internal, read-only context adapters:

- `workspace.tasks`
- `workspace.projects`
- `workspace.studies`

They expose only context already authorized by KIVRYN Skills. They cannot mutate. External OAuth/MCP connectors are not implicitly connected; each future external connector must be deliberately added to the registry and its own permission model.

## Internal subagents

Version 1 includes:

- `editor.v1`
- `planner.v1`
- `analyst.v1`
- `tutor.v1`
- `operator.v1`

KIVRYN resolves at most three roles for a run and the OpenAI orchestration may delegate at most two tasks. Subagents receive bounded context, have no tools, cannot mutate data and cannot delegate recursively.

## Workspace action authority

The final runtime does not replace the existing Action Layer. It reuses it.

Supported mutation domains remain Tasks, Projects and Studies. Every plan is checked against the Agent's capability-derived domains and the server Action Registry. Unsupported tools/domains/actions fail closed.

Scheduled execution does not imply approval. A scheduled Agent can produce a useful result and a pending plan, but it cannot silently mutate the user's workspace.

## Cost and entitlement controls

- Agent execution remains Premium/internal-authorized server-side.
- Premium Agent runs use an atomic daily logical-run budget (`PREMIUM_AGENT_DAILY_LIMIT`, default 30).
- A retry of the same background run is idempotent and does not consume a second usage unit.
- Internal full-access users are handled separately from the Premium usage ceiling.
- Provider calls have a bounded timeout.
- Tool rounds and subagent delegations are bounded.

## Security hardening

Edition 14 changes `agent_runs` from client-manageable to client read-only:

- authenticated users may select only their own runs through RLS;
- authenticated/anon clients cannot insert, update or delete Agent run authority state;
- Edge Functions use the service role only for server-owned run state;
- actual workspace mutations are executed through an authenticated scoped client so `auth.uid()` remains authoritative inside `apply_nexora_action`;
- the approval endpoint never accepts a free-form action or plan payload from the client.

## Web experience

The existing Agent workspace now shows pending plans inside the Run tab. The user can review each proposed action, approve remaining actions or reject the plan. History surfaces plan state and delegated subagents.

## Android experience

The existing Agents screen now includes **Aprovações pendentes**. Scheduled plans can be reviewed and approved/rejected on Android without adding another top-level navigation item.

## Production activation

After merge, activate in this order on the verified KIVRYN Supabase project:

1. Ensure all prior Agentic Core migrations through Edition 13 are applied.
2. Apply `20260915150000_final_agentic_core.sql`.
3. Deploy `agent-run`.
4. Deploy `scheduled-agent-runs`.
5. Deploy `agent-action-review`.
6. Smoke a plain manual Agent response.
7. Smoke an internal subagent delegation.
8. Smoke a workspace plan proposal and verify no mutation happened before approval.
9. Approve the plan and verify the existing action audit records the mutation.
10. Smoke a scheduled Agent that produces a pending approval and verify it never auto-applies.

Vercel is separate from this backend activation. A Vercel build-rate limit can delay the public Web deployment but does not prevent local repository sync, Android testing or Supabase migration/function activation.
