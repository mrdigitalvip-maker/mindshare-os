# Android, Google Play, and OAuth integration

This guide records the web and external configuration required to distribute NEXORA as an Android Trusted Web Activity (TWA). Never commit OAuth client secrets, signing keys, service-account JSON, or a VAPID private key.

## Identifiers

- **Android package ID:** `app.vercel.nexora_os_eosin.twa`
- **Web start URL:** `/dashboard`
- **OAuth callback:** `/auth/callback`
- **Digital Asset Links relation:** `delegate_permission/common.handle_all_urls`

The production web origin must use HTTPS. Use that exact origin consistently below; preview and production origins require separate allow-list entries.

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

The repository serves `/.well-known/assetlinks.json` with the Android package and production SHA-256 signing certificate fingerprint. It must be publicly reachable over HTTPS with no redirect and a JSON content type. Do not place authentication or CDN challenges on this path.

After deployment, verify it with Google's Digital Asset Links API and from an Android device (`adb shell pm get-app-links app.vercel.nexora_os_eosin.twa`). If Google Play App Signing uses a different certificate than local/upload signing, the fingerprint in `assetlinks.json` must be the **App signing certificate** fingerprint. Add all currently valid production fingerprints only when a signing-key rotation requires it.

The Android manifest generated for the wrapper must include a verified HTTPS intent filter (`android:autoVerify="true"`) for the exact production host and appropriate path scope. App Links must stay on the same origin; external links should remain browser links.

## TWA and Google Play

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

- [ ] Confirm the canonical production domain and HTTPS deployment.
- [ ] Configure and publish the Google OAuth consent screen.
- [ ] Configure Google credentials in Supabase and allow the production callback.
- [ ] Verify the Play App Signing fingerprint against deployed Digital Asset Links.
- [ ] Configure the Android verified-link intent filter and test with `adb`.
- [ ] Generate/sign the TWA bundle and complete Play Console requirements.
- [ ] Provision server-side push storage/sending and protected VAPID secrets.
- [ ] Run OAuth, installability, offline, App Links, notification, and Play internal-track tests on physical Android devices.
