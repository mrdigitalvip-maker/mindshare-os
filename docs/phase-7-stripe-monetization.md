# Phase 7 — Stripe monetization operations

## Architecture and entitlement

`public.subscriptions` is the only billing entitlement source. The browser reads it under RLS and
`ai-chat` checks it server-side. Only `active` and `trialing` grant Premium, and only until
`current_period_end`. Every other status (including missing, `canceled`, `past_due`, `unpaid`,
`incomplete`, `incomplete_expired`, and `paused`) is Free. `profiles.plan`, redirects, and browser
state never grant access.

The authenticated browser invokes `create-checkout-session` or `create-portal-session`. Stripe
sends signed events to `stripe-webhook`, which uses the service role only after signature
verification and upserts the one subscription row per user. Secrets never enter the Vite bundle.

## Checkout and seven-day trial

Checkout validates the configured recurring Price, uses subscription mode, and puts the
authenticated user ID in `client_reference_id`, session metadata, and subscription metadata.
It reuses the stored Stripe customer and rejects an existing `active`/`trialing` subscription.
Success and cancellation return to `/premium?checkout=success|cancelled`; this query parameter only
triggers a refetch/message and cannot grant Premium.

The first checkout for a user with no stored `stripe_subscription_id` receives Stripe's real
`trial_period_days: 7`. This applies to both existing and new accounts when they start their first
Stripe subscription. A retained prior subscription ID suppresses later trials. The webhook stores
Stripe's `trialing` status and period end; no account creation timestamp or synthetic client trial
is used.

**Limitation:** without an immutable trial ledger, deleting or losing the subscription row can
permit another trial. No migration was requested in this phase. The durable solution is a
service-only `subscription_trial_ledger(user_id unique, first_trial_started_at,
stripe_subscription_id)` (or immutable `trial_used_at` on a protected billing table).

## Webhook, persistence, and idempotency

Configure these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded` (handled defensively for delayed payment methods)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

The webhook uses `constructEventAsync` and resolves the user from subscription metadata first,
then the checkout `client_reference_id`, then session metadata, and finally an existing row matched
by Stripe subscription/customer ID. Email is never an identity fallback. It retrieves authoritative
Stripe subscription state rather than guessing a status from checkout or invoice state.

Upsert on the schema's unique `user_id` writes only existing columns: user/customer/subscription
IDs, plan, status, period end, cancellation flag, created time, and updated time. Replaying an event
therefore converges on one row. There is no processed-event table, so this is safe state
idempotency—not perfect event idempotency or ordering protection. A future event ledger keyed by
Stripe event ID plus last-event timestamp/version should reject stale out-of-order delivery.

## Cancellation and payment failure

When `cancel_at_period_end=true` while Stripe remains `active` or `trialing`, access continues until
`current_period_end` and the UI displays the scheduled end. Immediate cancellation/deletion stores
Stripe's canceled state and becomes Free. `past_due` and `unpaid` are Free and show a payment-failed
notice. Invoice events retrieve and persist the subscription, allowing recovery after successful
payment. The Customer Portal is the supported place to cancel, update payment details, and inspect
billing; its customer ID comes exclusively from the authenticated user's subscription row.

## Capability limits

Free retains limited basic chat, translation, study, and content generation. Agents and document
analysis require Premium; Premium also receives larger server-enforced quotas. UI messaging and
CTAs are explanatory only—the `ai-chat` Edge Function performs the authoritative check and quota
enforcement.

## Manual configuration and deployment

Use values from one Stripe mode consistently (all test or all live); never commit their values.

1. Set Edge Function secrets `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY` (a recurring monthly Price
   ID for USD 12), `STRIPE_WEBHOOK_SECRET`, and `APP_URL` (the deployed public origin). Supabase also
   supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Deploy `create-checkout-session`, `create-portal-session`, `stripe-webhook`, and `ai-chat`.
3. Create the Stripe webhook endpoint
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, select the seven events above,
   and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Enable/configure Stripe Billing Customer Portal capabilities for cancellation, payment methods,
   and invoice history.
5. Keep webhook JWT verification disabled at the gateway (Stripe has no Supabase JWT); webhook
   authenticity is enforced with its Stripe signature. Keep JWT/session verification for checkout
   and portal functions.

## Safe test runbook

In Stripe test mode, test an authenticated checkout with a Stripe test card, verify `trialing` and
the seven-day period in Stripe and Supabase Table Editor (`public.subscriptions`), replay an event to
confirm no duplicate row, and try an invalid signature. Test checkout without a session, missing or
invalid configuration in an isolated deployment, and portal behavior with/without a stored
customer. From the portal schedule cancellation and confirm access remains through the period;
then use a Test Clock or Stripe test controls to reach cancellation. Use Stripe's decline/test
payment methods to observe `past_due`/`unpaid`, then repair payment and confirm recovery. Verify a
Free user is rejected for agents/document analysis and an active/trialing user succeeds within
quota. Also return from checkout before webhook delivery and confirm the UI waits/refetches rather
than granting access.

## Security and next steps

RLS remains responsible for browser reads; the service role is limited to the signed webhook.
Price and customer IDs supplied by the browser are ignored. API responses contain stable error
codes, not Stripe payloads, tokens, stack traces, or secret values. Before production, add the trial
and webhook event ledgers described above, restrict CORS to the production origin, add automated
Stripe fixture tests, monitor webhook failures, and configure Stripe retry/alerting procedures.
