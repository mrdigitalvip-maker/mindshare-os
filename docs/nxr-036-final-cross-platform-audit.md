# NXR-036 — R14 final cross-platform code audit

## Scope and baseline

Audit baseline: `a45449c61ba92b8660710722ad7e8d331703bdac` (the requested PR #146 baseline). This is an Android release-code gate and a Web **compatibility** audit, not a claim that the future Web redesign is launched.

Native routes audited: auth (sign in/sign up, callback, recovery, reset), onboarding, dashboard, assistant/chat, productivity/task detail, projects/list/detail, studies/list/detail/session, journeys/list/detail, packs/list/detail, Arena, Community/channels/Squads, Premium, Settings, and every Creator route (home, setup, profile, pillars, strategy, Academy, goals, ideas, Hook Lab, Copilot, library, import/project clips, analytics, and map). Web routes audited: auth/callback/confirmation/reset, onboarding, protected shell/dashboard, assistant, agents, projects, productivity, studies, journeys, packs, Arena, Community/Squads, Premium, Settings, Content, Documents, Finance, Translate, Studio, and Creator Growth.

## Findings and code disposition

- **Native auth:** Google, sign-up confirmation, and recovery already select the fixed `nexora://auth/callback`; PKCE exchange, legacy token callback compatibility, strict URL parsing, destination allowlisting, in-memory fingerprint dedupe, recovery type/user binding, identity cache clearing, and cold/warm `useURL` handling remain intact. Ordinary callbacks cannot manufacture recovery. The simple `Linking.openURL` implementation is code-safe but is not a managed browser session. An Expo-compatible `expo-web-browser` install was attempted and registry/Expo metadata access failed; no lockfile was fabricated. `expo-web-browser` compatible with Expo SDK 54 must be installed with `npx expo install expo-web-browser`, then the flow must be physically retested.
- **Web auth:** Google, confirmation, and password recovery now resolve only fixed routes against `window.location.origin`. No query parameter can choose an auth destination. Browser and native destinations are isolated. Web callback PKCE exchange is once-per-code and clears credential-bearing parameters. Protected routes wait for auth and canonical profile hydration, preventing protected-content flashes.
- **Production truth:** `VITE_DEMO_MODE=true` can no longer enable fixtures in a production Vite build. Missing Supabase configuration and backend failures therefore fail closed. Explicit development demo behavior remains available.
- **Canonical identity/data:** both clients read `profiles`; protected Web onboarding and display state use that profile. Projects, tasks, studies, journeys, Community and Creator clients target the shared Supabase schema. Creator manual records retain explicit manual provenance. Premium reads the authoritative `subscriptions` row. No parallel task/profile schema was introduced.
- **Product surfaces:** Home/Daily Mission, Assistant/Action Engine, Projects, Tasks, Studies duplicate prevention, Journeys/reward idempotency, Momentum, Arena disclosure, Community reliability/realtime, Squads, Premium, Settings/language lifecycle, notifications, and Creator standalone flows retain their existing R1–R14 service contracts and focused regression coverage. Expected missing/invalid entities use null/error states rather than invented records. No historical data was deleted.
- **Creator/Viral Clips:** native code supports selection, canonical project creation, private owner-path upload, enqueue, job polling/state, cancellation, restart/rerender, persisted clips, and short-lived signed outputs. Worker code covers claim/lease, transcription, analysis/scoring, caption/render stages, and persistence. Runtime completion still requires deployed migrations/storage/functions/worker, Docker/FFmpeg and `OPENAI_API_KEY`; resumable large upload and native preview/save/share dependencies remain truthful blockers. The current Web Creator surface is the legacy Creator Growth workspace, not full native Creator Center parity; completing that broad UI is a remaining repository product gap, so R14 code is **not declared complete** by this audit.
- **Backend:** migration history through `202609040006` was inspected without editing historical migrations. Creator tables use ownership columns, foreign keys, uniqueness/indexes, RLS, private storage policies and security-definer RPC search paths. Existing user-owned feature migrations bind access to `auth.uid()`. No new schema defect requiring `202609040007` was established, so no speculative migration was added. Edge functions authenticate callers (or validate provider callbacks), constrain CORS/errors, avoid returning secrets and perform ownership checks. `ai-chat` contains current NEXORA identity/action/context and Creator Copilot semantics but still requires deployment in the Terminal phase.
- **Release config:** package `app.vercel.nexora_os_eosin.twa` and scheme `nexora` are correct. Version values, icons, signing and launcher resources were untouched. No EAS project ID exists and none was invented.

## Terminal/Supabase checklist

All items below are **CODE_READY_CONFIG_PENDING**, not physically verified:

1. Add `nexora://auth/callback` to Supabase Auth redirect URLs and verify Google and email templates preserve the requested redirect.
2. Obtain the authoritative deployed Web origin; allow exactly `<WEB_ORIGIN>/auth/callback`, `<WEB_ORIGIN>/confirm-email`, and `<WEB_ORIGIN>/reset-password`. Do not use wildcards or accept a client-supplied destination.
3. Verify the Supabase Google provider credentials/configuration remotely; keep client secrets out of Android and source control.
4. Apply pending migrations in order through `202609040006`; no remote migration was applied here.
5. Deploy and smoke-test current `ai-chat`, `push-send`, Creator OAuth/sync functions, storage buckets/policies, Creator worker and Creator Intelligence service.
6. Supply the real `OPENAI_API_KEY` through runtime secrets; configure Docker/FFmpeg worker runtime. Social provider credentials remain optional.
7. Run `npx expo install expo-web-browser` and `npx expo install expo-clipboard` with working registry access. Resolve exact Expo SDK 54 versions through Expo rather than pinning guessed versions.
8. Obtain the canonical EAS `projectId`, then validate push token registration/remote delivery. Do not invent it.
9. Resolve the documented Creator native resumable-upload/preview/save-share packages (`tus-js-client`, `expo-video`, `expo-file-system`, `expo-sharing`) through Expo-compatible installation where applicable.
10. On physical Android v6 install, test Google success/cancel/provider failure, confirmed/unconfirmed email, expired/duplicate confirmation, valid/expired/wrong-type recovery, cold start, warm app, rapid duplicate taps, notification cold start, background/foreground, network loss, refresh, account switch and logout. Confirm browser closes/relinquishes control and no second Web login occurs.
11. Confirm launcher icon/resources from the signed Play artifact; then separately decide version bump, signing and AAB generation.
12. Complete the Web Creator Center compatibility UI before declaring all R14 code complete; current Web remains compatibility-only and is not official Web launch readiness.

## Security/no-fake conclusion

No credential value, service-role key, OAuth secret, signing material or access/refresh token was added. Production demo identity/data is prohibited at build time. Automated contracts cover fixed auth origins, callback secrecy/dedupe, cache isolation, recovery binding, canonical profile parity, routed product surfaces, authoritative subscriptions, Creator manual provenance and release identity.
