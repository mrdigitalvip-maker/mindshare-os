# NEXORA — backend, migrations and deploy-readiness audit

**Audit date:** 2026-08-27  
**Project ref:** `qoxtwbhpovkxfiambwgz`  
**Scope:** repository evidence only. No linked-project inspection, remote migration,
Edge Function deployment, or destructive database operation was performed.

## Executive decision

**NO-GO for production deployment of the four requested migrations as a batch.**
The task and study contracts are coherent with the mobile client, and the
monetization/journey migrations establish a good server-owned foundation. The
release is nevertheless blocked until the linked database is inspected and the
Assistant quota path is reconciled. `ai-chat` does not call
`claim_feature_usage`; it performs separate count/write operations and records
the action as `assistant`, while the RPC meters `assistant_standard` and
`assistant_attachment`. Consequently the advertised canonical quota mechanism
is not the mechanism used by the canonical Edge Function.

The repository also does not contain migrations that create the original
`projects`, `tasks`, `subscriptions`, Assistant tables, or their original RLS
policies. Generated types and a previous manual audit are useful evidence, but
they cannot prove the current remote state or reproduce a clean database. This
audit therefore does **not** certify remote RLS.

No SQL or runtime behavior was changed. Fixing the quota path safely requires a
new incremental migration plus a deliberately coordinated `ai-chat` change and
deployment; silently changing either half during an audit would be riskier than
documenting the blocker.

## Findings by severity

### BLOCKER

1. **Canonical Assistant/attachment quotas are not wired to `ai-chat`.** The
   migration defines atomic limits of 10/100 standard and 2/20 attachment
   requests, but `ai-chat` uses its own count-before-provider-call flow and
   writes `action = 'assistant'`. Attachment requests are not claimed against
   `assistant_attachment`. Concurrent requests can pass a separate count, and
   a provider call can occur before the usage row is persisted. Do not deploy
   the migration and claim server-authoritative quota readiness until these
   paths share one atomic contract.
2. **Remote schema/migration state is unknown.** This audit had no authenticated
   linked Supabase session. The four files assume pre-existing tables, columns,
   constraints and policies. Run the read-only/list and dry-run steps below,
   inspect drift, and obtain a backup before `db push`.
3. **The repository is not a complete schema source.** There is no checked-in
   creation migration for core `projects`, `tasks`, `subscriptions`,
   `ai_conversations`, or `ai_messages`. A fresh/local migration validation of
   the requested chain therefore cannot establish production equivalence.

### HIGH

1. **Free data limits can be bypassed through state transitions and races.**
   The project/task/study trigger fires only on `INSERT`. A Free user can insert
   an inactive/completed record and later make it active/open. Concurrent
   inserts can also observe the same count because the trigger takes no lock.
   Journeys correctly checks inserts and status updates and takes ownership from
   the row, but its count is also raceable.
2. **Task execution has two writable sources of completion truth.** Nothing
   enforces `completed = true` iff `execution_status = 'completed'`. The
   migration only backfills once. Mobile normally writes both, but any permitted
   client can create contradictory state; mission verification watches only
   `completed`.
3. **Journey mission updates are overly broad.** RLS permits owners to update
   every mission column, including `momentum_value`, `source_type`, `source_id`,
   and `user_id` (subject only to same-owner check). Rewards are emitted by
   triggers for task/study completion, so an owner can inflate a pending
   mission's value up to 500 before completing its source. Restrict direct
   updates to safe state fields or move all mission mutation behind RPCs.
4. **`complete_journey_action` does not update challenges.** It awards Momentum
   atomically and is retry-safe by rejecting an already-completed mission, but
   unlike verified task/study completion it does not increment active challenge
   participation. The current mobile does not call this RPC, so this is dormant
   rather than a reason to alter the current app contract.
5. **Studies child ownership trigger trusts `auth.uid()`, not `new.user_id`.**
   This is good for authenticated client writes, but service-role/import writes
   with no JWT can set `user_id` to null and fail after mutation. More
   importantly, the foreign keys added `NOT VALID` are never validated in the
   checked-in sequence; legacy cross-owner/orphan integrity must be queried and
   constraints validated incrementally.

### MEDIUM

1. The monetization constraints are added `NOT VALID` and never validated.
   Existing invalid provider/entitlement values remain possible and must be
   audited before a later `VALIDATE CONSTRAINT` migration.
