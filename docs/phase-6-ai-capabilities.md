# Phase 6 — AI capabilities

## Confirmed base and architecture

The checkout contains the Phase 5 persistent assistant (`ai-chat`, `AIService`, `use-chat`, and the
Assistant route) at commit `66e46a2`. Phase 6 extends the existing `ai-chat` Edge Function with typed
actions rather than introducing independent public endpoints. Authentication, subscription lookup,
backend-only model selection, provider timeout/error handling, safe logging, and user-scoped queries
remain at that boundary. Only `subscriptions.status` values `active` and `trialing` grant Premium.

The actions are `send` (basic/advanced chat), `translation`, `agent_run`, `content_generation`,
`study_assistance`, and `document_analysis`. `finance_insights` is represented in the capability
contract but remains blocked until a reviewed financial prompt/data contract exists.

## Capability and limit matrix

Limits are daily defaults and may be lowered or raised through backend environment configuration for
chat. They are never unlimited.

| Capability         | Free                                    | Premium                    |
| ------------------ | --------------------------------------- | -------------------------- |
| Basic chat         | 10 messages/day, 2,000 input characters | 100/day, 12,000 characters |
| Advanced chat      | blocked                                 | included in chat limit     |
| Translation        | 5/day, 1,500 characters                 | 100/day, 12,000 characters |
| Agents             | `premium_required`                      | 30/day, 16,000 characters  |
| Content generation | 2/day, 2,000 characters                 | 50/day, 16,000 characters  |
| Study assistance   | 5/day, 2,000 characters                 | 50/day, 16,000 characters  |
| Document analysis  | `premium_required`                      | 20/day, 30,000 characters  |
| Finance insights   | blocked                                 | blocked pending contract   |

Chat is counted from persisted user messages. Typed-action checks happen before the provider call.
Because the existing schema has no cross-action usage ledger or idempotency key, non-persisted action
counters and general request deduplication are isolate-local best-effort protections. Translation,
content, and agent outputs also leave durable records that can support reconciliation, but the current
implementation does not claim atomic or concurrency-perfect quotas. A future migration should add an
atomic `(user_id, action, period, request_id)` usage ledger and unique idempotency constraint.

## Flows and persistence

- **Translation:** validates languages/text, calls the backend-selected provider model, and inserts a
  user-scoped `translations` row with provider `openai` only after a non-empty provider result. Failures
  are not saved.
- **Agents:** requires Premium, loads an agent scoped to the authenticated user, rejects a matching
  queued/running request, creates a running `agent_runs` row, executes its server-read system prompt,
  then records output/status/`finished_at`. Provider or persistence failures mark the run failed; the
  system prompt and model never leave the backend.
- **Content:** supports draft, rewrite, summarize, expand, tone, and title operations. A successful
  result creates a new `documents` draft; originals are never overwritten automatically.
- **Studies:** supports explain, summarize, questions, flashcards, and study-plan responses. It does
  not create fictional subjects or sessions and does not persist unless a future explicit save
  contract requests it.
- **Documents:** only existing textual `documents.content` is accepted and ownership is checked before
  content is read. Empty documents and oversize content fail safely. Physical-file analysis is
  explicitly unavailable.

## Security and errors

`OPENAI_API_KEY`, model names, prompts, plan resolution, and capability enforcement live only in the
Edge Function. The browser uses the Supabase anonymous client and authenticated Function invocation;
there is no service-role key or direct OpenAI call. Logs contain event, request ID, user ID, and safe
error code—not tokens, authorization headers, prompts, document bodies, or provider payloads.

The public error vocabulary is: `unauthorized`, `premium_required`, `free_limit_reached`,
`premium_limit_reached`, `action_limit_reached`, `invalid_request`, `input_too_large`,
`resource_not_found`, `duplicate_request`, `provider_rate_limited`, `provider_unavailable`,
`provider_error`, `persistence_error`, `configuration_error`, and `timeout`. Responses never include
stack traces or internal provider details.

## Configuration and deployment

Required Edge Function secrets are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`.
Optional backend-only variables include `OPENAI_FREE_MODEL`, `OPENAI_PREMIUM_MODEL`,
`OPENAI_TIMEOUT_MS`, and the Phase 5 chat limit/context variables. Deploy with
`supabase functions deploy ai-chat`; configure secrets with the Supabase dashboard or
`supabase secrets set` and never a `VITE_` prefix.

## Manual blockers and next steps

No migration, RLS policy, Stripe behavior, price, or secret was changed. Before physical file analysis,
create and review a private Storage bucket, file-path convention, MIME/size validation, extraction
pipeline, retention policy, and a real relationship between `documents` and `files`. Before production
scale, add the atomic action ledger, database uniqueness for request IDs, provider telemetry without
content, stale-running-agent recovery, and integration tests against a local Supabase stack.
