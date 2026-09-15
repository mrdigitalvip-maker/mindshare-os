# Edition 9 architecture

`Agent goal/instructions` → planner output → `parseKivrynActionPlan` → Action Registry/domain authorization → exact-plan approval → `prepareKivrynExecution` → existing `apply_nexora_action` executor → audit/run result.

The Action Registry is server-side authority. Client UI may display plans and collect approval, but clients do not define which actions exist or which fields are legal.

The first workspace action domains are Tasks, Projects and Studies because the existing Assistant/action executor already supports these product areas. Edition 9 deliberately reuses that executor and its owner/idempotency protections rather than introducing a second mutation path.

Existing Agent capabilities are interpreted narrowly:
- `productivity` / `planning`: Tasks + Projects
- `study`: Studies
- writing/summarization and unknown labels: no workspace mutation authority

A valid plan alone never mutates data. Approval is bound to the exact normalized plan fingerprint and explicit step ids. Changed plans require new approval. Scheduled runs therefore cannot silently mutate the workspace merely because a schedule exists.

This edition creates the internal action layer foundation; later ordered Agentic Core work can persist richer action history, context and background execution without weakening this authority boundary.
