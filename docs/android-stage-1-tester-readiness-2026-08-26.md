# NEXORA Android Stage 1 tester readiness — 2026-08-26

Baseline audited: `d1df4ff555a1c7d3a9b750a2f7890d32385fcc4e` on branch `work`.
This is a code-validation record, not physical Android acceptance or a deployment claim.

## Ready now in source

- The core app, Auth, Home, Assistant, Projects, Tasks, Studies, Journeys, Settings,
  Notifications and Premium routes do not import Play Billing during startup.
- Canonical entitlement continues to come from the backend `subscriptions` row. A valid
  Premium entitlement remains Premium regardless of purchase capability or provider.
- Free users remain Free. Project, task, study, Journey and Assistant limits remain
  server-authoritative; downgrade gates new activation/creation and does not delete data.
- Android package `app.vercel.nexora_os_eosin.twa` and Expo scheme `nexora` are unchanged.

## Intentionally disabled for this tester build

Initiating or restoring a Google Play subscription is unavailable. The capability is
explicitly `unavailable_for_tester_build`; the Premium screen shows no purchase action,
price, renewal claim, trial claim or synthetic activation. `react-native-iap`,
`react-native-nitro-modules`, and the IAP Expo plugin are deferred so the core app does
not need NitroModules to boot.

The Google Play verification Edge Function, subscription schema, provider fields,
package contract, and Stripe architecture remain preserved for later activation.

## Future billing activation

In a dedicated billing stage:

1. Add Expo/React-Native-compatible `react-native-iap` and its required Nitro dependency
   from an accessible npm registry, restore the Expo config plugin, and implement a
   native adapter loaded only behind an enabled capability boundary.
2. Configure the Play Console subscription and base plan, licensed test track, Android
   Publisher service account, package/product/base-plan secrets, purchase verification,
   and RTDN lifecycle reconciliation.
3. Physically accept localized product retrieval, pending/canceled purchase, verified
   activation, restore, renewal, grace, hold, expiry, acknowledgment and relaunch.

The earlier npm `403` was a registry/environment access failure while fetching the
public package URL, not evidence that billing could safely initialize. Dependency
availability should be rechecked from the approved build environment during that stage.

## Backend operator runbook

Migration dependency order is task execution, active Studies, monetization, then
Journeys. Existing history must not be rewritten. Deployment is unverified.

```bash
supabase login
supabase link --project-ref qoxtwbhpovkxfiambwgz
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

**Required now:** deploy and smoke-test `ai-chat` for Assistant. If tester flows enable
remote push, also deploy/configure `push-send` and `scheduled-reminders`. Stripe webhook,
checkout and portal functions are required only for an actually enabled Web Stripe flow.

**Future billing only:** `google-play-subscription`, Play service-account secrets and
RTDN. The Stage 1 mobile app does not invoke them.

## Physical Android acceptance (still required)

### Dev build with Metro over LAN

```bash
cd mobile
npm install
npx expo start --dev-client --lan
```

Install/open the authoritative local Android dev build on the same LAN and select the
Metro session. Do not regenerate `mobile/android` merely to perform this check.

### Standalone / release-like build

From the authoritative native project, use the repository/operator-approved signed EAS
or Gradle build path with a packaged JS bundle, install the resulting APK/AAB track build,
stop Metro, enable airplane mode briefly, and cold launch to prove Metro is not required.

For both builds: install/update; cold launch; confirm no NitroModules or red React Native
screen; log in; visit Home, Assistant, Projects, Tasks, Studies, Journeys, Settings and
Premium; deny notifications and confirm survival; grant them and test the supported
flow; background/restore; kill/relaunch; logout/login; verify a Free account stays Free;
verify backend Premium stays Premium; verify Premium has no purchase CTA or fake price;
then inspect `adb logcat` for fatal native/module exceptions.

Do not claim Stage 1 acceptance until this physical matrix passes.
