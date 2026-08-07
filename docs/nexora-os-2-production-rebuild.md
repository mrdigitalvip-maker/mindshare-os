# NEXORA OS 2.0 — production rebuild audit

## Status and scope

This document is the required **pre-implementation audit**. It deliberately distinguishes shipped contracts from proposed work. A route or attractive card is not treated as a completed feature. The repository currently contains a useful functional baseline, but it does **not** yet satisfy the complete NEXORA OS 2.0 acceptance criteria.

## Architecture inventory

- **Client:** Vite, React, TanStack Router, TanStack Query, Tailwind CSS and shadcn-style primitives.
- **Authentication:** Supabase Auth with a central auth context. The protected shell validates both the real session and onboarding state.
- **Data access:** route components generally orchestrate React Query and call `src/services`; production service methods scope reads and writes to the authenticated user.
- **AI:** privileged calls go through Supabase Edge Functions. `ai-chat` performs server-side subscription and usage checks before invoking the configured provider.
- **Billing:** checkout, customer portal and webhook Edge Functions exist. `public.subscriptions` is the intended entitlement source.
- **PWA/TWA:** a standalone web manifest, service worker, icons and Digital Asset Links statement are present.
- **Database source of truth:** generated Supabase types describe a broader remote schema than the migrations committed to this repository. Only assistant-retention migration and SQL test are currently reproducible locally. This drift must be resolved before adding broad migrations.

## Functional matrix

| Module                                              | Current state              | What works                                                                                 | Shallow / broken                                                                                                | Missing                                                                   | Schema support                                                                                  | Backend support                                                          | Production solution                                                                                                                                   |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assistant                                           | Functional baseline        | New-chat state, conversation persistence after send, history operations and server AI call | Modern grouped history, robust viewport/scroll behaviors and richer message actions need full device validation | Backend cancellation/streaming is absent; do not show fake Stop/streaming | Conversations/messages exist; retention migration exists                                        | `ai-chat` and retention enforcement exist                                | Keep lazy conversation creation; add measured scroll state, markdown/code-copy tests and only expose cancellation after a cancellable server contract |
| Projects                                            | CRUD list                  | Create/edit/delete and progress derived from task completion                               | Creation is one dialog and cards do not open a project workspace                                                | Wizard, objective/planning fields, detail tabs, notes/documents/activity  | Projects/tasks exist; requested planning/activity fields are not proven in committed migrations | Client service only                                                      | First reconcile schema; then add minimal project fields/activity migration, detail route and atomic wizard creation                                   |
| Productivity                                        | CRUD baseline              | Persisted task creation, update, completion and deletion                                   | View/query UX remains limited                                                                                   | Inbox/Today/Upcoming/Overdue/Completed, task detail, filters/sort/search  | Task fields and project relation exist in generated types                                       | Client service                                                           | Add deterministic date filters and detail drawer using existing service boundary                                                                      |
| Documents                                           | Functional editor baseline | Persisted CRUD, editor workflows and file/note support are represented                     | Autosave and AI analysis require contract/device verification                                                   | Premium document-analysis function is not present                         | Documents/files/notes exist in generated types                                                  | No dedicated analysis function found                                     | Keep basic editor; implement analysis only after server entitlement contract exists                                                                   |
| Content                                             | Functional baseline        | Draft persistence and generation service paths exist                                       | Editorial workflow and non-destructive transformations need deeper coverage                                     | Full Drafts/Create/Templates workflow                                     | Content tables exist in generated types                                                         | AI service contract exists but supported operations require verification | Save every result as a new draft; whitelist server-supported formats/actions                                                                          |
| Studies                                             | Functional baseline        | Subjects and sessions are persisted through services                                       | Workspace, targets and AI tools are not complete                                                                | Overview/Sessions/AI Tools/History depth                                  | Subjects/sessions exist                                                                         | General AI service only                                                  | Add workspace routes using existing fields; add fields only after schema reconciliation                                                               |
| Finance                                             | Functional baseline        | Account and transaction CRUD; calculated totals                                            | Needs stronger filtering and validation                                                                         | No safe finance-insights contract                                         | Accounts/transactions exist                                                                     | No finance insight function                                              | Keep insights disabled; never provide investment advice                                                                                               |
| Translate                                           | Functional baseline        | Explicit translation action and persisted history                                          | Usage presentation and richer history controls need work                                                        | Verified server-side per-plan limits                                      | Translations exist                                                                              | AI service path exists; enforcement needs contract audit                 | Add a dedicated server function/ledger before claiming daily entitlement limits                                                                       |
| Agents                                              | Partial product            | Agent CRUD/run/history are represented                                                     | Builder fields are compressed into existing schema and UX remains shallow                                       | Proven backend premium rejection and controlled error field               | Agents/runs exist                                                                               | No committed `agent_run` Edge Function found                             | Keep gated/disabled until an Edge Function enforces subscription and owns provider/model selection                                                    |
| Dashboard                                           | Aggregated baseline        | Query hooks aggregate persisted workspace data                                             | Does not yet expose every requested control-center metric                                                       | Studio, real usage ledger and richer Today/AI metrics                     | Partial                                                                                         | Partial                                                                  | Add only metrics backed by queries; never manufacture usage                                                                                           |
| Search                                              | Functional baseline        | Global search service/component and grouped UI exist                                       | Not all requested entities/deep links are verified                                                              | Studio and comprehensive conversation search                              | Partial                                                                                         | Client-side service                                                      | Add entity adapters and route-safe deep links after each module exists                                                                                |
| Notifications                                       | In-app baseline            | Notification center/service and browser helper exist                                       | Not an end-to-end scheduled Web Push system                                                                     | Subscriptions/preferences schema, VAPID sender, scheduler, quiet hours    | Not present in committed migrations/types                                                       | No push sender found                                                     | Add owner-scoped migration, secure sender and scheduled invocation; private VAPID key stays server-only                                               |
| Studio / Language Lab / AI Academy / Creator Growth | Not implemented            | None in production                                                                         | Any current card would be decorative                                                                            | Entire persisted learning workflow                                        | Not present                                                                                     | Not present                                                              | Introduce only with tracks/lessons/progress schema, RLS tests and real completion service; do not ship a shell                                        |
| Settings / Premium                                  | Functional baseline        | Profile, subscription and settings services exist                                          | Requested sections and real per-feature usage meter are incomplete                                              | Notification preferences, timezone, deletion/clear-history flows          | Partial                                                                                         | Billing functions exist                                                  | Read entitlement from valid subscription only; add destructive server operations with re-auth/audit safeguards                                        |

