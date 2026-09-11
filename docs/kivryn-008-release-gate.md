# KIVRYN-008 release hardening and launch gate

Audit date: 2026-09-11. Scope: tracked Web, Expo Android, Supabase client/function and
migration code at the current `work` branch. No secrets, signing material, binary assets,
remote consoles, or production data were accessed. This is a static/code gate plus the
repository test matrix; claims requiring a real backend or device are explicitly separated.

## Executive result

**Recommendation: READY FOR INTERNAL TEST.** No reproducible P0 code blocker remains and
the production Web build and complete tracked automated suites pass. Open testing is gated
on the physical-device and external-console checks below, particularly authentication,
push delivery/tap handling, billing, and deployed backend parity. A stale public discovery
origin was fixed: the sitemap fallback and `robots.txt` now identify KIVRYN rather than the
legacy NEXORA origin.

## Product audit

| Area | Code-level result | Runtime gate |
| --- | --- | --- |
| Auth/onboarding | Session restoration, callback dedupe, recovery separation, protected layouts, provisioning retry, logout cache clearing, and fresh/existing-account routing have regression coverage. | Exercise email delivery, Google provider, cold callbacks, and account switching against staging. |
| Command Center | Canonical task/project/study/journey queries, selectors, empty/error/loading states, and retry paths are present. | Verify counts and next action with empty and populated staging accounts. |
| Assistant | Duplicate-send guard, history reconciliation, attachment validation, action preview/confirmation, safe errors, cache invalidation, and result routes are covered. | AI provider, upload, and action RPC must be smoke-tested after deployment. |
| Tasks/Projects/Studies | CRUD/selectors, completion/reopen, due date/priority, linked progress, duplicate removal/prevention, invalid IDs, and mutation refresh are covered. | Verify RLS and persistence with two real users. |
| Journeys/Missions/Arena | Current/ended state derivation, idempotent completion/rewards, bounded progress, retryable failures, and empty states are covered; no known infinite loader was reproduced. | Validate server time boundaries and daily rollover. |
| Notifications | Permission normalization, device ownership, Expo token validation, stored-token lifecycle, test-push result, response dedupe, auth deferral, and bounded tap routes are covered. | Physical Android and Expo/Firebase delivery are mandatory. |
| Creator | Canonical project creation, private upload/enqueue/job states, duplicate active-job rejection, retry/cancel, errors, and routes are covered. | Deployed worker, storage, FFmpeg, Edge Functions, and large media remain external gates. |
| Community | Server/realtime reconciliation, message idempotency, reaction refresh, reconnect scheduling, squads, reporting, and safe errors are covered. | Test disconnect/reconnect and concurrent posting on two devices. |
| Premium | Authoritative entitlement, checkout/portal/restore capability boundaries, tester behavior, and safe failure states are covered. | Verify Play tester entitlement and Stripe/provider webhooks in their consoles. |
| Settings/i18n | Persisted language/preferences, notifications, logout, and destructive-action boundaries are covered. | Review full PT-BR and English UI on device; user/backend content is intentionally not translated. |
| Web | Route generation/build covers public, protected, detail, and fallback states; responsive/focus contracts are present. | Browser smoke tests and production-origin headers/service worker remain deployment checks. |

## Historical issue trace

| Historical issue | Status | Root cause / disposition |
| --- | --- | --- |
| Email used as task title | **Cannot reproduce; covered** | Canonical identity rejects email/local-part as a personal name; task creation accepts explicit user/action content. Existing malformed historical rows are not silently rewritten. |
| Email used as Study next action | **Cannot reproduce; covered** | Study selectors derive actions from subject/session data rather than account email. |
| Duplicate “New study plan” | **Fixed previously; covered** | Automatic placeholder creation was removed and subject IDs are reconciled/deduplicated. |
| Duplicate Community host/system messages | **Fixed previously; covered** | Backend idempotency and client server/realtime reconciliation suppress duplicate rows. |
| Creator project creation failures | **Cannot reproduce in code; manual backend check required** | Client validates inputs and surfaces canonical upload/create failures; deployed storage, function, and worker configuration cannot be proven locally. |
| Arena/challenges infinite loading | **Cannot reproduce; covered** | Protected lifecycle supplies an authenticated owner before Arena mounts, while the query exposes explicit loading/error/empty states. |
| Mixed PT/EN strings | **Partially deferred** | Localized product copy and language persistence are covered. Some legacy native operational copy remains Portuguese and requires a dedicated copy migration rather than risky release-gate churn. This is not a data-loss/crash blocker but must be reviewed before production. |
| Notification uncertainty | **Code-fixed; device-only verification remains** | Permission/token/ownership/readiness/tap states are explicit; actual Firebase/Expo delivery is external. |
| Fresh-account lifecycle regression | **Cannot reproduce; covered** | Provisioning is idempotent, does not generate fake work, and retry/error routing is explicit. |
| Visible NEXORA references | **One stale release reference fixed** | Public sitemap discovery still advertised `nexora.app`; it now defaults to `kivryn.app`. Remaining matches are compatibility identifiers, internal RPC/function/storage keys, CSS symbols, or asset filenames and were intentionally not renamed. |

## Fixes, files, migrations, and tests