2. `has_premium` accepts a user UUID and is `SECURITY DEFINER`. Execute is
   revoked from `public` and only server functions/triggers use it, which is
   acceptable, but future migrations should use `search_path = pg_catalog,
   public` and explicitly preserve the revoke. Trigger functions should also
   have explicit execute revokes for defense in depth.
3. `claim_feature_usage` treats a duplicate `request_id` as allowed and does not
   return a distinct replay result. Its uniqueness is per user/request, not per
   feature. A retry can therefore continue work without proving that the first
   attempt produced a response. Define explicit replay semantics before wiring
   it into `ai-chat`.
4. The daily mission accepts any client-supplied date. The unique index limits
   one mission per date, but a user can pre-generate arbitrary dates. Bound the
   accepted date window if mission scheduling itself is economically relevant.
5. `journey_missions.journey_id` uses `ON DELETE SET NULL`, preserving mission
   history, while deleting a journey. This is non-destructive for progress but
   should be confirmed as intended. There is no FK from polymorphic `source_id`
   by design, so server-side source verification is essential.
6. The seeded weekly challenge is fixed to 2026-08-24 through 2026-08-31.
   Deployment after that window creates only an expired challenge. This is not
   fake data, but challenge scheduling needs an explicit operational process;
   do not rewrite the historical seed.
7. `scheduled-reminders` uses service role appropriately and requires a shared
   scheduler secret, but it does not fail closed when required URL/key settings
   are absent and does not check errors while loading preferences. Add
   configuration/error handling before relying on notifications for release.

### LOW

1. Several requested migrations are only partly idempotent: named constraints,
   policies, triggers, indexes in Journeys, and monetization checks fail if the
   SQL file itself is manually replayed. Supabase migrations should run once,
   so this is primarily an operational warning—do not manually replay files.
2. `updated_at` for journeys is supplied by clients; no touch trigger exists.
3. Momentum streak aggregation is calculated on the mobile from immutable,
   server-created events. Points/progress are authoritative, but the displayed
   streak is a presentation calculation rather than a server RPC result.

## Migration review and order

### `202608250001_task_execution_foundation.sql`

- **Dependencies:** requires `public.tasks` with `user_id`, `completed`, and
  `due_date`. It adds backward-compatible execution columns and a useful partial
  owner/status/due-date index.
- **Defaults/checks:** values and default are sensible. Existing completed rows
  are backfilled. There is no consistency constraint/trigger between legacy
  `completed` and the new execution status.
- **RLS/grants/FKs:** unchanged; readiness depends entirely on the pre-existing
  task schema and policies. Confirm `tasks.project_id -> projects.id`, owner RLS
  for all four operations, and cross-owner project attachment protection on the
  linked database.
- **Decision:** conditionally ready after remote preflight; follow with an
  incremental consistency fix rather than edit history.

### `202608260001_active_studies.sql`

- **Dependencies:** correctly follows the study workspace migrations. Subjects,
  sessions, ownership RLS, owner-enforcing child trigger, and indexes already
  exist.
- **Contract:** objective, weekly target (1–10080), next action, session states,
  planned duration, timestamps, and reflection match mobile payloads. One active
  session per user is enforced. Completed sessions require positive duration.
- **Deploy risk:** replacing the old duration constraint takes a table lock and
  validates all existing rows immediately. Query invalid/null durations and
  contradictory completed/status rows first. Legacy FKs remain `NOT VALID`.
- **Decision:** conditionally ready after data preflight.

### `202608260002_monetization.sql`

- **Canonical entitlement:** provider-neutral `entitlement` plus valid billing
  statuses and period end correctly preserve Premium for Stripe, Google Play,
  or manual server-owned records. Removing client mutation policies makes the
  backend authoritative. Downgrade updates subscription state only; no product
  data is deleted. No IAP native module is required by this schema.
- **Limits:** values match the required contract (3 projects, 30 open tasks, 3
  active subjects, Assistant 10/100, attachment 2/20). Premium data/Journey
  creation is practically unlimited. Enforcement gaps are listed above.
- **Decision:** **not production-ready as a claimed end-to-end quota solution**.
  Apply only with the incremental limit hardening and coordinated Edge Function
  plan.

### `202608260003_journeys_foundation.sql`

