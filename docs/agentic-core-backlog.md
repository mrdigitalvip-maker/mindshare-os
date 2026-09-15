# KIVRYN Agentic Core — ordered backlog

This backlog is intentionally sequential. Finish and validate one task before starting the next.

1. Action Layer audit and server-side Action Registry
2. Intent → Plan
3. Permissions + Approval
4. Execution Engine
5. Action History / Audit Trail
6. Personal Context Engine
7. Background Runs integration
8. Agents → Specialized Skills
9. Skills + Connectors + Subagents foundation
10. Command Center Intelligence
11. Cost + Entitlements
12. Security hardening + final internal E2E flow
13. Final OpenAI Agentic Integration — LAST major task

## Final OpenAI Agentic Integration gate

Do not start task 13 until all previous Agentic Core tasks are complete, applicable build/typecheck/tests are green, Web and Android are stable in current scope, no regressions are open, and Assistant, Action Layer, Approval, Execution, Context and Agent Runs are integrated.

When task 13 reaches the top of the queue, audit before coding: existing OpenAI SDK/contracts/endpoints/models/streaming/retry/timeout/usage/entitlements/persistence/Assistant/Agents/tool calling, Web versus Android differences, environment/config and cost controls. Then evaluate Responses API, typed custom tools through the KIVRYN Action Registry, multi-step tool loops, selective OpenAI Web Search, File Search only where justified, model routing, controlled Agents API/SDK adoption, subagents, long-running workloads, explicit context minimization, citations, operational streaming states, failure isolation, cross-platform parity, incremental rollout, cost controls, security, mandatory tests and observability.

Central rule: **OPENAI THINKS. KIVRYN DECIDES WHAT OPENAI CAN TOUCH.** OpenAI is the intelligence engine; KIVRYN remains identity, interface, context/memory authority, permission authority, data authority, action authority and entitlement authority. Computer Use remains outside this package unless separately approved later.
