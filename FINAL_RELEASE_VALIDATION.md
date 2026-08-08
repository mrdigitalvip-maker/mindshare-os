# NEXORA — Final release validation

Date: 2026-08-08  
Scope: static release audit of the current web application, Supabase functions, and checked-in
release configuration. Android/TWA/AAB and database schema were not changed.

## Result

No reproducible code defect was found during this static pass, so no application code was changed.
The repository passes every requested automated gate. The release is **not yet approved for
production**, because authenticated multi-user, deployed Supabase/OpenAI, and Stripe lifecycle tests
require the live environment and operator credentials. A `READY` result below means the checked-in
implementation and static path are ready; it does not replace the live-test items explicitly listed.

## Module matrix

| MODULE | STATUS | FUNCTIONAL | PERSISTENCE | AI | PREMIUM | MOBILE | LIVE TEST REQUIRED | KNOWN ISSUE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | NEEDS LIVE TEST | Routes and actions are connected | User-scoped aggregate queries | Assistant CTA is connected | N/A | Responsive shell; device check pending | Authenticated data, empty/error states, narrow device | None found statically |
| Assistant | EXTERNAL DEPENDENCY | Conversation/create/send flows are connected | User-scoped conversations/messages | Supabase Edge Function + OpenAI | Limits and capabilities enforced server-side | Responsive UI; keyboard/device check pending | Free/Premium models, history reload, timeout/429/5xx | Requires deployed function, secrets, model access |
| Projects | NEEDS LIVE TEST | List, create, detail, edit/delete and task continuation exist | Supabase writes include authenticated `user_id` | Plan generation uses backend AI | AI quota enforced server-side | Responsive route; device check pending | CRUD/reload and second-user isolation | None found statically |
| Productivity | NEEDS LIVE TEST | Quick add, editor, status and delete handlers exist | User-scoped task CRUD | N/A | N/A | Responsive route; touch check pending | CRUD/reload and second-user isolation | None found statically |
| Agents | EXTERNAL DEPENDENCY | Create, edit, delete, open and run handlers exist | User-scoped agents/runs | `agent-run` calls OpenAI server-side | Run endpoint revalidates active subscription | Responsive route; device check pending | Premium/free, provider failures, run persistence | Requires deployed function and OpenAI secret |
| Studies | NEEDS LIVE TEST | Subject, session, goals and notes paths are connected | User-scoped Supabase tables/RPC paths | Study assistance uses backend AI | Limits enforced by AI backend | Responsive route; timer/background check pending | CRUD, timer, reload, AI and isolation | Applied schema/RPC must be confirmed live |
| Studio | NEEDS LIVE TEST | Catalog, enrollment, lessons and progress are connected | User-scoped enrollment/progress/goals/streak | Usage is backend-derived | Premium lessons are visually locked; progress RPC/RLS must reject bypass | Responsive route; device check pending | Direct API bypass test for premium lessons; progress/reload | Backend enforcement depends on deployed RLS/RPC |
| Language Lab | NEEDS LIVE TEST | Dedicated category route renders Studio workspace | Same Studio persistence | Course content; no client secret | Same Studio entitlement path | Responsive route; device check pending | Enrollment, lesson completion, premium bypass | Same Studio live dependencies |
| AI Academy | NEEDS LIVE TEST | Dedicated category route renders Studio workspace | Same Studio persistence | Course content; no client secret | Same Studio entitlement path | Responsive route; device check pending | Enrollment, lesson completion, premium bypass | Same Studio live dependencies |
| Creator Growth | NEEDS LIVE TEST | Dedicated category route renders Studio workspace | Same Studio persistence | Course content; no client secret | Same Studio entitlement path | Responsive route; device check pending | Enrollment, lesson completion, premium bypass | Same Studio live dependencies |
| Content | EXTERNAL DEPENDENCY | Wizard, detail and save continuation exist | Drafts use user-scoped documents | Generation uses `ai-chat` | Backend quota/entitlement response is authoritative | Responsive route; device check pending | Generate/save/reload, provider errors and isolation | Requires deployed AI function/OpenAI |
| Documents | NEEDS LIVE TEST | Create, detail, edit and delete paths exist | User-scoped documents/files/notes | Analysis uses backend AI | Document analysis is rejected server-side for Free | Responsive route; file/device check pending | CRUD/upload policy/analysis and isolation | Avatar/file bucket policies are external to generated types |
| Translate | EXTERNAL DEPENDENCY | Translate, swap/copy/save paths are connected | User-scoped translations | Translation uses `ai-chat` | Daily limits enforced server-side | Responsive route; clipboard/device check pending | Limits, reload, provider errors and isolation | Requires deployed AI function/OpenAI |
| Finance | NEEDS LIVE TEST | Account/transaction create and detail paths exist | User-scoped account/transaction CRUD | N/A | N/A | Responsive route; device check pending | CRUD, totals, currency cases, reload/isolation | None found statically |
| Global Search | NEEDS LIVE TEST | Command opens and results navigate to valid routes | Private sources filter by authenticated user; public Studio catalog is intentionally global | N/A | Search does not grant capabilities | Mobile shell entry exists | Every category, deep links, second-user isolation | One failed source currently fails the combined search; acceptable but monitor |
| Notifications | EXTERNAL DEPENDENCY | Center, read state and push preparation handlers exist | User-scoped notifications/subscriptions | N/A | N/A | Browser permission/device support varies | Realtime, push grant/deny, expired endpoint, two users | Requires VAPID, deployed send function and real device/browser |
| Premium | EXTERNAL DEPENDENCY | Checkout, refresh and Portal paths are connected | Subscription state comes from Stripe webhook table | N/A | UI never grants access from return query string | Hosted Checkout device check pending | Trial/active/past-due/cancel/recovery/replay | Requires matched Stripe live objects, secrets and webhook |
| Settings | NEEDS LIVE TEST | Profile, avatar, preferences, push and billing actions are connected | Profile/preferences are user-scoped | Usage comes from backend ledger | Subscription is server-derived | Responsive route; permission/device check pending | Avatar policy, preferences reload, push and Portal | Storage bucket/policies require live confirmation |
| Auth | EXTERNAL DEPENDENCY | Sign-up/sign-in/callback/confirm/reset/logout/onboarding routes exist | Supabase PKCE session persistence | N/A | N/A | Redirect/email deep-link device check pending | Email delivery, redirect allow-list, recovery, revoked session | Requires production Supabase Auth configuration |
| Stripe | EXTERNAL DEPENDENCY | Checkout/Portal/webhook contracts are present | Signed webhook upserts subscription state | N/A | Edge functions derive user and lifecycle server-side | Hosted pages external | All test/live lifecycle events and idempotent replay | Requires Stripe configuration and live webhook delivery |

