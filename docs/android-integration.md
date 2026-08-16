# Android, Google Play, and OAuth integration

This guide records the web and external configuration required to distribute NEXORA as an Android Trusted Web Activity (TWA). Never commit OAuth client secrets, signing keys, service-account JSON, or a VAPID private key.

## Identifiers

- **Android package ID:** `app.vercel.nexora_os_eosin.twa`
- **Operational TWA production origin:** `https://nexora-os-eosin.vercel.app`
- **Web start URL:** `/dashboard`
- **OAuth callback:** `/auth/callback`
- **Digital Asset Links relation:** `delegate_permission/common.handle_all_urls`

The TWA production origin uses HTTPS and is currently proven at `https://nexora-os-eosin.vercel.app`. Preserve that exact origin consistently below; custom-domain, `www`, Lovable preview, and other Vercel deployment origins are distinct origins and must not be interchanged by the wrapper or an initial redirect.

## Google Cloud OAuth

1. In Google Cloud Console, configure the OAuth consent screen, application name, support email, privacy policy, terms, and the minimum required scopes (`openid`, email, and profile).
2. Create a **Web application** OAuth 2.0 client for Supabase. Add the Supabase callback shown by **Supabase Dashboard → Authentication → Providers → Google** as an authorized redirect URI. This is usually `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Add the production origin under authorized JavaScript origins when required by the client configuration.
4. Complete Google verification/testing-user configuration before production release. Keep the Google client secret only in Supabase's provider settings.

The browser starts OAuth with a dedicated application callback. Supabase uses Authorization Code Flow with PKCE and restores the persisted session before `/dashboard` is opened.

## Supabase Google provider

1. Enable Google in **Authentication → Providers** and enter the Google web client ID and secret.
2. Set **Site URL** to the canonical production HTTPS origin.
3. Add `https://<production-origin>/auth/callback` to **Redirect URLs**. Add explicit development/preview callbacks only when they are genuinely needed.
4. Keep exact URL spelling, scheme, port, and trailing-path behavior aligned between Supabase and the application.
5. Test success, user cancellation, expired code, refresh, sign-out, and reopening from the installed Android app.

The client enables `flowType: "pkce"`, `persistSession`, `autoRefreshToken`, and `detectSessionInUrl`. Email authentication behavior is unchanged.

## Digital Asset Links and App Links

The repository serves `/.well-known/assetlinks.json` with the Android package and two SHA-256 signing certificate fingerprints. Google Play Console confirmed `C0:5B:11:7A:2A:93:B8:5C:EC:A9:61:3C:76:97:7E:D7:BB:FC:38:09:50:DF:16:65:04:5A:FD:A3:D6:92:AB:3F` as the Play **App signing key** certificate. The earlier `24:11:49:B1:2D:2C:07:5A:E9:00:D8:36:A9:BB:5F:7F:BA:9F:F9:43:71:28:21:70:13:B5:BA:01:96:CD:BF:CD` remains temporarily for compatibility with existing builds. The file must be publicly reachable from `https://nexora-os-eosin.vercel.app/.well-known/assetlinks.json` with no redirect and a JSON content type.

In **Play Console → App integrity / Integridade do app → App signing key certificate**, copy the SHA-256 certificate fingerprint and compare it byte-for-byte with `sha256_cert_fingerprints` in `public/.well-known/assetlinks.json`. For Play installs this is the Play **App signing certificate**, not the upload-key certificate. Never replace it with a locally generated or upload-key fingerprint. Multiple fingerprints are appropriate only when the corresponding certificates really sign delivered installs, such as a documented signing-key rotation. After deployment, verify the relationship with Google's Digital Asset Links API and from an Android device (`adb shell pm get-app-links app.vercel.nexora_os_eosin.twa`).

The Android manifest generated for the wrapper must include a verified HTTPS intent filter (`android:autoVerify="true"`) for the exact production host and appropriate path scope. App Links must stay on the same origin; external links should remain browser links.

## TWA and Google Play

No Android wrapper sources or generated configuration (`AndroidManifest.xml`, Gradle files, `twa-manifest.json`, Bubblewrap, PWABuilder, or `LauncherActivity`) are versioned in this repository. Consequently, this tree can validate the web half but cannot prove the installed wrapper's `defaultUrl`, host, intent filter, Custom Tabs fallback, target API, or signing configuration. Inspect the existing wrapper project rather than generating a replacement identity.

