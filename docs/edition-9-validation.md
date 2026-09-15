# Edition 9 validation gates

Edition 9 is complete only when all of the following are true:

- server-side Action Registry is the explicit allow-list for Tasks, Projects and Studies
- planner output is bounded, registry-backed and domain-scoped
- every workspace mutation requires approval bound to the exact plan
- execution preparation emits only approved commands for the existing `apply_nexora_action` path
- unsupported actions are rejected, never simulated
- no new top-level navigation or parallel Assistant/action engine is introduced
- Action Registry, plan, approval and execution contract tests pass
- existing Web Quality gate passes
- existing Mobile Typecheck gate passes
- PR is merged to `main`
- production deployment is monitored separately when Vercel rate limits prevent immediate delivery

The Vercel build-rate limit is an external delivery gate, not a reason to mutate product code or block the next ordered Agentic Core task after Edition 9 has passed repository gates and merged.
