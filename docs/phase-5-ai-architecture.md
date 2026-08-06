# Phase 5: production AI architecture

## Architecture found before this phase

The Assistant route used `useChat`, but responsibilities were split. The hook directly created and
queried `ai_conversations` and `ai_messages`, constructed client-controlled history, called
`AIService`, and then persisted the assistant response. `AIService` invoked `ai-chat`, with an
explicit demo fallback. The Edge Function authenticated the bearer token and called OpenAI, but it
accepted arbitrary roles/history from the browser, fixed a model in code, returned the model name,
had no subscription lookup, no usage limits, no timeout, and no server-side persistence. Responses
were non-streaming. Errors exposed provider details and server stack information in logs/responses.

The schema provides `ai_conversations`, `ai_messages`, `subscriptions`, `profiles`, and
`activity_logs`. A message has a creation time and optional token count; a conversation belongs to a
user. This permits an owner-scoped UTC daily count of persisted user messages. There is no usage
ledger, idempotency-key column, response-to-request relationship, or trial-specific field.

## Resulting request flow

1. The browser sends only `action`, a message, an optional conversation ID, and a client-generated
   UUID used as the user-message ID. It cannot send a model, plan, system prompt, limits, or history.
2. `ai-chat` validates the bearer token with Supabase Auth and uses the resulting user ID for every
   query. An existing conversation must belong to that user; otherwise it is rejected.
3. The function reads the latest `subscriptions` row. Only `active` and `trialing` are Premium; every
   other status or no row is Free. `profiles.plan` is never read for authorization.
4. Before OpenAI is called, the backend applies its plan policy, validates input size, counts today's
   persisted user messages, rejects a repeated message UUID, and persists the new user message.
5. The backend loads only that conversation's ordered history and trims it by both message count and
   character count. The NEXORA system prompt is added only in the Edge Function.
6. OpenAI receives the backend-selected model and output cap. The call has an explicit timeout and no
   automatic retry, avoiding accidental duplicate provider calls.
7. Only a real provider response is stored as an assistant message. The response and conversation
   timestamp are returned after persistence. Reload uses the Edge Function's `history` action, which
   finds the authenticated user's latest conversation and returns chronological messages.

The transport remains non-streaming. Streaming was not already present; adding it would change the
Supabase Functions invocation contract and complicate atomic persistence/cancellation. A later phase
can add streaming with an explicit event protocol and response idempotency.

## Free/Premium policy and configuration

All policy values are Edge Function environment variables. The defaults, used only in backend code
when an optional variable is absent, are:

| Policy                    | Free default | Premium default | Variable                                                   |
| ------------------------- | -----------: | --------------: | ---------------------------------------------------------- |
| User messages per UTC day |           10 |             100 | `FREE_DAILY_MESSAGE_LIMIT` / `PREMIUM_DAILY_MESSAGE_LIMIT` |
| Input characters          |        2,000 |          12,000 | `FREE_MAX_INPUT_CHARS` / `PREMIUM_MAX_INPUT_CHARS`         |
| Output tokens             |          400 |           1,600 | `FREE_MAX_OUTPUT_TOKENS` / `PREMIUM_MAX_OUTPUT_TOKENS`     |
| Context messages          |            8 |              30 | `FREE_CONTEXT_MESSAGES` / `PREMIUM_CONTEXT_MESSAGES`       |
| Context characters        |        8,000 |          40,000 | `FREE_CONTEXT_CHARS` / `PREMIUM_CONTEXT_CHARS`             |

The model variables are `OPENAI_FREE_MODEL` and `OPENAI_PREMIUM_MODEL`; backend-only defaults are
`gpt-4.1-mini` and `gpt-4.1`, respectively. Change either with Supabase secrets/configuration and
redeploy the function; no screen or client bundle changes are needed. The OpenAI request timeout is
controlled by `OPENAI_TIMEOUT_MS` and defaults to 30 seconds.

Capability flags returned by the backend form the reusable boundary for later modules. Basic chat is
available to both plans. Advanced chat, agents, translations, content generation, document analysis,
study assistance, and financial insights are enabled only when the backend resolved Premium. This
phase does not connect agents or translations, so no partial/fictitious execution is introduced.

## Error contract and security

Responses use `{ ok: true, data }` or `{ ok: false, error: { code, message, requestId } }`. Typed codes
cover authentication, validation, per-plan limits, input size, provider availability/rate limiting,
provider failure, persistence, and configuration. The frontend maps this contract to friendly errors,
restores failed input, blocks concurrent submission, and performs no automatic mutation retry.

`OPENAI_API_KEY`, model selection, policy, usage counting, subscription resolution, and the system
prompt stay in the Edge Function. Logs contain request/user identifiers and error categories only;
they do not contain authorization headers, API keys, prompts, messages, provider bodies, or stacks.
The frontend uses only the public Supabase URL/anonymous key and the authenticated user's JWT. Existing
RLS and policies are unchanged.

## Trial audit and remaining schema limitations

`subscriptions.status = 'trialing'` is the only safe existing trial contract and grants Premium.
Although `profiles.created_at` and the Auth user creation time exist, the repository has no product
contract proving that profile/account creation starts an automatic seven-day Premium trial, and no
trial start/end fields. `TRIAL_DAYS` is therefore reserved but deliberately not applied.

To support an automatic trial safely, add a server-managed entitlement/trial record with at least
`user_id`, `starts_at`, `ends_at`, `status`, and a uniqueness constraint, or guarantee creation of a
real `subscriptions` row with `status = 'trialing'` and `current_period_end`. That requires a future
schema/RLS/migration phase.

Daily usage is derived from persisted user messages across the user's conversations. This is secure
with owner-scoped queries and adequate at current scale, but repeated conversation-ID collection is
less efficient than a ledger and cannot reserve quota atomically under simultaneous requests. A later
usage ledger should have a unique `(user_id, period_start, capability)` key, an atomic increment RPC,
request idempotency keys, and provider/input/output token counters. The current user-message UUID
rejects straightforward retries, but the schema cannot link a completed assistant response to its
request for full replay after a lost HTTP response.

## Manual setup

1. Set `OPENAI_API_KEY` as a Supabase Edge Function secret. Never prefix it with `VITE_`.
2. Optionally set the model, limits, context, and timeout variables listed in `.env.example`.
3. Ensure the deployed `ai-chat` function verifies JWTs and has access to `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` (provided by Supabase-hosted functions).
4. Confirm authenticated users can read their own subscription and conversation data and can mutate
   their own AI rows through existing RLS. No policy is changed by this phase.
5. In OpenAI, fund/configure the project behind the key, allow the chosen backend models, and apply
   provider-side budget/rate limits as defense in depth.
6. Deploy `ai-chat`. Use `VITE_DEMO_MODE=true` only for an explicit local/demo experience.

Estimate cost from measured input/output tokens and the current official OpenAI price for the models
configured at deployment time. No fixed model price is recorded here because model availability and
pricing change; use provider budget alerts plus the conservative application limits above.
