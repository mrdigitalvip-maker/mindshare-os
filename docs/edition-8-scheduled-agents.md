# KIVRYN Edition 8 — Scheduled Agents

Edition 8 extends the existing Agents, agent_runs and Notifications architecture with real server-side scheduled briefings.

## Scope

- daily or weekly schedules with IANA timezone support
- one global server scheduler; no per-user cron and no client polling
- shared executor for manual and scheduled Agent runs
- persisted run status and scheduled occurrence idempotency
- server-side Premium/internal entitlement authority
- in-app result notification and push outside quiet hours
- Web schedule management inside Agents
- Android schedule management inside the existing More surface
- Android Agent result push routing to the Agents screen

## Safety

- owner-scoped schedule configuration
- private next-run helper
- service-role-only due-run claiming
- strict schedule coherence constraints
- scheduled occurrence unique index
- server-side authentication and authorization
- no workspace tool access is claimed in this edition
- no AAB is created by this edition

## Validation gates

Pull request CI must pass Web Quality and Mobile Typecheck before merge. Production Supabase migrations and Edge Functions are deployed independently and verified ACTIVE. Main merge triggers the normal Vercel production deployment, which must be monitored before the edition is considered complete.