## Targeted risk review

1. **Buttons and continuity:** the static route/component review found handlers, form submission,
   dialog triggers, or enclosing links for actionable controls. Intentionally unavailable controls
   are disabled. Creation flows continue into a persisted list/detail or close after invalidation.
2. **Routes:** TanStack's generated route tree includes all public, protected, detail, Studio, Auth,
   Premium, and sitemap routes. The production build emits separate chunks for feature routes.
3. **Ownership:** private browser queries reviewed in workspace, AI, search, analytics, settings,
   notifications, subscription, and profile services obtain the authenticated user and filter or
   write `user_id`. Service-role Edge Function reads/writes explicitly bind resources to the JWT
   user. Public Studio track/lesson catalog queries are the intentional exception; user progress is
   scoped.
4. **Mocks:** demo data and local storage are reachable only when `VITE_DEMO_MODE=true`; missing
   credentials do not silently activate demo mode. Production must explicitly set it to `false`.
5. **Secrets:** no literal OpenAI, Stripe, webhook, or service-role secret was found in tracked
   frontend source. Browser configuration contains only Supabase URL/anon key and public VAPID key;
   privileged values are read from Edge Function environment variables.
6. **Entitlements:** agent execution and restricted AI actions re-check subscription/limits in Edge
   Functions. Studio premium lessons additionally depend on deployed RLS/RPC enforcement and must be
   directly tested, because a visual lock alone is not proof of backend enforcement.
7. **Caching:** React Query keys carrying private state include the authenticated user identifier;
   Edge JSON responses use `Cache-Control: no-store`. Demo local storage is browser-global but is
   unreachable in live mode.
8. **Errors:** module queries expose local retry/error states and mutations report failures. Provider,
   configuration, auth, entitlement, validation, rate-limit, and persistence errors are mapped at
   the Edge boundary rather than promoted to simulated success.
9. **Persistence:** expected production workspaces use Supabase. Local persistence is intentionally
   demo-only. Reload and two-user isolation remain mandatory live acceptance tests.
10. **Mobile:** responsive shell, mobile navigation, safe-area padding, and PWA metadata are present;
    physical-device keyboard, clipboard, notifications, installability, and hosted Checkout were not
    exercised in this static audit.

## Bundle and route splitting

The client build creates distinct chunks for every feature/detail route and shared service/UI code,
so route splitting is active. The main client entry is **565.63 kB minified / 174.11 kB gzip**, which
triggers Vite's advisory 500 kB warning. This is not a correctness blocker, but it is a measurable
startup-performance risk on low-end mobile devices and should be profiled after release criteria are
met. The build also reports that `vite-tsconfig-paths` is now redundant and that Nitro ignores
`inlineDynamicImports` when code splitting is explicitly configured; both are non-failing tooling
warnings, not release defects.

## Blockers before launch

- Complete the live acceptance checklist with at least two users against the exact commit to be
  deployed, including direct API attempts to cross tenant boundaries.
- Confirm every migration/RLS policy/RPC/storage bucket is applied in production and verify Studio
  premium progress cannot be written by a Free user outside the UI.
- Confirm `VITE_DEMO_MODE=false`, production Supabase Auth redirect URLs/email flows, and all required
  Edge secrets without exposing their values.
- Exercise OpenAI success, quota, timeout, 429 and 5xx behavior for Free and Premium.
- Exercise Stripe Checkout cancellation/completion, trial, active, past-due, Portal update,
  cancellation, recovery, webhook retries/replay, and subscription convergence.
- Validate notifications, clipboard, keyboard/safe areas, deep links and PWA installability on the
  supported physical mobile devices/browsers.

## Safe to launch

The checked-in code is safe to advance to a **production-configured staging/preview validation**:
lint, type checking, production client/SSR/Nitro build, aggregate checks, PWA/TWA static consistency,
and whitespace validation pass. Static inspection found no broken route, active live-mode mock,
frontend secret, unscoped private query, or confirmed broken handler. Production launch remains a
**no-go until every blocker above has recorded live evidence**.

## Post-launch improvements

- Profile the 565.63 kB main entry on representative low-end mobile hardware and split additional
  shared dependencies if field data shows a startup regression.
- Add automated browser E2E coverage for the live acceptance matrix and tenant-isolation probes.
- Add synthetic integration health checks and alerts without logging message bodies, tokens, or
  billing data.
- Remove the redundant Vite paths plugin/config warning in a separate maintenance change; it is not
  part of this release-validation task.

## Automated evidence

All requested commands passed on 2026-08-08:

```text
npm run lint
npm run typecheck
npm run build
npm run check
npm run check:pwa
git diff --check
```

The build warning about the main chunk and the two tooling warnings described above are advisory;
there were no command failures.
