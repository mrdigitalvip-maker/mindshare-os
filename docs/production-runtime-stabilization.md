# Production runtime stabilization runbook

## Baseline and scope

The repository snapshot used for this operation was `9a8d62d`. The supplied checkout had no
`origin` remote and no local `main` ref, so fetching and verifying `origin/main` was not possible.
The work therefore branches from the newest supplied merge commit. No TWA/Digital Asset Links
files were changed.

The TanStack root `errorComponent` in `src/routes/__root.tsx` produced **“Um pequeno
imprevisto”**. It receives uncaught render errors, route lifecycle errors, and unhandled errors
promoted by the router. RC React Query calls do not use suspense or `throwOnError`; the shared
client now makes that recovery contract explicit. Primary RC routes already render local loading,
empty, error/retry, and success states. The protected shell keeps profile failures local rather
than redirecting them.

## Source findings and corrections

- Initial auth restoration overwrote provider state even when `getSession()` reported a temporary
  storage/network error. It now preserves listener-delivered session state; only a confirmed absent
  session drives the `/auth` redirect. Profile loading and profile failure do not imply logout.
- The global boundary forwarded only Lovable-preview telemetry and offered no tester correlation.
  Runtime failures now receive an `NX-XXXXXX` reference and safe, best-effort authenticated
  persistence. Window errors and unhandled promise rejections use the same service.
- The vector renderer accepted `NaN` amplitude and trusted a runtime state despite TypeScript being
  erasable. Amplitude and state are now normalized. Dashboard microphone startup/error paths also
  always restore the agent to idle, leaving text entry available.
- Dashboard and Assistant chat send `{ action, message, conversationId, requestId }`; `ai-chat`
  consumes those exact camel-case fields and returns `{ ok, data: { conversationId, userMessage,
assistantMessage, capabilities, action? } }`. Authorization is supplied by Supabase Functions
  invoke. Persistence uses `ai_conversations`, `ai_messages`, and `ai_usage`. A live response was
  **not** observable without a real authenticated test account and deployed provider environment.
- Projects, Productivity, Studies, study/project workspaces, Settings, and Premium already keep
  query/mutation failures in route UI or toasts. Their identifiers are auth/param enabled before
  service calls, and list rendering uses empty-array normalization. Studies secondary queries wait
  for the owned subject. No query loader, `ensureQueryData`, suspense, or blind retry loop was found.
- Push test success requires `delivered >= 1`; HTTP 200 with zero accepted subscriptions is treated
  as a local failure. The browser requires `VITE_VAPID_PUBLIC_KEY`; a Supabase secret named
  `VAPID_PUBLIC_KEY` does not provide it to Vercel.

## Safe runtime diagnostics

Apply `202608160001_runtime_errors.sql`. Authenticated clients can insert only rows whose
`user_id = auth.uid()` and cannot select telemetry through the public API. Service-role/dashboard
administrators can inspect it. Captured context is deliberately allow-listed: route/module,
reference, boundary/operation/query key, timestamp/version, connectivity, user agent, and session
presence. Tokens, keys, authorization headers, passwords, profiles, and chat content are excluded.
Anonymous initialization failures remain console/Lovable-visible because permitting anonymous
database inserts would create an abuse endpoint.

## Required production environment

Vercel frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DEMO_MODE=false`
- `VITE_VAPID_PUBLIC_KEY` for push enrollment
- optional `VITE_PUBLIC_SITE_URL`, `VITE_APP_VERSION`, or `VITE_COMMIT_SHA`

Supabase Functions additionally require the existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`; voice needs `ELEVENLABS_API_KEY` and
`ELEVENLABS_VOICE_ID_NEXORA`; push needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
and scheduled delivery needs `SCHEDULER_SECRET`. Never expose the private VAPID key in Vercel.

## Authenticated chat test (browser DevTools)

1. Deploy the migration and current `ai-chat`, then sign into the production app normally.
2. In DevTools Network, preserve the log and send a unique text-only message from Dashboard.
3. Confirm `POST .../functions/v1/ai-chat` carries a Bearer header (do not copy it into reports),
   request action `send`, and returns HTTP 200 with `ok: true`, a conversation ID, and a real
   assistant message.
4. Confirm the assistant message renders, the history list updates, then reload and reopen that
   conversation. Send a follow-up and verify both messages persist.
5. Inspect function logs by request ID only. Never record message bodies or auth headers.

## Deployment and remaining acceptance

```sh
supabase migration list
supabase db push
supabase functions deploy ai-chat --project-ref qoxtwbhpovkxfiambwgz
```

No Edge Function source changed in this patch, so function deployment is optional unless deployed
source differs from this checkout. Physical validation is still mandatory on three devices: cold
session restore; first-entry Dashboard → Projects → Productivity → Studies → Settings → Premium;
real chat response and persistence; mic denied/unavailable; voice text-only fallback; normal, slow,
offline, and restored networks; and a push whose delivered count is at least one. Static checks and
unauthenticated browser simulation cannot establish those live-provider/device outcomes.
