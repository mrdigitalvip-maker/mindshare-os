# KIVRYN Edition 9 — Agentic Core Action Layer

Edition 9 starts the ordered Agentic Core backlog without replacing the existing Assistant action engine.

## Task 1 — Action Layer audit + server-side Action Registry

The current product already has a strict model proposal parser and the `apply_nexora_action` execution path. Edition 9 makes the authority boundary explicit with a server-side registry shared by future Assistant and Agent execution.

Initial supported workspace domains are intentionally limited to:

- Tasks
- Projects
- Studies

Every registered Edition 9 workspace mutation requires approval. Unknown actions are rejected rather than simulated. The registry declares domain, risk, required input and optional input so later planner/executor work can consume one allow-list instead of creating a parallel action system.

## Safety invariants

- KIVRYN owns action authority; model output is untrusted input.
- No action outside the registry may execute.
- No scheduled Agent receives silent mutation authority in this task.
- Existing `apply_nexora_action` idempotency/ownership path remains the execution foundation.
- No new top-level navigation is introduced.
- No OpenAI agentic migration is started here; that remains the final major task in the ordered backlog.

## Edition 9 sequence

1. Action Layer audit + server-side Action Registry — implemented in this first slice.
2. Intent → Plan.
3. Permissions + Approval.
4. Execution Engine integration.
5. Action History / Audit Trail.
6. Agent/manual/background integration with explicit allowed domains.
7. Cross-platform contracts and final Edition 9 gates.

Each slice must preserve the existing Assistant behavior while converging Agents and Assistant on the same KIVRYN-controlled action authority.
