# NEXORA — Functional recovery audit (Phase A)

Audit date: 2026-08-08 UTC  
Scope: repository/static integration audit after the requested Git recovery. No authenticated browser or production Supabase access was available, so this report deliberately does **not** claim runtime persistence or E2E success.

## 1. Git recovery record

The pre-change repository was on `work`, at merge `a41356d`, with a clean working tree. The requested commands (`status`, branch, 20-commit log, 20-entry reflog, diff and diff stat) showed no uncommitted implementation. Dated history identified the only implementation in the requested 30–45 minute window:

- `c021ea5` (`2026-08-08 16:40:26 -0300`) — “build LookSpace playable game foundation”;
- merged one minute later by `a41356d` (`2026-08-08 16:41:28 -0300`);
- it added seven `src/game/**` files and replaced much of `src/routes/index.tsx`, unrelated to the NEXORA functional recovery.

Because this was an isolated, published merge and the tree was clean, it was removed with the explicit, history-preserving command `git revert -m 1 --no-edit a41356d`. Revert commit `2cf69c8` removes only that merge. No reset, rebase, amendment, force push, or shared-history rewrite was used. The required post-revert `status`, `diff`, and ten-commit log showed a clean tree and the revert at `HEAD`.

## 2. Executive diagnosis

The application is not merely a static mock: Projects, Productivity, Assistant, Content, Documents, Finance, Agents, Studies, Notifications, Settings and Authentication contain real Supabase calls and many mutations invalidate relevant React Query caches. However, repository evidence cannot establish that the deployed database has the migrations and Edge Functions those clients require.

The dominant failure modes are:

1. **Deployment-contract uncertainty (P0):** this checkout has additive migrations, but no local Supabase config/link or baseline schema proving the live project state. Studies requires the latest workspace migration; Studio requires its Phase 3 tables and RPC; AI and billing require deployed functions and secrets.
2. **Global Search is fail-closed across unrelated modules (P1):** twelve queries run in one `Promise.all`, and any missing Studio table makes the entire search fail. Several result types stop at list pages rather than their exact object.
3. **Studio schema typing is bypassed (P1):** the service casts Supabase to `any` because generated database types do not contain the Phase 3 tables. This lets lint/typecheck/build pass while deployment drift remains a runtime risk.
4. **Studies is migration-sensitive (P0/P1):** its route reads four new relations in parallel. If `202608080001_studies_workspace.sql` is not applied, the reported runtime failure is expected. The code surfaces the query error, but the UI error is generic and creation discards the actual error message.
5. **Incomplete continuations (P1/P2):** Finance account detail is read-only; task and finance-transaction search results do not deep-link to an exact object; notifications cannot open related objects; Content/Document AI results require review but are not persisted as a revision history.
6. **Static success is not operational proof:** all requested static checks pass, but no authenticated CRUD/reload run was possible.

## 3. Module inventory and status

Status means repository-level confidence, not production certification.

