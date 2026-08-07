# AI usage and entitlements

`public.subscriptions` is authoritative. Premium requires `status IN ('active','trialing')` and `current_period_end > now()`; `profiles.plan` is never consulted. Backend boundaries decide access. The UI may explain a gate but cannot grant access.

`ai_usage` stores user, action, local ledger date, idempotent request ID and provider-reported input/output units when available. It never stores prompts, model responses, model names or invented costs. Settings meters count real ledger requests.

| Action             | Free/day | Premium/day |
| ------------------ | -------: | ----------: |
| Assistant          |       10 |         100 |
| Translation        |        5 |         100 |
| Content generation |        2 |          50 |
| Study assistance   |        5 |          50 |
| Studio coach       |        3 |          30 |
| Agents             |   locked |          30 |
| Document analysis  |   locked |          20 |

Free Assistant history is retained 30 days. Premium history has no time limit while an eligible subscription remains valid. Premium lessons, agents and document analysis must be rejected by backend logic when a subscription expires or downgrades. The Phase 3 AI chat boundary writes assistant and typed action requests to the ledger; migrations must be applied before deploying it. Translation/content/study/agent legacy calls should send stable request IDs for strict idempotency. A dedicated Studio coach action and complete token updates across typed actions remain rollout limitations.
