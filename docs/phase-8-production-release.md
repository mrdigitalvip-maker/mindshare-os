# Phase 8 — Production release, deploy, and validation

This is the release runbook for NEXORA. It records code-verified facts and separates them from
external steps that **must be performed manually**. Never paste real secret values into Git,
support tickets, screenshots, logs, or browser variables.

## 1. Production architecture and audit

The TanStack Start application builds with Vite/Nitro and is hosted on Vercel. The browser uses
only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to authenticate and call Supabase. Supabase
Edge Functions authenticate the bearer token, determine the user and subscription server-side,
and call OpenAI or Stripe. Stripe calls the webhook directly; the webhook verifies the raw-body
signature before using the service-role key to update `subscriptions`.

### Audit classification

| Classification               | Result                                                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ready in code                | Supabase client session persistence; server-derived user and plan; hosted Stripe Checkout and Portal; signed webhook; configurable AI limits/models/timeout; PWA manifest, icon, metadata routes; production build configuration; restricted browser origins and no-store function responses. |
| External configuration       | Supabase/Vercel projects, DNS and production branch; auth redirect allow-list and email templates; every secret below; Stripe live product/Price/webhook/Portal; OpenAI billing, model access and budgets.                                                                                    |
| Code completed in this phase | Shared origin validation, preflight and JSON responses; removal of wildcard CORS from browser-callable functions; environment checklist and this runbook.                                                                                                                                     |
| Release blockers             | Missing/incorrect secrets; `APP_URL` not matching the final origin exactly; absent Stripe webhook or wrong mode/secret/Price; Supabase auth redirects/RLS not validated; failed build/lint/type checks; manual E2E not completed.                                                             |
| Later improvements           | Dedicated synthetic health endpoint, persisted idempotency/usage ledger, alert automation, richer PWA screenshots and an intentional offline application shell.                                                                                                                               |

Redirects are generated from the single validated `APP_URL`: Checkout returns to
`/premium?checkout=success` or `/premium?checkout=cancelled`, and Portal returns to `/premium`.
Add the final domain and required auth callback/reset URLs to Supabase Auth's URL Configuration.
Preview deployments require a deliberately separate configuration/project or will be rejected by
CORS; do not weaken production `APP_URL` to accommodate previews.

## 2. Environment and secret checklist

### Vercel (browser-visible; Production and intentionally configured Preview scopes)

- [ ] `VITE_SUPABASE_URL` — project URL.
- [ ] `VITE_SUPABASE_ANON_KEY` — publishable anon key; RLS remains mandatory.
- [ ] `VITE_DEMO_MODE=false` — prevents intentional demo fallback in a live release.

No OpenAI key, Stripe secret/webhook secret, service-role key, model, plan, Price ID, or backend
limit belongs in Vercel for the current architecture. `APP_URL` is an Edge Function secret, not a
frontend variable.

### Supabase Edge secrets/config

- [ ] `APP_URL` (one exact `https://` origin; an explicit localhost URL is allowed only in a local
      environment)
- [ ] `OPENAI_API_KEY`, `OPENAI_FREE_MODEL`, `OPENAI_PREMIUM_MODEL`
- [ ] `FREE_DAILY_MESSAGE_LIMIT`, `PREMIUM_DAILY_MESSAGE_LIMIT`
- [ ] `FREE_MAX_INPUT_CHARS`, `PREMIUM_MAX_INPUT_CHARS`
- [ ] `FREE_MAX_OUTPUT_TOKENS`, `PREMIUM_MAX_OUTPUT_TOKENS`, `OPENAI_TIMEOUT_MS`
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PUBLISHABLE_KEY` (checklist/reserved; hosted Checkout currently does not consume it)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY` (normally injected by Supabase)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (backend-only and required by `stripe-webhook`; normally injected)