| Module | Status | Real purpose and data path | Writes / invalidation / operational gaps | Priority |
|---|---|---|---|---|
| Dashboard | 🟡 PARTIAL | Reads real aggregate data through `useDashboardStats`: projects, tasks, studies, documents/content, conversations/activity and finance. | Mostly navigation. Recent projects deep-link correctly, but Today tasks open the Productivity list, recent activity is not clickable, and `Continue` uses raw anchors. No invented fallback values. | P2 |
| Projects | 🟡 PARTIAL | Reads/writes `projects` and `tasks` via `ProjectService`/`TaskService`. Create opens the new project; workspace supports edit/delete/complete and task CRUD/toggle. | Mutations invalidate project/task keys; AI plan uses project context, presents editable suggestions, then persists only after confirmation. Runtime/RLS/reload remain unverified; related-work continuation is limited. | P1 |
| Productivity | 🟡 PARTIAL | Daily task command center over `tasks`, with `projects` for assignment. | Quick create, full create/update, complete/reopen and delete persist and invalidate tasks/projects. Views are client classification. No exact task route; delete uses native `confirm`; authenticated persistence unverified. | P1 |
| Agents | 🟡 PARTIAL | CRUD over `agents`, history over `agent_runs`, execution through `agent-run`. | Create/edit/delete/run exist and run history is invalidated. Premium gates UI and Edge Function. No explicit deactivate control in the detail editor, and copying gives no feedback. Requires deployed function, schema migration, subscription data and OpenAI secret. | P1 |
| Studies | 🔴 BROKEN/UNVERIFIED | Subjects, sessions, goals and notes use `study_subjects`, `study_sessions`, `study_goals`, `study_notes`; AI uses `ai-chat`. | Create/open subject, record session, goal/note creation and some update/delete controls exist with base-key invalidation. Four-table dependency means one absent relation breaks the workspace. Actual error is hidden on subject creation. Migration deployment is the leading, not proven, cause of the runtime report. | P0 |
| Studio | 🟡 PARTIAL | Overview reads tracks, lessons, enrollments, progress, daily goals, streaks, achievements and activity. Workspaces enroll, start lessons and call `complete_studio_lesson`. | Main visible actions are wired. Runtime contract is deliberately `any`; generated types are stale. Premium lesson entitlement is UI-driven and must also be enforced by database/RPC policy. Missing Phase 3 migration breaks all Studio pages. | P1 |
| Language Lab | 🟡 PARTIAL | Category-specific `StudioWorkspace` using real Studio tables/RPC. | Enrollment and lesson completion persist; content is seeded curriculum, not an adaptive language backend. Runtime unverified. | P2 |
| AI Academy | 🟡 PARTIAL | Same shared Studio pipeline, category `academy`. | Real progress persistence, but exercises are fixed seeded lesson content; runtime and premium enforcement unverified. | P2 |
| Creator Growth | 🟡 PARTIAL | Same shared Studio pipeline, category `creator`. | Real progress persistence, but no connection to Content publishing results. Runtime unverified. | P2 |
| Assistant | 🟡 PARTIAL (strongest) | Conversations/messages use `ai_conversations`/`ai_messages` and `ai-chat`; history, rename/delete, resend and deep-link search param exist. | Save-as-Task and Save-as-Content present a preview before persistence and invalidate target caches. Requires deployed function/OpenAI/configured limits. No authenticated runtime verification in this audit. | P1 |
| Content | 🟡 PARTIAL | Drafts are stored in `documents` with draft semantics through `ContentService`. | Create/open/save/duplicate/delete are real. AI proposes a result for accept/reject instead of silently replacing content. No autosave/revision history; discarded AI output is not recoverable. | P2 |
| Documents | 🟡 PARTIAL | CRUD over `documents`; list also reads `files`/`notes` for legacy workspace counts; editor analysis uses `ai-chat`. | Create/open/save/duplicate/delete and explicit AI acceptance exist. Attachments are not fabricated in the editor. Exact persistence and legacy relation availability are unverified. | P2 |
| Translate | 🟡 PARTIAL | AI translation through `ai-chat`; history through `translations`. | Translate, retry, copy and history persistence are wired. History is not a navigable exact-resource workspace; depends on AI function and entitlement limits. | P2 |
| Finance | 🟡 PARTIAL | CRUD over `finance_accounts` and `finance_transactions`; computed summary derives from persisted transactions. | List page creates/edits/deletes both resources and invalidates finance keys. Account detail only reads account/transactions, so the user cannot continue editing there. No fake forecasts found. | P1 |
| Global Search | 🔴 BROKEN-PRONE | Queries projects, tasks, documents, notes, studies, agents, translations, conversations, finance and Studio. | A single missing relation rejects the whole search. Projects/documents/content/agents/studies/accounts/conversations can deep-link; tasks, notes, translations, finance transactions and Studio lessons stop at broader pages. | P1 |
| Notifications | 🟡 PARTIAL | Reads/updates/deletes `notifications`; invalidates notifications and Dashboard. | Mark one/all and delete work. Notification rows only mark read; they do not navigate to a related object. Error text omits diagnostic detail. | P2 |
| Premium | 🟡 PARTIAL | Reads subscription status; calls checkout/portal Edge Functions; Stripe webhook updates `subscriptions`. | Checkout/portal are real only when functions, prices, webhook and URLs are configured. UI entitlement is not sufficient by itself; AI functions/RPC must enforce it. | P1 |
| Settings | 🟡 PARTIAL | Profile/auth metadata, `user_preferences`, push preferences/subscriptions, assistant history, sign-out. | Save, history deletion, notification settings and sign-out are wired. Push requires browser support, HTTPS, service worker, VAPID and Edge Function deployment. No full account deletion flow was found. | P2 |
| Authentication | 🟡 PARTIAL | Supabase email/password, Google OAuth PKCE, callback, confirmation, reset and onboarding/profile/avatar storage. | Handlers are real and errors are surfaced. Correct Site URL/redirect allow-list, provider config, storage bucket/policies and email templates cannot be verified locally. | P0 if misconfigured |

