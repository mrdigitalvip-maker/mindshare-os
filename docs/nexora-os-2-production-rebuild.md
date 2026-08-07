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

The repository statement names package `app.vercel.nexora_os_eosin.twa` and records fingerprint `24:11:49:B1:2D:2C:07:5A:E9:00:D8:36:A9:BB:5F:7F:BA:9F:F9:43:71:28:21:70:13:B5:BA:01:96:CD:BF:CD`. Its syntax is valid, but the repository alone cannot prove that it is the Google Play App Signing certificate. Compare it with **Play Console → App integrity / Integridade do app → App signing key certificate → SHA-256** before release. The manifest uses `start_url: /dashboard`, scope `/` and standalone display. `minimal-ui` and `window-controls-overlay` were removed from display fallbacks because they can deliberately expose browser/window chrome; standalone is now the primary supported mode.

Repository inspection alone cannot establish the deployed response. Release validation must run:

```bash
curl -i https://nexora.app/.well-known/assetlinks.json
curl -i https://nexora.app/manifest.webmanifest
```

The asset statement must return `200`, `Content-Type: application/json`, no redirect, and the exact package/fingerprint. The Android wrapper origin, manifest origin, OAuth production origin and Play listing must agree. Then verify with the Google Digital Asset Links API and Android `adb shell pm get-app-links <package>`.

No Android/Gradle/Bubblewrap/PWABuilder project is present in this repository, so its installed `defaultUrl`, host, intent filter, fallback, and signing identity cannot be audited here. If deployed files verify but browser chrome persists, inspect the existing published wrapper for a stale/different origin and verify the delivered certificate. A future wrapper update must retain the unchanged package ID and Play App Signing configuration; do not alter the fingerprint merely to silence verification.

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

## PHASE 1 FUNCTIONAL DELIVERY

### Assistant

- `/assistant` now starts with an unpersisted blank conversation. Existing conversations are only loaded after explicit history selection.
- Desktop history and mobile drawer support search, date groups, rename, and delete. The composer supports auto-growth, keyboard shortcuts, safe-area spacing, retry/regenerate/copy, and proximity-aware scroll following.
- The existing `AIService`/`ai-chat` backend remains responsible for OpenAI calls, quotas, persistence, timeouts, and safe errors; no simulated streaming was introduced.

### Projects and tasks

- Project creation is a four-stage wizard for identity, planning fields, initial tasks, and review. Creation navigates directly to `/projects/$projectId`.
- The project workspace provides Overview, Tasks, Notes, Documents, and Activity tabs, plus editing, confirmed deletion, and task CRUD.
- `TaskService` is the shared task repository. Project progress is always completed associated tasks divided by all associated tasks, with zero for an empty project.

### Productivity

- Productivity uses the same `TaskService` as Projects and provides Inbox, Today, Upcoming, Overdue, and Completed views, search, task detail editing, completion/reopening, and deletion.

### Agents

- The Premium-only four-step builder captures goal, behavior, expected output, and only the supported capabilities. Provider, model, API keys, and system instructions are not user-configurable.
- `/agents/$agentId` provides Overview, Run, History, and Settings. Runs expose loading, result, safe failure, and retry behavior.
- `agent-run` authenticates the request, verifies an unexpired `active` or `trialing` row in `public.subscriptions`, owner-scopes the agent, builds the system prompt server-side, calls OpenAI with a server secret, and persists completion or a safe error.

### Database, mobile, and limitations

- Migration `202608070001_phase1_functional.sql` adds only required project planning fields, agent behavior fields, owner-scoped `agent_runs`, constraints, indexes, timestamps, and RLS.
- Responsive layouts use bounded, scrollable dialogs/tabs and `min-width: 0`; the Assistant retains its `100dvh`, VisualViewport, safe-area, and Android keyboard handling.
- Notes, Documents, and Activity project tabs are intentionally honest empty states until those existing resources receive a project relationship. Applying migrations and exercising authenticated Free/Premium OpenAI runs requires a configured Supabase project and server secrets.

## PHASE 2 FUNCTIONAL DELIVERY

### Targeted audit matrix

| Module    | Current state                      | Missing flow found                               | Schema support                                   | Required migration        | Implementation                                                          |
| --------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------- |
| Documents | Metadata dialog and list           | Open/editable content workspace                  | `documents.title/content/type/updated_at`        | None                      | Owner-scoped workspace, save, duplicate, delete, search and AI analysis |
| Files     | Owner-scoped standalone rows       | No document/file relationship or verified bucket | No relationship                                  | None; unsafe to speculate | Attachments explicitly unavailable; no simulated upload                 |
| Content   | Draft rows in `documents`          | Creation brief, editor and AI actions            | Draft title/content via documents                | None                      | Creation wizard, draft workspace and confirmed AI replacement           |
| Studies   | Subject cards and sessions service | Subject workspace and manual session UI          | Name/color and duration/completed/date           | None                      | Overview, sessions, history and AI tools                                |
| Finance   | Account and transaction CRUD       | Openable account context                         | Existing account/transaction fields and category | None                      | Persisted summaries, account workspace, filters and CRUD                |