1. Generate the Android wrapper with Bubblewrap (or an equivalent maintained TWA tool) using the production manifest URL.
2. Confirm package ID `app.vercel.nexora_os_eosin.twa`, start URL `/dashboard`, host, display mode, icons, colors, and signing setup.
3. Build and test a signed Android App Bundle. Confirm the TWA has no browser toolbar after Digital Asset Links verification and that offline navigation displays the safe fallback.
4. In Play Console, enable Play App Signing, upload the bundle through an internal test track first, and copy the Play **App signing certificate** SHA-256 fingerprint back into the asset-link verification process.
5. Complete store listing, screenshots, feature graphic, privacy/data-safety disclosures, content rating, target API requirements, app access instructions, and testing requirements.
6. Promote releases manually after internal/closed testing. This repository does not automate Play publication.

## Web app manifest

`manifest.webmanifest` declares the `/dashboard` start URL, root scope, standalone-capable display fallbacks, link handling, launch behavior, wide/narrow screenshots, and dedicated maskable artwork. Confirm every referenced image remains publicly available and its declared dimensions stay accurate.

## Push notifications

Push permission must be requested only after a clear user action. The web helper:

1. checks Notification, Service Worker, and PushManager support;
2. requests explicit permission;
3. registers `/sw.js` at root scope; and
4. reads an existing PushManager subscription without silently creating one.

To finish push delivery externally:

- Generate a VAPID key pair in protected infrastructure. Expose only the **public** VAPID key to the browser; store the private key in a server-side secret manager.
- On an explicit opt-in action, call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then transmit the resulting subscription to an authenticated server endpoint.
- Associate subscriptions with the authenticated user, validate input, apply authorization/rate limits, expire stale endpoints, and provide unsubscribe/delete controls.
- Send payloads from trusted server infrastructure. Keep payloads minimal and non-sensitive because notification content can appear on a lock screen.
- Configure Play/store privacy and data-safety disclosures for notification identifiers and any related personal data.

The service worker validates notification navigation against the web app origin, focuses an existing window when possible, and otherwise opens the safe `/dashboard` fallback. Its runtime cache is restricted to successful same-origin static assets; authentication and API responses are not cached.

## Remaining external checklist

- [ ] Confirm `https://nexora-os-eosin.vercel.app` serves Digital Asset Links directly without redirecting to another origin.
- [x] Record the Play-confirmed App Signing fingerprint in Digital Asset Links while retaining the previous fingerprint temporarily.
- [ ] Configure and publish the Google OAuth consent screen.
- [ ] Configure Google credentials in Supabase and allow the production callback.
- [ ] Verify the Play App Signing fingerprint against deployed Digital Asset Links.
- [ ] Configure the Android verified-link intent filter and test with `adb`.
- [ ] Generate/sign the TWA bundle and complete Play Console requirements.
- [ ] Provision server-side push storage/sending and protected VAPID secrets.
- [ ] Run OAuth, installability, offline, App Links, notification, and Play internal-track tests on physical Android devices.

## Final Play-distribution verification

The checked-in web association is only one half of TWA verification. Before tester distribution,
open **Google Play Console → Setup → App integrity → App signing** and compare the SHA-256 value
under **App signing key certificate** (not **Upload key certificate**) byte-for-byte with the first
fingerprint in `public/.well-known/assetlinks.json`. Then inspect **Grow → Deep links** (or the
current Play Console equivalent) for the production host and resolve any association warning.

Deploy the web project before testing. Confirm `/.well-known/assetlinks.json` on the production
host returns HTTPS 200 directly, without a redirect, with `Content-Type: application/json`, and
with the checked-in JSON body. Google's verifier can cache association results, so allow for
propagation, reinstall or update from the Play test track, and test the Play-signed install rather
than a locally signed APK.

If the distributed wrapper already targets `https://nexora-os-eosin.vercel.app/dashboard` with
package `app.vercel.nexora_os_eosin.twa`, deploying the web association is sufficient and no new
AAB is required. If its generated Android manifest/default URL uses any other origin, package,
protocol, or path scope, correct that existing wrapper, increment its version, and publish a new
AAB while retaining the Play identity. Browser chrome must never be hidden with CSS, JavaScript,
or fullscreen APIs; it disappears only after the browser verifies Digital Asset Links.