## 4. Dead, misleading, or prematurely-ending actions

No broad set of empty handlers or console-only primary mutations was found. The important operational dead ends are instead:

- **Dashboard Today task:** navigates to `/productivity`, not the exact task; the user must find it again.
- **Dashboard recent activity:** rendered as a non-interactive row despite representing a resource.
- **Global Search task/note/translation/transaction/Studio lesson:** returns a broad module path rather than an exact object. Finance transaction results discard `account_id` for navigation.
- **Notification row:** clicking only marks it read; there is no resource target/deep link.
- **Finance account detail:** no edit/delete/add-transaction action, so it is a terminal read-only page.
- **Agent copy output:** clipboard promise is not awaited and gives no success/error feedback.
- **Agent deactivate:** service capability exists (`setActive`) but the expected detail-page lifecycle control is absent.
- **Content/Documents AI:** review is correctly explicit, but no persisted revision/audit trail supports returning to a rejected or previously accepted version.
- **Studio/Premium lesson:** visible lock/gating must not be treated as authorization; backend enforcement requires runtime verification.
- **Generic error masking:** Studies subject creation, Studio loading, notifications and several mutations replace useful PostgREST/RPC details with generic copy. Technical details should be safely logged while preserving actionable user context.

## 5. Frontend and cache findings

- Core CRUD routes generally use `useMutation`, disable pending submit controls, surface toast errors, and invalidate their module query keys.
- Projects and Productivity deliberately share task/project invalidations, so changes should converge after refetch.
- Some query keys are user-scoped and others are global arrays/string literals. Logout clears the query client in the shell, reducing but not eliminating the risk of inconsistent invalidation patterns.
- Search is over-coupled: public Studio content and owner-scoped workspace search are one atomic `Promise.all` rather than independently degradable result groups.
- The app uses explicit demo mode only. Missing credentials produce errors instead of silently simulating production success, which is correct; demo persistence is localStorage and must never be reported as Supabase verification.
- Static inspection found responsive primitives (`dvh`, wrapping, width-capped dialogs/popovers), but 320/360/375/390/414 px interaction, virtual keyboard, safe-area and horizontal overflow were not browser-tested.

## 6. Supabase, RLS, migrations, functions, and configuration

### Schema and RLS

- Generated types include the main workspace and Studies tables but **not** Studio Phase 3 tables. `studio-service.ts` and parts of search bypass typing with `any` until types are regenerated.
- `202608070001_phase1_functional.sql` adds project/agent fields, agent-run ownership/RLS and indexes. Projects/Agents depend on it.
- `202608070002_phase3_engagement.sql` creates Studio/usage/push tables, owner policies, curriculum seed data and `complete_studio_lesson`. Studio and parts of Search depend on it.
- `202608080001_studies_workspace.sql` creates/normalizes all four Studies tables, owner policies, ownership foreign keys and ownership trigger. Studies depends on it.
- Foundational tables and their original RLS are not created in this checkout's migrations, so this repository alone cannot reproduce or prove the full database contract.

### Migration decision

**No new migration was created or applied in this audit.** First verify the live migration ledger and schema. If existing repository migrations are unapplied, deploy them in order after a backup and staging rehearsal; do not create duplicate “fix” tables. Regenerate `src/integrations/supabase/types.ts` after deployment. Risks include legacy rows that cannot be assigned an owner, existing incompatible columns/constraints, and the Studies migration's not-null normalization. Rollback must be planned against the real pre-deployment schema rather than guessed here.

### Edge Functions

Required functions found: `ai-chat`, `agent-run`, `create-checkout-session`, `create-portal-session`, `stripe-webhook`, `push-send`, and `scheduled-reminders`.