## Design and navigation

The dark graphite/gold design tokens already establish the NEXORA identity. Typography uses Inter/system fallbacks, controls avoid iOS zoom, and shared page shells constrain desktop width. Navigation now follows six explicit information-architecture groups: Main, Workspace, Growth, Intelligence, Money and Account. Mobile navigation is intentionally limited to Home, Assistant, Projects, Tasks and More; More opens the complete authenticated drawer and closes on navigation.

Remaining visual work must prefer rows, lists, tabs and detail panes over uniformly large cards. All observable UI strings need to move behind a small `pt-BR` / `en-US` catalog before the app can honestly claim language consistency. The current production UI is primarily English, so the manifest remains `en-US` rather than falsely declaring Portuguese.

## Mobile, tablet and desktop

- The shell and root now use dynamic viewport height and preserve bottom/top safe-area insets.
- The mobile bottom bar contains exactly five high-frequency actions.
- Required validation widths: 320, 360, 375, 390, 414, 768, 1024, 1280, 1440 and 1920 px.
- Keyboard correctness for Assistant still requires a real Android/VisualViewport run. Static compilation cannot prove that the IME never covers the composer.
- No browser automation or authenticated Supabase test environment is committed, so the full register-to-persisted-data E2E flow remains unverified.

## Free, Premium and usage

The entitlement rule must be centralized server-side: Premium is true only when a row in `public.subscriptions` has `status IN ('active', 'trialing')` and `current_period_end > now()`. `profiles.plan` must never authorize privileged work. The assistant function already follows a server-check pattern; equivalent enforcement is not proven for agents, translation, content, document analysis or future Studio coaching.

The requested usage meter requires a real, idempotent ledger keyed by user, feature and accounting day. Until that contract exists, the UI must not invent `X / limit`. Quantitative limits should come from server environment variables and server responses.