- Changed the sitemap fallback and crawler discovery URL to the KIVRYN production origin.
- Added a release-branding contract covering Web discovery metadata plus Android name,
  scheme, package, and Web manifest identity.
- Added this durable release gate, remaining-risk register, and handoff checklist.
- **Migrations:** none. No demonstrated schema defect justified a release-phase migration.

## Performance and remaining risks

The Web build route-splits feature modules and emits a dedicated Supabase chunk, but its
shared client entry remains approximately 607 kB minified (approximately 186 kB gzip) and
triggers Vite's 500 kB warning. No speculative manual chunking was applied because the
largest entry contains router/bootstrap dependency machinery and a rushed split could
regress hydration. This is a non-P0 optimization risk to profile after launch validation.

Other explicit risks are: no authenticated browser/device E2E was possible without staging
credentials; no remote RLS/deployment drift check was possible; notification delivery,
billing lifecycle, OAuth/email delivery, Creator processing, offline cache upgrades, and
background lifecycle remain runtime-dependent; mixed legacy native copy needs visual
language QA; the production Web origin/DNS assumption (`https://kivryn.app`) must be
confirmed and `VITE_PUBLIC_SITE_URL` set if the canonical origin differs.

## Manual external-console requirements

1. Confirm the production Web origin and set `VITE_PUBLIC_SITE_URL`; verify DNS/TLS and the
   generated sitemap/robots URLs.
2. In Supabase, allowlist exact `kivryn://auth/callback` and production Web auth URLs; verify
   email templates, Google OAuth, deployed migrations, RLS, Edge Functions, storage, and
   webhook versions without wildcard redirects.
3. In EAS/Expo/Firebase, verify project association, Android package `kivryn.app`, push
   credentials, notification channel behavior, and delivery receipts. Do not replace signing
   credentials during this check.
4. In Play Console, verify application ID, signing certificate, version code, privacy/data
   safety declarations, tester tracks, billing products, license testers, and review assets.
5. In billing/Stripe consoles, verify products, portal, cancellation/restore, webhook secret,
   event delivery, and authoritative entitlement reconciliation.
6. Verify the Creator worker/storage/functions deployment, runtime secrets, queue lease,
   FFmpeg availability, output expiry, and failed-job recovery.

## Strict physical Android checklist

- [ ] Install the signed internal AAB/APK cleanly; confirm KIVRYN launcher identity and no
      retained app data.
- [ ] Create a fresh email account; confirm no synthetic tasks/projects/studies and complete
      email confirmation plus onboarding exactly once.
- [ ] Test Google login success, cancellation, provider failure, callback return, and deep
      link cold/warm launch.
- [ ] Force stop/reopen during onboarding and after completion; verify session restoration,
      stable route, no redirect loop, and no duplicate provisioning.
- [ ] Logout/login as the same user, then a different user; verify no stale route, cache,
      profile, history, or notification ownership crosses accounts.
- [ ] Launch online and offline, retry after reconnect, and background/foreground during a
      request; verify bounded loading and honest errors.
- [ ] Create/edit/complete/reopen/delete a task with priority/due date; create/edit a project
      and verify linked-task progress and detail navigation.
- [ ] Create one study, reject rapid duplicate submission, run a session, and verify next
      action/progress without exposing email identity.
- [ ] Load today's mission, complete it once, retry/reopen, and verify Journey/Momentum/Arena
      consistency plus active/ended/empty states.
- [ ] Send an Assistant message, retry a network failure, preview/cancel/confirm an action,
      and verify exactly one write and correct destination.
- [ ] Test notification permission allow/deny/blocked, Expo token registration, stored owner,
      preference changes, foreground/background/killed push receipt, and tap routing for each
      supported resource plus a deleted/invalid resource.
- [ ] Create and process a Creator project, interrupt upload, retry/cancel a job, open output,
      and confirm failures never display as success.
- [ ] Post/react/report in Community; disconnect/reconnect and confirm no duplicate host,
      system, realtime, or user message. Exercise squad join/leave on two accounts.
- [ ] Verify free, tester, Premium, restore, cancellation, portal, offline, and provider-error
      states against authoritative entitlements.
- [ ] Test keyboard obscuration, Android back, status/navigation bars, supported rotation,
      100/130/200% font scale, screen reader labels, and 320–tablet-width layouts.

## Web release checklist

- [ ] Deploy the exact tested commit with production environment variables and no demo mode.
- [ ] Smoke-test every public/protected/detail route, invalid IDs, direct refresh, deep links,
      auth callbacks, logout back-navigation, and onboarding guards.
- [ ] Exercise fresh and populated accounts in Chromium, Firefox, and Safari at phone,
      tablet, and desktop widths; verify keyboard-only focus, dialogs, menus, and forms.
- [ ] Verify real CRUD, Assistant actions, Community realtime/reconnect, Creator errors,
      Premium redirects/portal, and cross-account cache isolation.
- [ ] Validate manifest, icons, service worker update/offline fallback, robots, sitemap,
      canonical origin, CSP/security headers, error monitoring, and rollback procedure.
- [ ] Record network/API failures and confirm all primary screens leave loading state and
      offer an accurate retry, empty, missing-resource, or error state.
