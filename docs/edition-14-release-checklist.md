# Edition 14 — Final Agentic Core release checklist

## Repository gates

- [ ] Web build succeeds.
- [ ] Web typecheck succeeds.
- [ ] Contract tests succeed.
- [ ] Mobile Typecheck succeeds.
- [ ] PR is mergeable and based on the latest validated `main`.

## Security contracts

- [ ] `agent_runs` is owner-select-only for authenticated clients.
- [ ] Clients cannot insert/update/delete Agent run authority state.
- [ ] Only service role can claim the atomic Agent daily usage budget.
- [ ] OpenAI orchestration contains no direct database/RPC mutation path.
- [ ] `agent-action-review` accepts no client action payload.
- [ ] Approval validates the stored plan fingerprint and Agent capabilities again.
- [ ] `apply_nexora_action` is called with an authenticated scoped client and `p_confirmed: true`.
- [ ] Scheduled execution never calls the action RPC automatically.
- [ ] Computer Use remains disabled.

## Agentic runtime contracts

- [ ] OpenAI Responses API is used for final Agent orchestration.
- [ ] Function schemas are strict and reject extra properties.
- [ ] Parallel tool calls are disabled.
- [ ] Tool rounds are bounded.
- [ ] Subagent delegation count is bounded.
- [ ] Subagents have no tools, mutation or recursive delegation authority.
- [ ] Connectors are KIVRYN-owned and read-only.
- [ ] Unknown capability/skill/connector/subagent/action values fail closed.
- [ ] Workspace plans remain at most 8 steps.

## Production activation

- [ ] Verify the exact KIVRYN production Supabase project before any mutation.
- [ ] Apply pending Agentic Core migrations in chronological order.
- [ ] Apply `20260915150000_final_agentic_core.sql`.
- [ ] Deploy `agent-run`.
- [ ] Deploy `scheduled-agent-runs`.
- [ ] Deploy `agent-action-review`.
- [ ] Verify all three functions are ACTIVE.
- [ ] Smoke manual response without workspace action.
- [ ] Smoke subagent delegation.
- [ ] Smoke plan proposal; verify zero mutation before approval.
- [ ] Approve proposal; verify idempotent action + audit history.
- [ ] Smoke scheduled proposal; verify notification says approval is required.
- [ ] Verify a rejected plan cannot be applied.

## Delivery

- [ ] Pull merged `main` once on the notebook; do not pull edition-by-edition.
- [ ] Test Web/local and Android from the same merged revision.
- [ ] Do not create a new AAB without explicit authorization.
- [ ] Treat Vercel rate limiting as a Web-production delivery issue, not a repository/backend blocker.