Downgrade affects Assistant retention only: after Premium ends, conversations older than 30 days become eligible for deletion under the Free policy. It must not delete project, task, document, finance, study, agent or preference data.

## Notifications and Push

Web Push is **blocked by missing backend contracts**, not by UI. Production implementation requires:

1. `push_subscriptions` and notification-preference tables with unique endpoint ownership, timestamps, indexes and owner-only RLS.
2. Explicit permission request from Settings; never prompt at first load.
3. Service-worker `push` and `notificationclick` handlers with validated same-origin navigation.
4. A protected Edge Function that reads the VAPID private key only from secrets, removes expired subscriptions and never accepts arbitrary user/HTML payloads from clients.
5. Supabase Scheduled Function or `pg_cron` invocation using user timezone/preferences and quiet-hour guards.
6. SQL tests proving cross-user subscriptions/preferences cannot be read or mutated.

## TWA and Digital Asset Links diagnosis

The repository statement matches package `app.vercel.nexora_os_eosin.twa` and fingerprint `24:11:49:B1:2D:2C:07:5A:E9:00:D8:36:A9:BB:5F:7F:BA:9F:F9:43:71:28:21:70:13:B5:BA:01:96:CD:BF:CD`. The manifest uses `start_url: /dashboard`, scope `/` and standalone display. `minimal-ui` and `window-controls-overlay` were removed from display fallbacks because they can deliberately expose browser/window chrome; standalone is now the primary supported mode.

Repository inspection alone cannot establish the deployed response. Release validation must run:

```bash
curl -i https://<production-origin>/.well-known/assetlinks.json
curl -i https://<production-origin>/manifest.webmanifest
```

The asset statement must return `200`, `Content-Type: application/json`, no redirect, and the exact package/fingerprint. The Android wrapper origin, manifest origin, OAuth production origin and Play listing must agree. Then verify with the Google Digital Asset Links API and Android `adb shell pm get-app-links <package>`.

If deployed files verify but browser chrome persists, the published wrapper is likely stale or targets a different origin. Generate and upload a new signed AAB using the unchanged package ID and Play App Signing configuration; do not alter the fingerprint merely to silence verification.

## Security and migration policy

Before new product migrations, export the live schema/policies and restore a local test database. Every new owner record must have non-null `user_id` referencing `auth.users`, owner-only RLS for select/insert/update/delete, appropriate unique/check constraints, and indexes beginning with `user_id`. Privileged AI, Stripe, Push and deletion operations remain in Edge Functions. Provider keys, service-role keys and VAPID private keys must never enter frontend bundles.

Each migration must include a companion rollback note and SQL tests for owner access, cross-owner denial and unauthenticated denial. The current repository cannot reproduce most tables described by generated types, which is the first migration risk to fix.

## Testing plan and current limitations

Static checks required for every increment are `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check` and `git diff --check`. Database acceptance additionally requires a linked/local Supabase environment, schema reset, SQL tests and explicit Free/Premium/downgrade fixtures. Web Push requires configured VAPID secrets and a supported browser. TWA chrome removal requires a deployed HTTPS origin and an installed Play-signed build.

Known limitations at this audit checkpoint:

- Studio and scheduled Web Push are not implemented and therefore are not presented as production features.
- The committed migration set is insufficient to recreate the schema represented by generated types.
- No `agent_run` Edge Function is committed, so Agents cannot be certified Premium-safe.
- Full authenticated E2E, real-device keyboard/layout testing, deployed Digital Asset Links headers and Play-signed TWA verification require external environments not present in the repository.
- Large portions of the UI remain English; a catalog-based localization pass is required before enabling `pt-BR`.

## Delivery sequence

1. Reconcile and test the live schema, RLS and subscription source.
2. Complete navigation/localization foundations and Assistant device behavior.
3. Add project workspace and task detail on verified existing schema.
4. Deepen documents, content, studies, finance and search without invented contracts.
5. Add server-enforced agents and per-feature usage ledger.
6. Add Studio schema/services/workspaces with RLS tests.
7. Add Push subscriptions/preferences/sender/scheduler and real-browser tests.
8. Run the complete E2E matrix, deployed TWA verification and Play AAB validation.

This sequence keeps every connected-branch commit runnable and prevents decorative modules or unenforced Premium claims from reaching production.
