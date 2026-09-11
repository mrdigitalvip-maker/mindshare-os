# KIVRYN-002A — Android identity handoff

This repository now declares the definitive Google Play application ID `kivryn.app` and public
custom scheme `kivryn`. The native Android project is intentionally absent from version control;
KIVRYN-002B must reconcile the generated/local project before any release artifact is built.
No keystore, EAS credential, OAuth credential, secret, Firebase project, binary asset, or production
build was created or changed in this stage.

## EAS decision pending

`expo.extra.eas.projectId` remains `307c1e13-5eb2-41fc-99ea-27f2ef392ff7`. Do not replace it until
Bruno decides whether the existing EAS project will be reused or a new KIVRYN project will be
created. The Expo slug also remains `nexora-native`: changing the slug while the existing project ID
is linked could make the repository metadata inconsistent with the EAS project. After that decision,
inspect the project with authenticated EAS tooling and either retain both linkage values or perform
the supported EAS relink workflow; do not edit either value speculatively.

## OAuth manual actions

The versioned mobile flows use the single callback `kivryn://auth/callback` for Google OAuth,
sign-up confirmation, and PKCE callback consumption. Password recovery adds
`?next=%2Fauth%2Freset-password`. No client ID is stored or invented here.

Before device validation:

1. Add `kivryn://auth/callback` to the Supabase Auth redirect URL allow-list.
2. Confirm the Supabase Google provider remains configured with the provider callback URL shown by
   Supabase; do not substitute the app deep link for Google's Supabase callback endpoint.
3. Confirm Google OAuth consent/client configuration appropriate to the selected Supabase project
   and Android app. Create or update credentials manually only from verified console values.
4. Exercise Google sign-in, email confirmation, cold- and warm-start PKCE callbacks, recovery, and
   rejected malformed callback paths on a physical/internal-test build.
5. Retire `nexora://auth/callback` from external allow-lists/templates only after any intended legacy
   build compatibility window ends.

No versioned `makeRedirectUri` call or Google client ID was found. Callback validation remains in the
shared parser and accepts only the configured custom-scheme callback shape or the web callback on
the trusted web origin.

## FIREBASE MANUAL ACTIONS

No tracked `google-services.json` or versioned Firebase Android configuration was found, and no
placeholder was created. Once the Android app `kivryn.app` is available in Firebase, Bruno must:

1. Open the intended Firebase project and register a new Android app whose package name is exactly
   `kivryn.app` (or verify that this exact registration already exists).
2. Add the real SHA-1 and SHA-256 fingerprints for every required signing context, especially the
   Google Play **App signing** certificate and, only where needed for local testing, the local debug
   or upload certificate. Do not generate or guess fingerprints.
3. Enable/configure the Firebase products actually used by the app and verify Google sign-in support
   against the chosen Google Cloud/Firebase project; do not enable unrelated services by assumption.
4. Download the generated `google-services.json` for `kivryn.app` and place it locally at
   `mobile/android/app/google-services.json`. Never copy the old package's file or commit secrets
   without an explicit repository policy decision.
5. Verify the local Gradle Google Services plugin setup, rebuild locally, and inspect the merged
   resources/manifest to confirm the file resolves to `kivryn.app`.
6. If Firebase Cloud Messaging is used, configure the real FCM/Expo push credentials through the
   approved secret/credential channel and validate token registration and delivery on the new app.

## LOCAL NATIVE CHANGES REQUIRED

Because `mobile/android` was not inspected and is not tracked, every item below is **verify locally**
in KIVRYN-002B rather than a claim about current file contents:

- `mobile/android/app/build.gradle`: set/verify `android.defaultConfig.applicationId` as
  `kivryn.app`; set/verify `android.namespace` as `kivryn.app` where the Android Gradle Plugin uses it.
- Local `AndroidManifest.xml` files (main and build variants): verify there is no stale explicit
  package and update any explicit custom-scheme data entry from `nexora` to `kivryn`.
- `MainActivity.java`/`.kt` and `MainApplication.java`/`.kt`: update package declarations/imports if
  they use the old application namespace, and move them to the matching `kivryn/app` Java/Kotlin
  source directory when applicable.
- All Java/Kotlin source directories and package declarations: search for the old application ID and
  reconcile generated code without broad renames of unrelated internal `nexora` keys.
- Generated/native deep-link intent filters: regenerate from Expo config or manually verify they
  handle `kivryn://auth/callback`, including cold and warm launch behavior, and no longer advertise
  `nexora` unless legacy coexistence is explicitly required.
- `mobile/android/app/google-services.json`: install only the genuine Firebase file registered for
  `kivryn.app`, as described above.
- Gradle application variants, instrumentation tests, providers/authorities, ProGuard rules, and any
  package-derived resource identifiers: search and verify locally for the old application ID.
- Clean generated build output only through the normal local build workflow, then inspect the merged
  manifest/application ID before building an internal test artifact. Do not generate a keystore or
  replace EAS credentials in this handoff.

## Versioned legacy and follow-up references

Historical audit documents retain the old package and `nexora://` values because they describe prior
releases and are not active configuration. Internal storage/database/RPC identifiers containing
`nexora` are intentionally unchanged.

`public/.well-known/assetlinks.json` and `scripts/check-pwa.mjs` still describe and validate the
legacy TWA association. They must not be pointed at `kivryn.app` while carrying unverified
certificate fingerprints. After obtaining the new Play listing's real App signing SHA-256, update
(or deliberately coexist with) the Digital Asset Links statement and its check, deploy it, and test
the association. This is a known manual dependency, not an assertion that the old package belongs
to the new listing.

The existing icon paths retain `nexora` in their filenames intentionally: binary assets and paths
were left untouched to preserve build behavior during this identity-only stage.