- **Dependencies/order:** correctly follows task execution, studies, and
  monetization (`has_premium`). Ownership FKs cascade from deleted users; child
  history uses intentional set-null semantics.
- **RLS:** journeys are owner CRUD; missions are owner read/update only;
  Momentum and participation are owner read-only; active challenge definitions
  are authenticated-read-only. There is no `USING (true)` private-data policy.
- **Atomicity/idempotency:** daily mission creation uses an advisory lock plus a
  unique owner/date index. Momentum has a source/event unique key. Triggered
  mission completion and challenge rewards use conflict-safe inserts in the
  source completion transaction. See the mutable mission and action-challenge
  gaps above.
- **Decision:** not ready until mission update privileges/reward integrity are
  hardened incrementally.

**Required order (never reorder):** task execution → active studies →
monetization → journeys. Any corrective migration must have a timestamp after
`202608260003` and must not modify these historical files.

## Mobile ↔ backend contract

- Mobile project/task queries use existing generated columns and explicitly
  scope by `user_id`. Tasks may have a null project. Execution state, next
  action, blockers and reminder timestamps match the task migration.
- Studies payloads match the added columns and constraints. Subject/session
  ownership is filtered client-side and enforced by RLS/trigger server-side.
- Journey table/column names and `ensure_daily_journey_mission(p_local_date)`
  match. The mobile does not invoke `complete_journey_action`; task/study
  completion drives persisted progress. Momentum events and challenge progress
  are read from server tables, not local storage.
- The canonical subscription reader recognizes `entitlement = premium` across
  active, trialing, canceled-before-expiry, and grace-period states. Tester
  Android therefore retains Premium when the backend says Premium. No
  `react-native-iap` or NitroModules dependency is present.
- Demo/local stores exist behind explicit demo mode for web development. They
  are not the production mobile source for entitlement, Momentum, or challenge
  progress.

### RPC inventory used by relevant clients

| RPC | Caller | Arguments / return | Security and retry assessment |
|---|---|---|---|
| `ensure_daily_journey_mission` | Mobile Journeys | `p_local_date date`; composite `journey_missions` or null | Definer, authenticated-only, fixed search path, derives `auth.uid()`, advisory lock + unique index; retry idempotent for owner/date. Date is unbounded. |
| `complete_studio_lesson` | Web Studio (adjacent Studies area) | lesson UUID, optional score; JSONB XP/streak/date | Definer, authenticated-only, fixed search path, owner derived from JWT; duplicate completion awards zero. Its Premium check predates canonical `has_premium` and omits grace/canceled semantics, so reconcile incrementally. |

`claim_feature_usage` and `complete_journey_action` are exposed to authenticated
clients but are not called by the checked-in mobile/web clients. They were
audited above because they are part of the requested backend contract.

## Edge Function audit

### `ai-chat` — deploy only after quota blocker is fixed

- Authenticates bearer JWT with the anon client and relies on RLS for owned
  conversations/context. Inputs, UUID request IDs, attachment metadata, output
  schema, size limits, provider timeouts, and safe error mapping are present.
- OpenAI credentials/models are server environment values. Logs use event,
  request and user IDs rather than prompts or tokens.
- Entitlement lookup matches the canonical provider-neutral columns.
- **Blocking issue:** quota accounting is not the atomic monetization RPC and
  attachment quota is not the canonical 2/20 meter. Preserve the response
  contract while replacing only internal accounting in a separate reviewed PR.
- Required secret names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`.
  Optional operational/model names include `APP_URL`, `OPENAI_FREE_MODEL`,
  `OPENAI_PREMIUM_MODEL`, `OPENAI_TIMEOUT_MS`, and the existing limit/token
  variables. Never place their values in mobile code.

### `push-send` — needed only if notifications are in acceptance scope

JWT-authenticated users can send only to themselves; scheduler calls require
`SCHEDULER_SECRET`. Service role is server-only. Titles/bodies and routes are
bounded/sanitized; invalid endpoints are removed/disabled without logging token
material. Required names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SCHEDULER_SECRET`; web push additionally needs
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

### `scheduled-reminders` — deploy only when scheduler is configured

