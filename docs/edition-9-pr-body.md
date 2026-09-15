Closes the Edition 9 Agentic Core Action Layer foundation after merge and repository validation.

## What this delivers
- KIVRYN-owned server Action Registry for Tasks, Projects and Studies
- existing Agent capabilities mapped to explicit workspace domains
- bounded multi-step Intent → Plan contract
- exact-plan, explicit step approval
- guarded execution commands reusing the existing `apply_nexora_action` executor
- deterministic action/request ids for idempotent retries
- safe action audit metadata
- fail-closed unknown/unauthorized action behavior
- security, regression and cross-layer contract coverage

## Architecture boundary
No parallel Assistant or direct database mutation engine is introduced. Scheduling does not imply mutation approval. Final OpenAI Agentic Integration remains deferred to the last ordered Agentic Core task.

## Merge gates
- Web Quality
- Mobile Typecheck
- mergeable against main

## Delivery
If Vercel production remains blocked only by account build-rate limiting after merge, delivery is handed to the automatic KIVRYN Deploy Queue. No dummy commits.

No Android AAB in Edition 9.
