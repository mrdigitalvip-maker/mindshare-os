# NEXORA 2.0 — product and technical redesign

## Initial audit

The checkout already had a production-oriented foundation: TanStack Router, React Query,
one browser Supabase client, user-scoped services, Google/email PKCE authentication, Stripe
Edge Functions, an authenticated shell, PWA assets, and server-mediated AI. The generated
Supabase types confirm persisted projects/tasks, study subjects/sessions, finance
accounts/transactions, documents, content, translations, agents/runs, notifications,
subscriptions, conversations, and messages.

The audit found that earlier product-completion work already delivered much of the requested
CRUD. The major release blocker was Assistant retention: there was no migration directory,
scheduled cleanup, audit record, retention test, or user-facing policy. Secondary issues were
decorative display typography in functional headings, old generic navigation groups, and no
self-service Assistant-history deletion.

## Functional matrix

| Area                 | Audit result                                                                         | NEXORA 2.0 disposition                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Auth/onboarding      | Functional; email, Google PKCE, reset and guarded onboarding                         | Contracts preserved; production form already has labels, feedback and legal links            |
| Shell/navigation     | Functional but grouped as Overview/Modules/System                                    | Regrouped as Principal, Work, Personal and Account; drawer and essential mobile nav retained |
| Dashboard            | Real service aggregates and working creation actions                                 | Preserved; no synthetic metrics added                                                        |
| Assistant            | Complete chat/history CRUD, lazy first-message persistence and responsive transcript | Preserved and paired with server retention and policy controls                               |
| Projects/tasks       | Real create/edit/delete, project association and computed progress                   | Preserved; progress remains completed tasks / total tasks                                    |
| Productivity         | CRUD, project association, due dates, priority and status views                      | Preserved                                                                                    |
| Studies              | Subjects, sessions/history and server AI actions                                     | Preserved; no fake timer introduced                                                          |
| Finance              | Account and transaction CRUD with real aggregates                                    | Preserved; no unpersisted goals introduced                                                   |
| Documents/content    | Open/edit/save/duplicate/delete and server AI actions                                | Preserved                                                                                    |
| Agents               | CRUD, activation, execution and persisted run history                                | Preserved; execution remains backend-gated                                                   |
| Translate            | Explicit execution, swap/copy/clear and persisted history                            | Preserved; no per-keystroke AI calls                                                         |
| Search/notifications | User-scoped multi-entity search and persisted notification actions                   | Preserved                                                                                    |
| Settings             | Profile and notification controls; history controls absent                           | Added authoritative policy, downgrade warning and explicit history deletion                  |

## Design system, typography and layout

NEXORA keeps its dark graphite surfaces and gold accent. Functional and display text now use
an Inter-first, system-safe sans-serif stack, with comfortable body line-height and tighter,
consistent heading line-height. Inputs use a 16px minimum on narrow screens to avoid mobile
browser zoom. The shared shell keeps a 64px contextual header, bounded content surfaces,
generous module spacing, clear borders, focus rings, reduced-motion handling, safe-area
padding, and touch-friendly controls.

Desktop navigation is organized into **Principal**, **Work**, **Personal**, and **Account**.
Mobile uses a compact header, a labeled drawer for the full information architecture, and only
five essential bottom destinations. Search remains globally available from the header rather
than being represented as a non-navigable fake page.

## Login and Dashboard

The existing release-grade auth flow was intentionally not rewritten. It maintains email sign
in/sign up, Google OAuth with PKCE callback, password recovery, persistent sessions, real
labels/autocomplete, keyboard handling, success/error states, and privacy/terms links.
Dashboard continues to derive its cards and activity from workspace services and subscription
data; its quick actions route to or open real creation flows.

## Assistant and history UX

`/assistant` starts empty and does not select the latest conversation. A database conversation
is created only when the first valid message reaches the secure Edge Function. Desktop history
is a searchable sidebar grouped by date; mobile history is a sheet. Rename/delete, Markdown,
tables, code copy, regenerate, retry, loading and typed backend errors remain available.

The chat uses a `100dvh`-derived contained layout, an independently scrolling transcript,
safe-area composer padding, conditional follow behavior, and a “latest message” affordance.
This avoids forcing a reader back to the bottom and prevents the Android keyboard from hiding
the composer.

## Free/Premium retention and downgrade

`public.subscriptions` is the sole authority. A user is protected from cleanup only when status
is `active` or `trialing`, `current_period_end` exists, and it is still in the future. Free,
missing-subscription, expired, and downgraded users are eligible for the 30-day window.

The security-definer cleanup function locks eligible conversations, verifies that neither the
conversation activity nor any message is recent, deletes related messages first, then deletes
the conversations. It records only timestamp and aggregate counts—never content or user data.
Execution is revoked from browser roles. A daily `pg_cron` job runs at 03:17 UTC, so cleanup
does not depend on opening the frontend. Settings states both policies, warns cancellation/
downgrade users that old data becomes permanently eligible, and offers an owner-scoped manual
history deletion. No other workspace table is touched.

## Module architecture

Routes render UI and call service methods rather than issuing Supabase queries. Services obtain
the authenticated user and add owner filters; React Query owns server state and targeted
invalidations. Demo data is gated by `VITE_DEMO_MODE=true`. AI, agent, translation, content,
study and document operations call the `ai-chat` Edge Function, where entitlement and resource
ownership are validated; model/provider secrets remain server-side.

## Responsive and accessibility audit

The shared shell and chat were reviewed for the requested phone, tablet and desktop classes:
single-column cards and sheets on phones, expanded grids at tablet widths, and bounded content
with persistent navigation on desktop. Global horizontal overflow is prevented, dialogs/sheets
are viewport-bound, safe areas are respected, and tables use local horizontal overflow where
unavoidable. Labels, semantic headings/sections, `aria-live`, `aria-busy`, named icon buttons,
focus-visible rings, keyboard actions, touch targets and reduced motion are retained.

## Migration, RLS and security

Migration `202608060001_assistant_history_retention.sql` is deliberately limited to retention:
two supporting indexes, a write-only audit table with RLS/no browser grants, a privileged
cleanup function with a fixed search path, and one scheduled job. It preserves all existing
records on application; records are evaluated only on scheduled execution. The function is
idempotent and concurrent runs use row locks with `skip locked` to prevent duplicate work.

Rollback, if required before release, is: unschedule `nexora-ai-history-retention`, drop
`public.purge_expired_ai_history(integer)`, drop the two retention indexes, and drop
`public.ai_history_retention_runs`. Do not remove `pg_cron` if other project jobs use it.

## Tests and release limitations

The pgTAP test covers Free at 29/31 days, active Premium, trialing Premium, expired Premium,
no subscription, message deletion, and cross-user isolation. Static checks cover formatting,
lint, TypeScript and production bundling.

Browser flows requiring Google, Stripe, OpenAI, Web Push credentials or a deployed Supabase
project cannot be truthfully completed in an isolated checkout. The SQL migration and pgTAP
suite must be applied with Supabase CLI against a disposable linked/local database before
production rollout. Scheduled-job health should then be monitored through aggregate retention
run records. Future work should add Playwright device coverage and CI-backed screen-reader,
OAuth, billing and persistence smoke tests.
