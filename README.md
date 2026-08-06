# NEXORA

NEXORA is a TanStack Start workspace that combines an AI assistant, projects, productivity,
documents, content, study, finance, translation, notifications, search, and configurable agents.
Supabase provides authentication and persistence; Supabase Edge Functions isolate OpenAI and
Stripe secrets from the browser.

## Requirements

- Node.js 22 or Bun
- A Supabase project with this repository's existing schema, RLS policies, storage, and functions
- OpenAI and Stripe accounts for AI and paid-plan flows

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. To inspect the interface
without external providers, explicitly set `VITE_DEMO_MODE=true`; this mode is never an automatic
production fallback.

## Edge configuration

Set the non-`VITE_` values documented in `.env.example` with `supabase secrets set`, then deploy
`ai-chat`, `create-checkout-session`, `create-portal-session`, and `stripe-webhook`. Configure the
Stripe webhook to point to the deployed webhook function. Never expose the OpenAI key, Stripe
secret key, webhook secret, or Supabase service-role key as a `VITE_` variable.

## Quality checks

```bash
npm run check
git diff --check
```

`npm run check` runs lint, TypeScript validation, and the production build. See
[`docs/release-candidate.md`](docs/release-candidate.md) for release status and the final launch
checklist, and [`docs/phase-8-production-release.md`](docs/phase-8-production-release.md) for the
deployment, Stripe, OpenAI, rollback, and production acceptance runbooks.

## Deployment

The build output is produced by `npm run build`. Configure the browser variables in the hosting
provider and the private values only in Supabase Edge secrets. Apply the existing Supabase project
configuration before deploying the Edge Functions, verify the allowed application origin, then
follow the release order and smoke tests in the production runbook.
