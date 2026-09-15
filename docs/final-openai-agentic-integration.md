# KIVRYN — Final OpenAI Agentic Integration

**Queue position: LAST major task of the current Agentic Core package.**

Do not start this work until all previous Agentic Core tasks are complete, applicable build/typecheck/tests are green, Web and Android are stable in current scope, no regressions remain open, and Assistant, Action Layer, Approval, Execution, Context and Agent Runs are integrated.

## Mission

Evolve the existing OpenAI integration without creating a parallel Assistant, chat or provider layer. OpenAI is the intelligence engine; KIVRYN remains product identity, interface, permission authority, data authority, action authority, memory/context authority and entitlement authority.

**OPENAI THINKS. KIVRYN DECIDES WHAT OPENAI CAN TOUCH.**

## Ordered audit/implementation phases

A. Audit the existing OpenAI integration: SDK/contracts, endpoints, Edge Functions, models, streaming, retry, timeout, usage, entitlements, persistence, Assistant conversations, Agents, existing tool/function calling, consumers, Web/Android differences, environment/config and cost controls.

B. Evaluate Responses API as the primary agentic contract only where it provides concrete benefit; preserve stable flows and fallbacks.

C. Map OpenAI custom tool requests to the previously built KIVRYN Action Registry with strict schemas, authentication, owner scope, permission/approval levels, idempotency, structured results, logging and usage accounting. A model tool request is never authorization.

D. Implement bounded multi-step tool loops with max turns, timeout, abort, loop protection, cost protection and recoverable errors.

E. Add official OpenAI Web Search selectively for current external information, with citations, accounting and graceful failure; never call it directly from clients.

F. Evaluate File Search only if it improves the existing Documents architecture while preserving per-user isolation, lifecycle, ownership and deletion.

G. Strengthen a server-side model router for simple, standard, reasoning, agentic, research and background workloads.

H. Evaluate OpenAI Agents API/SDK after KIVRYN orchestration is complete; adopt only where it offers measurable benefit for long-running or complex workflows.

I. If justified, coordinate specialized subagents beneath one visible KIVRYN intelligence and the same tools/permissions/data rules.

J. Integrate long-running OpenAI work with KIVRYN-owned schedules, run IDs, persisted status, retries, notifications and cost controls; do not depend on the client remaining open.

K. Enforce explicit minimal context retrieval: request → intent → required context → owner-scoped retrieval → minimal relevant context → model.

L. Improve response quality by distinguishing casual chat, simple questions, deep analysis, current research, execution, planning, monitoring, creation and decisions.

M. Render Web Search citations safely and consistently on Web and Android.

N. Preserve/improve streaming and expose safe operational states such as Searching, Reading project, Planning, Waiting for approval, Executing and Finishing — never private chain-of-thought.

O. Isolate provider/tool failures with timeout, bounded retry, graceful fallback, malformed-response handling and recoverable UI.

P. Maintain Web + Android parity through the same backend and authority for Assistant, approvals, tools, citations, runs, background results, notifications, reconnect and auth.

Q. Roll out incrementally in production; no big-bang migration, partial UI, missing endpoint or prematurely enabled feature.

R. Record model, tokens, tool calls, web searches, agent runs, duration, estimated usage and success/failure; enforce server-side Free/Premium limits and bounded loops.

S. Security: server-only OpenAI keys, authentication, owner checks, strict schemas, prompt-injection awareness, external-content isolation, approval boundaries, allowlists, rate limits, idempotency, logging, secret protection, sanitized outputs, no arbitrary SQL/tool/filesystem/browser execution.

T. Computer Use stays out of scope unless separately approved later.

U. Mandatory tests: normal chat, deep reasoning, tool selection/execution, approval denied/accepted, web search/failure, internal context, invalid args, permission failure, rate limiting, multi-step agent, background run, Free/Premium, expired session and provider failure across Web and Android; run typecheck, unit/integration tests, Web build and mobile checks.

V. Observability: request/run IDs, model, tool, latency, status, error category and usage without logging secrets or unnecessary private content.

## Success criteria

KIVRYN can combine owner-scoped internal context, selective current external research, approval-gated real actions, persisted Agent Runs and final reporting without making the product a ChatGPT wrapper.

When this task reaches the top of the queue, do not start coding. First produce: current OpenAI state, APIs used, architecture, supported functions, gaps, final proposal, impacted files, migrations, Edge Functions, secrets/config, Web impact, Android impact, cost, risks, security model and a numbered implementation checklist. Then execute one verified step at a time.
