# NEXORA Production Readiness Audit

## Repository map
- Runtime: TanStack Start + React 19 + Vite, with the app bootstrapped from `src/start.ts`, router creation in `src/router.tsx`, and the root shell in `src/routes/__root.tsx`.
- Route layer: file routes live in `src/routes`. Public routes are `/`, `/auth`, `/confirm-email`, `/reset-password`, `/onboarding`, and `/sitemap.xml`. Protected application routes are nested under `/_shell` and exposed as `/dashboard`, `/assistant`, `/projects`, `/productivity`, `/studies`, `/finance`, `/content`, `/translate`, `/documents`, `/agents`, `/premium`, and `/settings`.
- Components: shared layout primitives live in `src/components/page-shell.tsx`; dashboard-specific components live in `src/components/dashboard`; shadcn/Radix UI primitives live in `src/components/ui`; global command navigation lives in `src/components/global-search.tsx`.
- Hooks: auth/profile/subscription/chat hooks live in `src/hooks`; dashboard data hooks live in `src/hooks/dashboard`; the local workspace adapter added during remediation lives in `src/hooks/use-workspace.ts`.
- Services and integrations: Supabase client is in `src/lib/supabase.ts`; AI invocation is in `src/lib/ai-service.ts`; demo fallback config/data are in `src/lib/demo`; shared module metadata is in `src/lib/modules.ts`; local temporary workspace contracts are in `src/lib/workspace-service.ts`.
- Edge functions: `supabase/functions/ai-chat`, `supabase/functions/create-checkout-session`, and `supabase/functions/stripe-webhook` implement the OpenAI and Stripe server integrations.

## API integration map
- Supabase Auth: sign-in, sign-up, Google OAuth, sign-out, password reset, and password update are handled by `src/lib/auth-context.tsx`.
- Supabase Database: profile reads/updates, subscription reads, AI conversation/message persistence, and dashboard queries target `profiles`, `subscriptions`, `ai_conversations`, `ai_messages`, `projects`, `tasks`, `documents`, and `activity_logs`.
- Supabase Storage: avatar upload targets the `avatars` bucket.
- Supabase Edge Functions: the client invokes `ai-chat` from `src/lib/ai-service.ts` and `create-checkout-session` from the Premium screen.
- OpenAI: `supabase/functions/ai-chat/index.ts` calls the configured provider and stores responses through the app’s chat flow.
- Stripe: `create-checkout-session` creates subscription checkout sessions; `stripe-webhook` upserts subscription status into Supabase.

## What already works
- App builds successfully for client, SSR, and Nitro/Cloudflare output.
- Public marketing, auth, onboarding, protected shell navigation, dashboard, assistant, premium, and settings routes are present.
- Auth and profile flows are integrated with Supabase, with demo fallback protection when credentials are absent.
- Assistant flow persists conversations/messages when backend is available and returns coherent fallback replies when offline.
- Stripe checkout and webhook function contracts exist.
- Dashboard has real query hooks with fallback data.

## What partially works
- Projects, productivity, documents, studies, content, finance, translate, and agents existed mostly as static cards or empty states.
- Premium checkout works only when Stripe/Supabase environment is configured; demo mode simulates checkout.
- Settings exposes profile save and avatar upload, but many settings sections are informational only.
- Sitemap existed but had no production base URL fallback.

## Broken or disconnected flows found
- Several module CTAs were visually clickable but had no stateful behavior.
- Translation always displayed a provider-not-connected placeholder instead of producing any output.
- Documents upload, project creation, task creation, content creation, finance goals, study plans, and agents had no connected temporary adapter.
- Sitemap generated empty `<loc>` origins unless a project URL was manually filled in.

## Placeholders and TODOs found
- Temporary demo/fallback layer is intentional and documented while Supabase/OpenAI/Stripe are not fully provisioned.
- `src/routes/sitemap[.]xml.ts` had a TODO for the project URL; this was replaced with an environment-driven production fallback.
- Disabled attachment/microphone assistant controls remain intentional until those provider contracts exist.
- Premium finance/agents gating remains visible by design and routes are preserved.

## Duplicated code and architecture concerns
- Module pages repeated similar card/list/empty-state patterns. A future pass should extract module dashboard cards once behavior stabilizes.
- Demo/fallback and local workspace state are separate layers. They should converge into repository-backed services when the real backend tables/functions are finalized.
- UI primitive files export helpers alongside components, which triggers React Fast Refresh warnings but not production build failures.
- Route tree is generated and should not be edited manually; formatting touched it only through automated formatting.

## Production blockers
1. Provision real Supabase project variables and verify RLS policies for every referenced table/bucket.
2. Deploy and configure edge function secrets: OpenAI provider keys, Stripe secret key, Stripe price ID, webhook secret, and app URL.
3. Replace local workspace adapter with real tables/functions for project/task/document/content/study/finance/agent workflows.
4. Add E2E coverage for auth, onboarding, module navigation, assistant fallback/live mode, and checkout redirect.
5. Resolve bundle-size warnings through route-level/code-splitting optimization.

## Execution priority
1. Keep the whole app navigable and prevent dead screens with temporary adapters.
2. Wire module CTAs to persistent local state without changing routes, brand, UX, or database contracts.
3. Fix production metadata/sitemap defaults.
4. Run lint/build checks and commit a stable branch.
5. Next iteration: connect the temporary workspace adapter to Supabase-backed service methods feature by feature.