### Delivery notes

- **Documents and Document AI:** document content remains owner-scoped through `DocumentService`; AI receives only the selected owner-scoped document id. Physical-file analysis is not presented as supported.
- **Content:** content generation uses the deployed `content_generation` action. Generated text never replaces editor text without confirmation and only persists on Save.
- **Studies:** progress is derived only from real recorded sessions. No timer, objective, topic, or notes fields were invented.
- **Finance:** balance, income, and expenses are derived from persisted transactions. Finance insights remain disabled.
- **Migrations and RLS:** no migration was necessary. Existing user filters and deployed RLS remain the ownership boundary; service methods also scope reads and writes by authenticated user.
- **Mobile:** toolbars scroll horizontally, dialogs cap viewport height, editors use bounded reading widths, and responsive grids collapse to one column.
- **Limitations:** attachments remain unavailable because `files` has neither a `document_id` relationship nor a verified Storage contract. Study session date is the persisted creation timestamp. AI responses are intentionally not persisted without an explicit contract.
- **Validation:** lint, typecheck, production build, aggregate check, and whitespace validation are run as release checks.

## PHASE 3 ENGAGEMENT DELIVERY

Phase 3 adds the persisted Studio catalog and owner-scoped learning state, timezone-aware atomic lesson completion, daily goals, streaks, XP and six bounded achievements. It adds Language Lab onboarding for four languages, AI Academy, Creator Growth and a direct Content Studio handoff. Dashboard navigation and global search include Studio.

Web Push now has owner-scoped subscription/preferences/dedupe schema, explicit opt-in registration, same-origin click handling, VAPID delivery and a conservative server-side scheduled reminder coordinator. AI usage has an idempotent prompt-free ledger and real Settings meters, with subscription eligibility sourced only from active, unexpired `public.subscriptions` rows. See `nexora-studio.md`, `push-notifications.md`, and `ai-usage-and-entitlements.md` for deployment requirements and stated limitations.

## FINAL STUDIES / STUDIO / TWA POLISH

### Studies root cause and correction

The failure was a data-source mismatch combined with unhandled query states. `listPlans()` returned local demo plans in demo mode, but opening one called `getSubject()` and `listSubjectSessions()` through authenticated Supabase reads. In deployed fallback/demo conditions that could reject while the route treated every missing `data` value as “not found”; session query failures were also allowed to flow into an incomplete workspace. Study query keys were global rather than user-scoped, allowing cached results to cross a session transition.

Studies now uses the authenticated user in every React Query key and enables reads only after the auth session exists. Demo plan detail and session reads stay on the same demo source. Production subject detail uses an owner-scoped `maybeSingle()` query, so an absent/deleted subject is a controlled null rather than an exception. Loading, subject-not-found, subject-network-error, sessions-error and retry states are distinct. Cards, progress, empty/loading states, controls and mobile spacing were refined without importing the Studio visual language. No schema or migration changed.

### Studio visual and data rules

Studio 2.0 has a dedicated spectral design system and separate track palettes, while retaining every persistence and entitlement path. Home recommendations, rings, category percentages and weekly minutes are computed exclusively from returned tracks, lessons, enrollment, progress and daily-goal rows. Missing activity produces an honest empty state. CSS-only visuals, reduced-motion fallbacks and responsive single-column layouts avoid a new runtime dependency and large decorative assets.

### TWA diagnosis and next Android release action

The repository web half is internally consistent: `/dashboard` is inside root scope, `display` is `standalone`, browser-like display overrides are forbidden, and Digital Asset Links declares `app.vercel.nexora_os_eosin.twa`. There is no Android wrapper, keystore, AAB, Play certificate evidence or Bubblewrap configuration in this repository. Therefore browser chrome on a Play-installed build is not fixable with CSS or by changing this web manifest: it means the installed wrapper did not verify its exact launch origin against Digital Asset Links (most commonly an old/default wrapper origin or an upload-key fingerprint used instead of Play App Signing).

Before producing the next AAB, inspect the existing wrapper without changing its package ID or key: set `defaultUrl`/launch URL to `https://nexora.app/dashboard`, set the verified host and `android:autoVerify` intent filter to exactly `nexora.app`, and remove any initial redirect through a Vercel, Lovable, or `www` origin. In Play Console → App integrity, copy the **App signing key certificate** SHA-256 (not the upload certificate), compare it byte-for-byte with `public/.well-known/assetlinks.json`, deploy if correction is necessary, and confirm both public endpoints return HTTP 200 directly with no redirect/challenge and JSON content type. Then validate the relationship with Google's Digital Asset Links API and `adb shell pm get-app-links app.vercel.nexora_os_eosin.twa`; clear/update the installed internal-test build only after verification succeeds. OAuth Site URL and callback allow-list must use the same canonical origin. No AAB, package ID, keystore or signing key was changed here.

The current environment could validate repository files but its outbound proxy returned HTTP 403 before reaching `nexora.app`; deployed response headers, redirects, Play certificate ownership and a real-device TWA launch remain explicit external release checks.