Internal-only authentication uses `SCHEDULER_SECRET`; service role remains
server-side. Delivery rows provide daily deduplication. It is not needed for the
four schema migrations themselves. Required names: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SCHEDULER_SECRET`.

### Monetization functions

Stripe checkout/portal/webhook and Google Play verification functions are
present. They are not required to restore billing in tester Android and must not
be deployed merely because this audit exists. The Google verification function
is authenticated and verifies purchase state server-side; it does not require a
mobile IAP library to preserve an already-existing Premium entitlement. Billing
deploys require a separate provider-specific review. Secret names in repository
code include `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_MONTHLY`, `GOOGLE_PLAY_SUBSCRIPTION_ID`,
`GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_BASE_PLAN_ID`, and
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

## Incremental remediation plan

1. Inspect linked migration history, schema, policies, function ACLs and invalid
   rows. Take a provider-supported backup. Do not push yet.
2. Add one new migration (do not edit the four historical files) that:
   - validates legacy rows before validating study and monetization FKs/checks;
   - synchronizes/guards task completion state;
   - enforces Free limits on insert **and transitions**, with transaction-safe
     serialization;
   - restricts mission mutation so clients cannot alter reward/source fields;
   - centralizes challenge progress/reward logic for both verified sources and
     journey actions;
   - uses hardened search paths and explicit function ACLs.
3. Update `ai-chat` internally to claim standard and attachment usage atomically
   before provider work, define retry/refund semantics, and retain the current
   HTTP response contract. Add contract/concurrency tests.
4. Run local reset only against a disposable local Supabase project once a
   complete baseline schema is available. Run linked dry-run and review SQL.
5. Apply migrations manually during a controlled window. Deploy `ai-chat` only
   after its required migration succeeds. Deploy push functions only if the
   notification acceptance run is planned.

## Exact future manual commands

These are recommendations, **not commands executed by this audit**:

```bash
supabase login
supabase link --project-ref qoxtwbhpovkxfiambwgz
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

Stop after the dry-run unless the output, backup, incremental fixes, and change
window have been explicitly approved. Do not run `db push` from automation.

## Post-deploy acceptance checklist

- [ ] **Auth:** unauthenticated table/RPC/function calls fail; valid tester can refresh a session.
- [ ] **Tasks:** create standalone and project task; update execution/next action/due date; complete once; contradictory state is rejected.
- [ ] **Projects:** CRUD own project; Free fourth active project is rejected on insert and reactivation; Premium is accepted.
- [ ] **Studies:** Free fourth active subject is rejected; start/finish one session; timestamps, duration and reflection persist; concurrent active session is rejected.
- [ ] **Journeys:** Free second active Journey is rejected on create/reactivation without deleting paused data; Premium can activate it.
- [ ] **Entitlements:** backend Free/Premium results match valid provider/manual records; canceled/grace before expiry remains Premium; downgrade preserves all records.
- [ ] **Assistant quota:** Free requests 1–10 pass and 11 fails; Premium 1–100 pass and 101 fails; midnight reset is UTC; concurrent requests cannot exceed cap.
- [ ] **Attachment quota:** Free 1–2 pass and 3 fails; Premium 1–20 pass and 21 fails; standard and attachment meters cannot collide by request ID.
- [ ] **Momentum:** completing a verified task/session awards exactly once; retry/toggle does not duplicate points; client cannot edit points or mission value.
- [ ] **Challenges:** active challenge increments exactly once per eligible mission and awards exactly once at target; journey-action behavior matches the approved contract.
- [ ] **Notifications:** scheduler secret is required; daily dedupe works; quiet hours/timezone work; push goes only to the target user's devices.
- [ ] **RLS cross-user isolation:** with two real test users, user A cannot select/insert-for/update/delete user B's projects, tasks, subjects, sessions, journeys, missions, Momentum, challenge participation, subscriptions, AI history/usage, or push records.
- [ ] **Anonymous isolation:** anon cannot read private tables and cannot execute authenticated RPCs.
- [ ] **Regression invariants:** Android application ID remains `app.vercel.nexora_os_eosin.twa`; Expo scheme remains `nexora`; no IAP/Nitro package is installed.

## Evidence limits

Static inspection can establish repository intent, not current remote truth.
Statements about the linked project's actual applied migrations, live policies,
grants, secrets, row validity, and deployed function versions remain
**unverified** until the manual linked-project preflight is performed. No secret
values were read or recorded during this audit.