The AI function also currently supports `FREE_CONTEXT_MESSAGES`, `PREMIUM_CONTEXT_MESSAGES`,
`FREE_CONTEXT_CHARS`, and `PREMIUM_CONTEXT_CHARS`. Keep them at documented defaults unless a
capacity decision approves a change. `TRIAL_DAYS` is reserved: Checkout deliberately enforces the
existing 7-day trial in code and the monthly product remains **US$12**; this release must not alter
price or trial behavior.

## 3. Exact release order and commands

1. Create/verify the production Supabase, Stripe, OpenAI, and Vercel resources.
2. Configure auth URLs, DNS, Stripe Product/Price/Portal/webhook, OpenAI budget and model access.
3. Copy `.env.example` to an ignored local file and provide placeholders locally; set real values
   only in each provider's encrypted environment UI/CLI.
4. Run local gates:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

5. Link and inspect Supabase (these commands require operator credentials and are not CI smoke
   tests):

```bash
supabase login
supabase link --project-ref qoxtwbhpovkxfiambwgz
supabase secrets list
supabase functions deploy ai-chat
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
supabase functions list
```

Set secrets through the Supabase dashboard or an operator-only input file/interactive shell; avoid
putting secret values in shell history. Deploy the webhook with JWT verification disabled in its
Supabase function configuration because Stripe cannot provide a Supabase JWT; signature
verification remains mandatory. Browser functions retain their JWT/authentication behavior.

6. Deploy the tested commit to a Vercel preview, run the non-destructive checklist, promote/deploy
   the same commit to Production, then run the production checklist. Do not deploy a different
   untested working tree.
7. Enable alerts and monitor the launch window. Record deployment IDs, commit, UTC time, operator,
   Stripe mode, and a redacted checklist result.

## 4. CORS and HTTP behavior

`_shared/http.ts` parses `APP_URL` and echoes `Access-Control-Allow-Origin` only for that exact
origin. Browser requests from any other origin receive `403 origin_not_allowed`; `OPTIONS` returns
consistent preflight headers and `204` only when allowed. Requests without `Origin` remain valid
for non-browser/server callers. JSON is `no-store` and responses vary on `Origin`.

This applies to `ai-chat`, `create-checkout-session`, and `create-portal-session`. The Stripe
webhook intentionally has no CORS dependency because Stripe calls it server-to-server. To develop
locally, set `APP_URL=http://localhost:<port>` in the **local** Edge Functions environment rather
than adding a wildcard or a hard-coded allow-list.

## 5. Stripe production setup

Keep test and live objects/keys strictly paired. In the selected mode:

- [ ] Verify the recurring monthly Product is **US$12** and copy its `price_...` identifier to
      `STRIPE_PRICE_MONTHLY`; do not create/change pricing as part of this runbook.
- [ ] Confirm Checkout applies a 7-day trial only for an eligible first subscription.
- [ ] Enable Customer Portal payment-method updates, cancellation policy, invoice history, and the
      intended subscription-management behavior.
- [ ] Create endpoint
      `https://qoxtwbhpovkxfiambwgz.supabase.co/functions/v1/stripe-webhook`.
- [ ] Subscribe exactly to `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, `customer.subscription.created`,
      `customer.subscription.updated`, `customer.subscription.deleted`,
      `invoice.payment_succeeded`, and `invoice.payment_failed`.
- [ ] Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET` for the same mode.
- [ ] In test mode, use Stripe's documented success, decline, authentication, and recurring-payment
      test cards; never use a real card or copy test card data into production records.
- [ ] Exercise completed/cancelled Checkout, trialing, cancellation at period end, failed invoice,
      updated card and recovery; inspect event delivery/retries and confirm the matching
      `subscriptions` row (`status`, IDs, period end, cancel flag).
- [ ] Resend one event and confirm the upsert produces the same final subscription state.

## 6. OpenAI production setup

- [ ] Create a project-scoped server key, store only as `OPENAI_API_KEY` in Supabase, restrict
      operator access, and record owner/rotation date outside Git.
