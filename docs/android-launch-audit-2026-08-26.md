# NEXORA Android launch audit — 2026-08-26

This report records the repository state inspected at `7a897bbc1cadf22b55c0c50fd08e52799607e00c` on branch `work`. It is a code and build-environment audit, not a physical-device acceptance report.

## 1. Current main SHA and recent merges

- Audit baseline: `7a897bbc1cadf22b55c0c50fd08e52799607e00c` (merge PR #93, Journeys V1).
- Other relevant merges in the baseline are PR #92 (canonical monetization), PR #91 (Settings), and PR #90 (active Studies).
- The worktree was clean at audit start. No unexpected tracked modifications or untracked native/build files were present.

## 2. Readiness

**Estimated readiness: 68%.** The TypeScript, lint, and domain-test gates pass, but this checkout cannot produce an Android artifact. Deployment state and billing-console configuration could not be verified.

## 3. P0 — must fix before testers

1. `mobile/android/` is absent from this checkout, so `./gradlew assembleDebug` cannot run and native manifest, activity, SDK, signing, Billing module, and generated deep-link behavior cannot be verified.
2. A clean mobile dependency install is blocked by `403 Forbidden` for `https://registry.npmjs.org/react-native-iap`. Consequently Expo cannot resolve the `react-native-iap` config plugin and Android export fails.
3. Required migration and Edge Function deployment state for Supabase project `qoxtwbhpovkxfiambwgz` is unknown. No Supabase CLI/session is available in the audit environment.
4. No physical Android device or `adb` is available, so the mandatory end-to-end acceptance flow has not run.

The audit corrected one billing P0 in source: the package name submitted for backend Play verification was `com.nexora.app`, inconsistent with the unchanged Expo application ID `app.vercel.nexora_os_eosin.twa`. It now uses the application ID. The price UI can no longer invent a fallback price when Play returns none.

## 4. P1 — fix before public release

- RTDN is not implemented. Google Play state changes reconcile only during purchase, restore, or another explicit verification request.
- Remote push delivery cannot be claimed: client registration and push functions exist, but deployed function, scheduler, credentials, and live receipt handling were not verified.
- Google Play Console product/base-plan existence, licensed tester eligibility, service-account access, and package ownership remain unverified.
- The release signing setup and upload artifact path cannot be audited until the native project is restored from its authoritative local/source-controlled copy or generated in a controlled release environment.

## 5. P2 — safe for testers

- `expo-doctor` masks its nested Expo config failure with exit code zero in this environment. Treat its displayed config error as a failed check until dependencies install cleanly.
- npm emits a deprecated `http-proxy` environment-config warning and peer-resolution warnings while attempting install.

## 6–14. Product area status

| Area | Code-audit status | Evidence/remaining acceptance |
| --- | --- | --- |
| Auth | **Implemented; device acceptance pending** | Email auth, recovery, OAuth callback validation, explicit auth resolution, and conservative error normalization are covered by correctness tests. Live Supabase signup/login/logout/session restoration still require a device and configured redirect URL. |
| Home | **Implemented; device acceptance pending** | Deterministic selectors cover overdue/today/upcoming work, project ranking, real progress, and duplicate suppression. Live data reconciliation needs acceptance testing. |
| Assistant | **Implemented; backend deployment pending** | Contract, retry identity, duplicate prevention, attachments, bounded context, and composer tests pass. `ai-chat` has server-side 10/100 request defaults and uses the canonical usage RPC. Live model, file upload, speech, and Android keyboard behavior remain untested. |
| Projects | **Implemented; device acceptance pending** | Real task linkage, progress, attention, next-action ranking, deadlines, and duplicate protection have passing selector tests. Create/detail/refresh/form flows need device acceptance. |
| Tasks | **Implemented; device acceptance pending** | Execution state, blocker, next action, focus, reminder dates, completion, project invalidation, and attention selectors are tested. Notification tap routing and lifecycle need a device. |
| Studies | **Implemented; device acceptance pending** | Subjects, goals, progress, last session, weekly boundaries, and elapsed-time reconstruction from timestamps are tested. Background/return and note CRUD need live acceptance. |
| Journeys | **Implemented; deployment pending** | Free gating, downgrade preservation, deterministic local-day missions, source selection, and streak derivation pass tests. Server Momentum/RPC idempotency and notification routes require deployed migration and live acceptance. |
| Settings | **Implemented; device acceptance pending** | Truthful plan presentation, permission/readiness state, profile validation, and configured HTTPS legal URLs pass tests. OS settings recovery and logout cleanup need device acceptance. |
| Notifications | **Partially verified** | Local reminder and route validation exist; remote push infrastructure is not proven deployed. Do not represent remote delivery as ready. |

## 15. Free/Premium status

The client and migration agree on Free limits of 3 active projects, 30 open tasks, 3 active study subjects, 10 Assistant requests/day, 2 attachment analyses/day, and 1 active Journey. Premium limits are 100 Assistant requests/day and 20 attachment analyses/day with no practical core-data/Journey cap. Creation caps and AI usage claims are server-side; downgrade gating preserves existing data.

Canonical premium is read from the server subscription row. `has_premium` accepts active, trialing, canceled-paid-through, and grace-period states only before period expiry. On-hold and expired are non-entitled. Unknown/error presentation must remain conservative.

## 16. Stripe status

The webhook and checkout/portal functions exist and write to the canonical subscription model. Compilation, deployed revision, webhook signature secret, webhook endpoint registration, product/price mapping, and a live Web-to-Android entitlement round trip were not verifiable here.

## 17. Google Play status

The client queries subscriptions, reads Play's localized price, requests the configured offer, represents pending purchases, verifies on the backend, finishes/acknowledges only after successful verification, and restores owned purchases. The backend validates authenticated user, package, product, base plan, token, provider response, state, and expiry before updating the canonical row. A canceled subscription remains premium through expiry; grace remains premium; on-hold/expired do not.

Required public build variables:

```text
EXPO_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_ID
EXPO_PUBLIC_GOOGLE_PLAY_BASE_PLAN_ID
```

Required backend secrets (never place these in an `EXPO_PUBLIC_` variable):

```text
GOOGLE_PLAY_SUBSCRIPTION_ID
GOOGLE_PLAY_BASE_PLAN_ID
GOOGLE_PLAY_PACKAGE_NAME=app.vercel.nexora_os_eosin.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

The management/cancellation URL and complete unknown/provider-error device presentation require acceptance testing.

## 18. RTDN status

**Not implemented.** No Pub/Sub/RTDN receiver exists in `supabase/functions`. Tester reconciliation is limited to purchase/restore/manual verification. Configure an RTDN receiver before public release; do not claim real-time cancellation, hold, recovery, renewal, or revocation handling meanwhile.

## 19. Migrations deployed/pending

The required files exist in dependency order:

1. `202608250001_task_execution_foundation.sql`
2. `202608260001_active_studies.sql`
3. `202608260002_monetization.sql`
4. `202608260003_journeys_foundation.sql`

They define RLS-aware canonical data, indexes/triggers/RPCs and additive compatibility changes. Deployment is **unverified/pending confirmation**. From a clean authenticated operator environment:

```bash
supabase login
supabase link --project-ref qoxtwbhpovkxfiambwgz
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

Review the dry run and remote migration list before push; do not repair or replay migration history blindly.

## 20. Edge Functions deployed/pending

`ai-chat`, `stripe-webhook`, and `google-play-subscription` source exists; live deployed revisions are unknown. After setting secrets through the Supabase secret store, deploy exact functions:

```bash
supabase functions deploy ai-chat --project-ref qoxtwbhpovkxfiambwgz
supabase functions deploy stripe-webhook --project-ref qoxtwbhpovkxfiambwgz --no-verify-jwt
supabase functions deploy google-play-subscription --project-ref qoxtwbhpovkxfiambwgz
```

Keep JWT verification enabled for user-invoked `ai-chat` and `google-play-subscription`; the Stripe webhook authenticates by Stripe signature rather than a user JWT. Run authenticated smoke requests and inspect function logs after deployment.

## 21–23. Native dependency, build, and device results

- Expo SDK 54 / React Native 0.81.4 / React 19.1.0 are declared together. Notifications, image picker, document picker, speech, IAP 14.4.1, Nitro modules, and the IAP config plugin are declared.
- Expo scheme is `nexora`; Android application ID is `app.vercel.nexora_os_eosin.twa`; keyboard mode is `resize`; `POST_NOTIFICATIONS` and a `nexora://` intent filter are configured in Expo config.
- `npm install`: **failed**, exact blocker `403 Forbidden - GET https://registry.npmjs.org/react-native-iap`.
- `npm run export`: **failed**, config plugin cannot resolve because the IAP package is unavailable.
- Android build: **not run / blocked**, because `mobile/android/gradlew` does not exist.
- Physical-device acceptance: **not run**, because neither `adb` nor a device is available.

## 24. Files changed during audit

- `mobile/services/play-billing-service.ts`: aligned backend verification package with the real application ID and removed invented localized price fallback.
- `mobile/tests/monetization.test.ts`: regression coverage for package identity and truthful Play price behavior.
- `docs/android-launch-audit-2026-08-26.md`: this evidence-based launch report and operator runbook.

## 25. Tests/results

- `cd mobile && npm run typecheck`: pass.
- `cd mobile && npm run lint`: pass.
- `cd mobile && npm test`: pass (all 111 tests).
- `cd mobile && npm run export`: fail at unresolved `react-native-iap` config plugin.
- `npm run typecheck`: pass at repository root.
- `git diff --check`: pass.
- `cd mobile/android && ./gradlew assembleDebug`: blocked; native directory absent.

## 26. Exact remaining manual configuration

1. Restore the authoritative `mobile/android/` project without deleting or overwriting any local-only setup; confirm generated application ID remains unchanged.
2. Allow/install `react-native-iap@14.4.1` from the approved npm registry and perform a clean lockfile-backed install. Do not use `npm audit fix --force`.
3. Configure the two public Play IDs in the tester build environment and the four backend secrets listed above.
4. Confirm Play Console package, subscription, base plan, service-account Android Publisher permissions, license testers, and tester track.
5. Verify/apply migrations and deploy/smoke-test the three required functions.
6. Configure Supabase native redirect `nexora://auth/callback`, Google OAuth provider redirect contract, Stripe webhook endpoint/signing secret, Expo push credentials, and scheduler/reminder infrastructure.
7. Run the complete 26-step physical-device matrix, including background timing, notification taps, purchase/restore, downgrade/paid-through, logout/login, Metro warnings, and logcat.
8. Implement and validate RTDN before claiming public-release real-time lifecycle support.

## 27. Exact tester-build steps

```bash
git checkout <audited-branch>
cd mobile
npm install
npx expo-doctor
npm run typecheck
npm run lint
npm test
npm run export
cd android
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

For a Play tester artifact, configure release signing outside source control and run the repository's approved Gradle/EAS release path only after the debug artifact and device matrix pass. Upload an AAB whose package is exactly `app.vercel.nexora_os_eosin.twa`, add licensed testers, then validate localized price, pending purchase, purchase, restore, cancellation paid-through, grace, hold, expiry, and manual refresh against the canonical subscription row.

## 28. Final recommendation

**NOT READY FOR TESTER PRODUCTION BUILD.** Resolve the four P0 verification/build blockers first. Even after the core artifact passes, use **CORE APP READY FOR TESTERS — BILLING ACCEPTANCE STILL PENDING** until Play Console purchase/restore/lifecycle acceptance succeeds. Do not use the unconditional production-ready wording until migrations/functions are confirmed deployed, Android builds, physical acceptance passes, and no fake/dead UI is found in that run.
