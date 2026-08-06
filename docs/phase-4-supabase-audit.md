# Phase 4 Supabase schema audit

This audit is derived exclusively from `src/integrations/supabase/types.ts`. All live service calls authenticate first, add a `user_id` filter, and leave authorization enforcement to the existing RLS policies.

## Study

- `study_subjects`: `id: string` is required; `color`, `created_at`, `name`, and `user_id` are nullable. `user_id` references `profiles.id`.
- `study_sessions`: `id: string` is required; `completed`, `created_at`, `duration`, `subject_id`, and `user_id` are nullable. `subject_id` references `study_subjects.id`; `user_id` references `profiles.id`.
- The schema supports subjects, elapsed-duration sessions, completion, history, and aggregate duration. It has no start/end timestamps or scheduled-session field, so starting a timed session and displaying a real next-session date are not supported.

## Finance

- `finance_accounts`: `id` and `name` are required. `balance`, `created_at`, `currency`, `type`, and `user_id` are nullable. `user_id` references `profiles.id`.
- `finance_transactions`: only `id` is required. `account_id`, `amount`, `category`, `created_at`, `title`, `transaction_date`, `type`, and `user_id` are nullable. `account_id` references `finance_accounts.id`; `user_id` references `profiles.id`.
- Accounts and income/expense transactions are supported. The current UI's public `FinanceGoal` contract has no matching goal table or target column. In live mode it is therefore a compatibility view of accounts, not a fabricated savings goal; no fixed totals are used in calculations.

## Agents

- `agents`: only `id` is required. `active`, `created_at`, `description`, `model`, `name`, `system_prompt`, `temperature`, and `user_id` are nullable. `user_id` references `profiles.id`.
- `agent_runs`: only `id` is required. `agent_id`, `finished_at`, `input`, `output`, `started_at`, and `status` are nullable. `agent_id` references `agents.id`; there is no direct `user_id`.
- CRUD, active state, and run history are supported. Run ownership must be established through the authenticated user's agents. No provider invocation is implemented; attempts return a controlled unavailable error and create no fake run.

## Translation and preferences

- `translations`: only `id` is required. `created_at`, `original_text`, `provider`, `source_language`, `target_language`, `translated_text`, and `user_id` are nullable. `user_id` references `profiles.id`.
- `user_preferences`: `id` and `user_id` are required. `ai_model`, `created_at`, `daily_goal`, `language`, `theme`, `timezone`, `updated_at`, and `week_start` are nullable. `user_id` references `profiles.id`.
- Translation history CRUD is supported, but translation generation is blocked until a real provider exists. Preferences are a row-shaped record, not an arbitrary key/value store; lookup keys are limited to actual preference columns. The generated relationships do not declare `user_id` unique, so service upsert is implemented as authenticated read-then-create/update rather than relying on an unsupported conflict constraint.

## Content, documents, files, and storage

- `notes`: only `id` is required. `content`, `created_at`, `pinned`, `title`, `updated_at`, and `user_id` are nullable. `user_id` references `profiles.id`. This is appropriate for user notes.
- `documents`: only `id` is required. `content`, `created_at`, `title`, `type`, `updated_at`, and `user_id` are nullable. `user_id` references `profiles.id`. This is appropriate for drafts and text content; drafts are distinguished by `type = 'draft'`.
- `files`: only `id` is required. `bucket`, `created_at`, `mime_type`, `name`, `path`, `size`, and `user_id` are nullable. `user_id` references `profiles.id`. This is appropriate for physical-file metadata.
- There is no metadata JSON column and no relationship between `documents` and `files`. A full upload/document attachment contract is therefore blocked. Database record operations remain available, but storage upload is intentionally not attempted.
- A non-avatar document bucket and its owner-scoped `storage.objects` policies must be created manually before physical document uploads can be enabled. The application does not assume a bucket name, and this phase does not modify Storage.

## Subscriptions

- `subscriptions`: only `id` is required. `cancel_at_period_end`, `created_at`, `current_period_end`, `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `updated_at`, and `user_id` are nullable. `user_id` has a one-to-one relationship with `profiles.id`.
- `SubscriptionStatusService` reads this table as the official source. Only `active` and `trialing` confer premium access; missing, `canceled`, `unpaid`, `incomplete`, and `past_due` subscriptions remain free. There is no profile-plan fallback.
- The checked-in checkout function authenticates the user and the webhook writes the expected subscription identifiers/status fields. No Edge Function was modified in this phase.

## Security and production behavior

The frontend uses only the Supabase URL and anonymous key. No service-role key or secret is present in the services. Live operations require `supabase.auth.getUser()`, scope direct user-owned tables by `user_id`, and propagate Supabase errors. `agent_runs` are scoped through owned agents. Demo data and simulated translation remain reachable only when `VITE_DEMO_MODE=true`; failed or unavailable live providers never silently return mock success.