- [ ] Set budget/usage alerts and account/project rate limits appropriate to the approved launch
      capacity. Review current pricing in the official console before approving spend; this
      document intentionally freezes no model pricing.
- [ ] Set configurable Free/Premium model identifiers, verify the project can access both, and test
      each plan. The client cannot choose a model.
- [ ] Validate `OPENAI_TIMEOUT_MS`, response limits and daily limits in a staging configuration.
- [ ] Confirm real success, provider 429, timeout, exhausted quota/billing, and provider 5xx produce
      a safe user-facing failure without granting access or losing tenant isolation.
- [ ] Rotate by creating a new key, updating the Edge secret, deploying/testing, then revoking the
      old key. Never expose it through `VITE_*`, source, responses, or logs.

## 7. Vercel, PWA, and release surface

In Vercel verify the correct repository and production branch, TanStack/Vite framework detection,
`npm run build`, and the platform-detected Nitro output (do not guess or hard-code an output folder
without inspecting the build). Confirm Production/Preview variable scopes, final domain/HTTPS,
deployment health, server route handling, `/robots.txt`, `/sitemap.xml`, deep-link reloads, and auth
redirects. Backend-only Supabase Edge secrets are not required in Vercel.

PWA audit: the manifest provides standalone display, start URL, colors, shortcuts, and 512px normal
and maskable icons. Verify installability and icon mask on Android/desktop, splash/background/theme
color, favicon and page metadata on real devices. There is no dedicated offline service worker or
manifest screenshots in the current tree: offline must fail gracefully and must **not** be marketed
as supported until deliberately implemented and tested. `robots.txt` allows crawling; verify the
production sitemap contains only canonical public URLs before indexing.

## 8. Manual end-to-end acceptance checklist

Record evidence without message bodies, tokens, card data, or secrets.

### Authentication

- [ ] Sign up; receive and follow email confirmation; log in and log out.
- [ ] Request password recovery, use its redirect, change password, and log in again.
- [ ] Expire/revoke a session and confirm protected UI/functions require sign-in without looping.

### Free

- [ ] Send a basic chat and reload to confirm history.
- [ ] Reach the daily chat limit and limited translation behavior without bypass after reload.
- [ ] Attempt agent and document analysis and receive Premium gating plus a functional Premium CTA.

### Premium trialing and active

- [ ] Start Checkout, complete it, observe 7-day trial and `trialing`, Premium access, and a valid
      `current_period_end` in `subscriptions`.
- [ ] With an `active` fixture/subscription, verify complete chat, agents, documents, translation,
      content and studies access; verify a Free user still cannot access these capabilities.

### Stripe lifecycle

- [ ] Complete and separately cancel Checkout; confirm no query string alone grants Premium.
- [ ] Open Portal, update test card, set `cancel_at_period_end`, return to app and confirm state.
- [ ] Trigger failed payment, recovery/payment success, immediate/deferred cancellation as intended.
- [ ] Resend a webhook event and confirm duplicate delivery is safe and acknowledged.

### OpenAI resilience

- [ ] Obtain a real response for each configured model/plan.
- [ ] In controlled staging, test timeout, rate limit, exhausted quota and unavailable provider;
      verify mapped status/message and absence of sensitive logs.

### Persistence and isolation

- [ ] Create chat history, translations, agent runs and documents; reload and verify persistence.
- [ ] Confirm `subscriptions` transitions and period/cancel fields match Stripe.
- [ ] With two test users, verify neither can read/change the other's conversations, messages,
      translations, agents/runs, documents, or subscription through UI or direct API calls.

## 9. Health checks and observability

Use an authenticated synthetic test user for browser functions. A `401` from an unauthenticated
POST proves routing but not dependency health; an allowed-origin `OPTIONS` `204` proves only CORS.

