# MindShare OS / NEXORA Frontend Architecture Audit

## Scope reviewed

- Folder structure, routing, shell navigation, public/auth/protected pages, dashboard, module screens, hooks, providers, service boundaries, Supabase client usage, Stripe checkout entrypoint, OpenAI assistant entrypoint, mock data, generated route tree, build/lint output, imports/exports, and disconnected UI actions.

## Route map

- Public: `/`, `/auth`, `/confirm-email`, `/reset-password`, `/onboarding`, `/sitemap.xml`.
- Protected shell: `/dashboard`, `/assistant`, `/projects`, `/productivity`, `/studies`, `/finance`, `/content`, `/translate`, `/documents`, `/agents`, `/premium`, `/settings`.
- Navigation sources: file routes in `src/routes`, module metadata in `src/lib/modules.ts`, global command navigation in `src/components/global-search.tsx`, and protected shell navigation in `src/routes/_shell.tsx`.

## Component map

- App/root: `src/routes/__root.tsx`, `src/router.tsx`, `src/start.ts`, `src/server.ts`.
- Layout/navigation: `src/components/page-shell.tsx`, `src/components/global-search.tsx`, `src/routes/_shell.tsx`.
- Dashboard: `src/routes/_shell.dashboard.tsx` plus `src/components/dashboard/*`.
- UI primitives: `src/components/ui/*`.
- Feature routes: every `src/routes/_shell.*.tsx` module route.

## Hook and provider map

- Providers: root `QueryClientProvider`, `AuthProvider`, and `Toaster`.
- Auth/profile/subscription/chat hooks: `src/lib/auth-context.tsx`, `src/hooks/use-profile.ts`, `src/hooks/use-subscription.ts`, `src/hooks/use-chat.ts`.
- Dashboard hooks: `src/hooks/dashboard/*`.
- Frontend mock-service consumption now lives behind `src/services/*` for module workflows and billing checkout entrypoints.

## Service architecture created

- `src/services/mock-data.ts`: single coherent mock data source for projects, tasks, studies, documents, chats-adjacent module data, finance goals, notifications, and user-facing workspace content.
- `src/services/local-store.ts`: storage adapter that persists mock service data without tying screens to `localStorage`.
- `src/services/workspace-services.ts`: definitive frontend service boundary for `ProjectService`, `ProductivityService`, `DocumentService`, `ContentService`, `StudyService`, `FinanceService`, `AgentService`, `TranslationService`, and `SubscriptionService`.
- `src/services/index.ts`: stable export surface for future Supabase/Stripe/OpenAI implementations.

## Integrations prepared

- Supabase remains isolated in integration/hook/service infrastructure, not in module routes. Future migration should replace service implementations, not page contracts.
- Stripe checkout is exposed to the Premium page through `SubscriptionService.createCheckoutUrl()`, keeping Stripe/Supabase invocation out of the screen.
- OpenAI assistant calls remain centralized through `src/lib/ai-service.ts` and `src/hooks/use-chat.ts`; future provider changes should remain behind that boundary.

## Problems found

- The previous local workspace adapter was too broad and temporary-looking (`src/lib/workspace-service.ts`, `src/hooks/use-workspace.ts`).
- Multiple module routes owned persistence details directly instead of consuming a service boundary.
- Premium route invoked Supabase Edge Functions directly from the screen.
- Dashboard suggestion buttons and recent-project actions looked clickable but had no connected navigation.
- Dashboard mini-module cards were visually interactive but not navigable.
- Sitemap previously had an empty base URL placeholder.
- Lint showed many Prettier violations before formatting, plus non-blocking Fast Refresh warnings in existing UI primitive files.

## Problems corrected

- Replaced the temporary workspace adapter with named services and a single mock data/store layer.
- Refactored module routes to call services instead of direct storage/helpers.
- Refactored Premium checkout to use `SubscriptionService` instead of direct Supabase usage in the route.
- Connected dashboard AI suggestion actions, recent project buttons, and mini-module tiles to navigation.
- Kept routes, branding, colors, typography, animation primitives, spacing classes, and overall visual language intact.
- Preserved Supabase schema and Edge Function contracts; no real backend integration was added.

## Remaining production blockers that depend only on real integrations

1. Configure real Supabase env vars, RLS, storage bucket policies, and table data for the existing contracts.
2. Swap mock service internals for Supabase implementations behind the same service names.
3. Configure Stripe secrets/price/webhook and keep Premium routed through `SubscriptionService`.
4. Configure OpenAI provider secrets and keep assistant calls behind `AIService`/chat service boundaries.
5. Add E2E tests against real auth/onboarding/checkout/assistant flows after credentials are available.
6. Address existing advisory bundle-size warnings with code-splitting once product behavior is locked.
