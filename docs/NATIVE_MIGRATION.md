# NEXORA native mobile migration

## Decision record

NEXORA Mobile is a parallel, true React Native client under `mobile/`. The TanStack Start web
application in `src/`, its PWA in `public/`, Vercel configuration, and all existing browser flows
remain supported. Mobile must never import a web route or component and must not use a WebView,
TWA, Capacitor, or browser rendering.

Phase A establishes the Expo foundation only. A feature is not considered migrated until its
native UI, real backend operation, persistence after reload, and recoverable error state have been
verified.

## Repository inventory

### A — directly reusable

| Area                  | Existing source                                                             | Use                                                                      |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Database types        | `src/integrations/supabase/types.ts`                                        | Copy/generate into mobile until a genuinely shared package is justified. |
| Query-key conventions | `src/hooks/dashboard/query-keys.ts`, `src/services/workspace-query-keys.ts` | Recreate as platform-neutral constants.                                  |
| Domain contracts      | Types in `src/services/*`                                                   | Reuse interfaces that do not reference DOM or web navigation.            |
| Pure rules/helpers    | Capability, entitlement, validation, and formatting helpers                 | Extract only when both clients consume the same implementation.          |

### B — reusable with native adaptation

| Area             | Existing source                                                          | Required adaptation                                                                |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Supabase         | `src/lib/supabase.ts`, `src/services/supabase-service.ts`                | Expo public env names, SecureStore auth adapter, AppState-driven token refresh.    |
| Authentication   | `src/lib/auth-context.tsx`, `src/services/auth-service.ts`               | Native forms, deep-link callback parsing, no `window.location` or localStorage.    |
| AI/chat          | `src/services/ai-service.ts`, `src/hooks/use-chat.ts`                    | Platform-neutral timeout, native query hooks, native message list/composer.        |
| Workspaces       | `src/services/workspace-services.ts`                                     | Retain table contracts; provide feature-scoped native hooks and errors.            |
| Profile/settings | `src/services/profile-service.ts`, `src/services/settings-service.ts`    | Native controls, permissions, and AsyncStorage preferences.                        |
| Subscription     | `src/services/subscription-service.ts`, `subscription-status-service.ts` | Read entitlement cross-platform; replace native purchase flow with store provider. |
| Notifications    | `notification-service.ts`, `push-service.ts`                             | Keep in-app records; replace browser enrollment with Expo Notifications.           |
| Voice            | `voice-provider.ts`                                                      | Keep backend invocation; replace Web Speech with native recording/playback.        |

### C — web-only and replaced on mobile

- TanStack Router routes, links, browser history, and generated route tree.
- Radix components, HTML elements, CSS/Tailwind classes, browser SVG behavior, and DOM events.
- `window`, `document`, `navigator`, `localStorage`, and `sessionStorage` integrations.
- `public/sw.js`, web manifest installation, Notifications API, PushManager, and VAPID enrollment.
- Browser SpeechRecognition, speech synthesis, keyboard shortcuts, media queries, and visibility APIs.
- Stripe Checkout/Portal redirects and PWA/TWA install or launch behavior.

Native replacements are Expo Router, React Native primitives and performant lists, Safe Area
Context, Gesture Handler, Reanimated, SecureStore, AsyncStorage, Expo Linking, Expo Notifications,
native audio APIs, and `react-native-svg`.

### D — shared backend unchanged

- The existing Supabase project, migrations, database tables, RLS policies, and generated contract.
- `ai-chat`, `agent-run`, and compatible `nexora-voice` Edge Functions.
- Web Stripe checkout, portal, webhook, entitlement tables, and server-held secrets.
- Current web push sender/scheduler and web subscriptions while a compatible device model is added.

No second Supabase project or duplicate mobile schema is permitted. OpenAI, ElevenLabs, Stripe
secret, and Supabase service-role keys remain server-side.

## Target mobile structure

```text
mobile/
  app/                 Expo Router routes and route groups
  components/          native reusable UI and error states
  features/            auth, nexora, chat, projects, tasks, studies, settings, subscription
  hooks/               cross-feature native hooks
  lib/                 Supabase, networking, theme, diagnostics
  providers/           bounded application providers
  services/            backend contracts without UI
  types/               mobile/domain declarations
```

## Android identity gate

Repository release documentation records `app.vercel.nexora_os_eosin.twa` as the existing Play
listing identity and records the Play-confirmed app-signing certificate. The native successor keeps
that same package ID so it can replace the TWA in the same listing; the consumer-facing name remains
NEXORA. The technically awkward legacy identifier is intentionally not renamed. Before production
signing, the owner must still verify Play Console access and the upload-key/EAS credential path:

1. retain the legacy package and upload a native AAB signed through the existing Play App Signing
   relationship; or
2. configure EAS or local release signing with an upload key accepted by that listing.

No signing key is committed, generated casually, or substituted for the Play app-signing key.

## Authentication and deep links

The native Supabase client reads only `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Its custom storage adapter places the small persisted auth
session in SecureStore. Supabase restores and refreshes sessions, while React Native AppState starts
or stops automatic refresh. Expo Router handles `nexora://` paths including dashboard, projects,
project detail, studies, and study detail. Password recovery redirects to
`nexora://auth/callback?next=/auth/reset-password`.

Future HTTPS universal/app links require an owned production domain, Android `assetlinks.json`, iOS
Associated Domains, and final package/bundle identities.