```bash
curl -i -X OPTIONS 'https://qoxtwbhpovkxfiambwgz.supabase.co/functions/v1/ai-chat' \
  -H 'Origin: https://YOUR_FINAL_DOMAIN' \
  -H 'Access-Control-Request-Method: POST'
curl -sS -o /dev/null -w 'status=%{http_code} total=%{time_total}\n' \
  -X POST 'https://qoxtwbhpovkxfiambwgz.supabase.co/functions/v1/ai-chat'
```

Do not send a fake request to the webhook as a health check: it must return a signature error.
Use Stripe Dashboard webhook delivery health instead. Monitor:

- Supabase Dashboard → Edge Functions logs/metrics for status, latency, deployment and safe error
  codes; Database logs/table queries for persistence and unexpected subscription transitions.
- Stripe Dashboard → Developers/Workbench events and webhook attempts for signature failures,
  retries, latency, invoice failures and recovery.
- OpenAI project usage/limits for requests, spend, 429s and provider availability.
- Vercel deployment/runtime logs and Analytics/Speed Insights if enabled for build, SSR, status and
  latency; add an external HTTPS uptime check for the canonical domain.

Alert on elevated 5xx/429/latency, webhook retries, failed invoices, persistence errors, unusual AI
spend, and failed Vercel deployments. Logs may include request/event IDs, operation, status,
duration, and coarse error code. Never log authorization tokens, keys, full prompts/messages,
Stripe signatures, raw webhook/customer/payment payloads, or document contents.

## 10. Security release review

- [ ] Search source and built assets for private keys/secrets; rotate immediately if any real value
      ever entered Git, even if later removed.
- [ ] Confirm service role occurs only in backend webhook code/docs/config and all user tables retain
      reviewed RLS.
- [ ] Confirm checkout/portal derive authenticated user and stored customer server-side; AI derives
      plan/model/user server-side. Do not trust client `user_id`, customer, plan, model, or Premium
      query strings.
- [ ] Confirm no wildcard CORS, sensitive logging, automatic production demo/mock fallback, or
      cacheable personalized Edge response.
- [ ] Confirm Stripe signature verification uses the raw request body and secrets/modes match.

## 11. Rollback

Stop and preserve evidence first; do not delete production data, migrations, subscriptions, or
customers. Back up affected records before any corrective data operation.

- **Vercel:** use Deployments to promote/redeploy the last known-good immutable deployment; verify
  domain assignment and smoke tests. Keep the bad deployment for diagnosis.
- **Edge Function:** check out the last known-good commit in a clean worktree and redeploy only the
  affected function. Record both deployment versions; never rewrite shared Git history.
- **Commit:** create a new `git revert <bad-commit>` commit, test it, push normally, and deploy it;
  never force-push/rebase published Lovable history.
- **Webhook:** roll endpoint/secret/configuration back in the same Stripe mode. If rotating the
  signing secret, update Supabase atomically and verify a test delivery; do not disable signature
  verification. Re-deliver missed events after recovery.
- **Secret:** restore the previous known-good value from the approved secret manager or rotate to a
  new value, redeploy if necessary, test, then revoke compromised/incorrect credentials.
- **OpenAI model:** restore the prior model identifier in the Edge secret and test both tiers; keep
  limits conservative during recovery.
- **Price ID:** restore the prior approved live/test `price_...` in `STRIPE_PRICE_MONTHLY`; verify
  amount/currency/recurrence before reopening Checkout. Existing subscriptions remain attached to
  their original Price and must not be mass-modified.
- **Customer Portal:** restore the prior saved Portal configuration/policy in the correct Stripe
  mode and test with a non-production customer before enabling access.

## 12. Go/no-go and manual blockers

**No-go** if any automated gate fails, secrets/modes/origins do not match, webhook delivery or
subscription persistence fails, tenant isolation is unproven, provider budgets are absent, auth
redirects fail, or the full manual checklist lacks an accountable sign-off. These external facts
cannot be validated from a credential-free checkout. Go only after Security/Product/Operations
record approval, the exact commit/deploy IDs, backup/rollback owner, support channel, launch window,
and monitoring owner. Do not merge automatically as part of this phase.