- `ai-chat`: central dependency for Assistant, Translate, Content, Documents, Studies and Projects AI. A deployment/config failure makes many otherwise-working modules appear dead.
- `agent-run`: independently calls OpenAI and persists `agent_runs`; requires the Phase 1 columns and server-side premium enforcement.
- checkout/portal/webhook: all must point to the same Stripe environment and production origin; placeholder price IDs are not usable.
- push functions: require VAPID secrets and deployed notification schema; scheduled reminders additionally require an external schedule/cron invocation.
- There is no local evidence these functions are deployed at the Supabase URL configured in production.

### Required external variables/services

- Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL`; optional explicit `VITE_DEMO_MODE=true`; `VITE_VAPID_PUBLIC_KEY` for push.
- Supabase function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `OPENAI_API_KEY`, optional OpenAI models/limits/timeouts, `STRIPE_SECRET_KEY`, real `STRIPE_PRICE_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, and VAPID private configuration.
- Supabase dashboard: Google provider and redirect allow-list; email confirmation/reset redirects; storage bucket/policies used by avatars; Stripe webhook endpoint; scheduler for reminders.

## 7. Prioritized recovery backlog

### P0 — prevents use

1. Identify the production Supabase project and compare its migration ledger/tables/columns/RLS/functions with this checkout.
2. Reproduce the Studies runtime error with an authenticated test user; capture the actual PostgREST error and confirm whether the Studies migration is deployed.
3. Verify authentication redirects/provider/storage policies and required frontend credentials in the deployed environment.

### P1 — primary flow broken or unproven

1. **Studies first if the reported error reproduces; otherwise Projects first.** Apply/fix only the proven contract issue, then authenticated CRUD/reload all four Studies entities.
2. Projects authenticated create → auto-open → task CRUD/toggle → AI review/confirm → reload.
3. Productivity cross-module synchronization with Projects.
4. Make Search independently degradable and add exact-resource destinations.
5. Deploy/verify Studio schema/RPC, regenerate types, and test backend premium enforcement.
6. Verify `agent-run`, persisted history and entitlement enforcement.
7. Finish Finance account workspace continuation.

### P2 — incomplete function

Notifications deep links; Content/Documents revision continuity; Translate history destinations; Dashboard exact task/activity navigation; Agent deactivate/copy feedback; Settings account lifecycle.

### P3 — UX/design

After functional verification: replace native confirms, standardize diagnostic error panels, validate pending/saved states, and run the specified mobile viewport/keyboard/safe-area matrix.

### P4 — future

Cross-module linked-work graph, revision history, richer Studio curriculum/adaptation, and observability dashboards. These must not precede core CRUD verification.

## 8. Recommended module sequence

1. **Studies** (reported runtime failure; four-table deployment dependency).
2. **Projects** (central workspace and task ownership).
3. **Productivity** (same tasks, cross-module cache/persistence).
4. **Global Search** (currently one missing optional schema can break everything).
5. **Studio → Language Lab → AI Academy → Creator Growth** (shared untyped schema/RPC).
6. **Agents** (function + subscription + OpenAI contract).
7. **Finance** (complete account workspace).
8. **Content → Documents** (revision/AI review continuity).
9. **Dashboard → Notifications** (exact next-action navigation).
10. **Translate → Premium → Settings → Authentication hardening**.

The first correction target should therefore be **Studies**, but only after capturing the real authenticated error and live schema state. Likely files are `src/routes/_shell.studies.tsx`, `src/routes/_shell.studies.$subjectId.tsx`, `src/services/workspace-services.ts`, `src/integrations/supabase/types.ts`, `supabase/migrations/202608080001_studies_workspace.sql`, and `supabase/tests/studies_workspace.sql`.

## 9. Verification performed and limitations

### Static verification (performed)

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; warned about the now-native tsconfig paths option, a large client chunk, and an ignored Nitro bundling option.
- `npm run check` — passed (runs lint, typecheck, build); same non-fatal warnings.
- `npm run check:pwa` — passed and confirmed the configured TWA package/fingerprint.
- `git diff --check` — passed.

### Not performed

- No Supabase CLI project/link, migration ledger query, remote SQL inspection, Edge Function logs or Stripe/OpenAI dashboards were available.
- No authenticated browser session or seeded test user was supplied.
- Therefore no integration verification against Supabase, runtime browser verification, authenticated E2E, CRUD/reload persistence test, push test, Stripe checkout, AI provider request, RLS negative test, or mobile viewport test was performed.
- Build output is not evidence that tables, RLS, RPCs, functions, secrets or provider configuration exist in production.