## Notifications

Web push stays intact. A later incremental migration should generalize device registrations with:
`user_id`, `platform` (`web`, `android`, `ios`), `provider` (`webpush`, `expo`, `fcm`, `apns`),
encrypted-or-protected `token`/endpoint material, stable installation `device_id`, timestamps, and a
disabled/revoked state. Uniqueness should apply per provider/device, not per user, so one account can
own multiple devices. Expo permission is requested only after an explicit user action; the obtained
token is persisted through an authenticated backend contract. Web VAPID fields and delivery remain
supported rather than destructively transformed.

## Billing risk and provider boundary

Stripe remains the web billing provider and subscription tables remain entitlement authority.
Google Play-distributed digital access may require Play Billing; sending Android users to browser
Stripe checkout may violate store policy. Native purchase controls must not ship until the product,
region, listing, and current Play policy are reviewed. The planned `SubscriptionProvider` exposes
entitlement observation, products, purchase, restore, and management operations, with separate web
Stripe, Android Play Billing, and future StoreKit implementations. Phase A does not fake premium.

## Voice strategy

Text chat is independent and comes first. `nexora-voice` continues to authenticate and protect the
ElevenLabs key. Native voice later requests microphone permission in context, records through an
Expo-compatible audio module, sends audio to an authenticated transcription/backend contract, and
plays backend audio with a native player. Browser SpeechRecognition is not reused. The exact
speech-to-text/native module must be verified against the selected Expo SDK and development-build
requirements before installation.

## Phases and exit gates

1. **A — Foundation:** Expo Router, theme, Supabase, native auth/session/deep links, Query provider,
   screen-state components, diagnostics, and application error boundary. Exit: install, TypeScript,
   lint, Expo Doctor, and static export pass with configured public test values.
2. **B — Dashboard/NEXORA:** native dashboard and SVG agent states. Exit: authenticated reload and
   all visual states verified on Android sizes.
3. **C — Chat:** conversation history, composer, authenticated `ai-chat`, persistence, retry. Exit:
   a real response survives reload.
4. **D — Projects/Tasks:** full native CRUD, linkage, progress, complete/reopen, and list states.
5. **E — Studies:** subjects, goals, sessions, and notes using existing tables.
6. **F — Settings/Notifications:** native settings, permissions, multi-device registration/send path.
7. **G — Subscription:** policy-approved native provider and verified entitlement reconciliation.
8. **H — Android production:** resolve identity, prebuild, Android Studio, debug APK, signed AAB,
   privacy/permission review, deep-link verification, and manual Play Console checklist.

## Current blockers and manual decisions

- This checkout has no Git remote and no local `main`; origin synchronization cannot be performed.
- Package identity and Play app-signing certificate are recorded; the accepted upload key and EAS
  credential ownership still require operator access.
- Live Supabase public configuration and a non-production test account are needed for auth E2E.
- Expo/EAS project ownership and Android signing credentials are unavailable.
- Expo/EAS project ownership is required to issue native push tokens; mobile billing products are
  not yet defined.
- External package installation is blocked by the current registry policy; generated dependency
  lockfiles and Expo build validation must be completed once registry access is available.

## Correctness pass status

The native client now uses an explicit three-state auth resolver and keeps profile/onboarding errors
local instead of interpreting them as logout. The dashboard renders the single NEXORA agent and
uses real native routes. Assistant invokes the authenticated `ai-chat` function, restores the latest
persisted history, preserves a failed draft, and offers local retry. These flows still require live
Supabase credentials and physical-device validation before they can be called complete.

Native push registration is user initiated and uses Expo Notifications. A new additive
`push_devices` migration supports native provider/device tokens without changing existing
`push_subscriptions` or web VAPID behavior. Deployment of the migration and an Expo/EAS project ID
are required before registration can succeed. Provider-neutral dispatch now preserves webpush while
also sending to enabled Expo device registrations.

The Android package now deliberately retains `app.vercel.nexora_os_eosin.twa`, matching the existing
Play listing and its repository-recorded Play signing evidence. The application name remains NEXORA.
Production signing still requires the existing listing's accepted upload key through EAS or local
credentials; no key is invented or committed.

## Functional core pass

Projects, project workspaces, project task mutations, Productivity filters, and Studies subject
workspaces now use the existing Supabase tables. Their React Query mutations invalidate both global
and owning workspace keys so project progress and task lists converge without manual reload. Study
goals, sessions, and notes use the existing study schema and owner-scoped RLS.

`push-send` now dispatches to both the unchanged webpush subscriptions and enabled Expo devices,
returns accepted/failed counts, and disables a native token when Expo reports
`DeviceNotRegistered`. Scheduled reminders already call `push-send`, so the same deduplicated,
timezone/quiet-hours-aware reminder now reaches registered web and native devices without a second
scheduler path. Settings exposes real registration and authenticated test-delivery actions.

The environment still denies npm registry downloads with HTTP 403, so Expo dependencies cannot be
installed here. Expo Doctor, Android export, prebuild, Android Studio/Gradle sync, debug APK, AAB,
and physical-device validation are therefore pending rather than claimed. Run `npm install`,
`npx expo-doctor`, `npx expo export --platform android`, and only then
`npx expo prebuild --platform android` when registry access is available. EAS also requires an
authenticated account and `eas init`; no project ID is invented.
