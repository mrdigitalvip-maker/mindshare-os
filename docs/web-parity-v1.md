# Web parity V1 audit

The official Web client is TanStack Start/Router with React 19, Vite, TanStack Query, Supabase Auth/database/Edge Functions, Tailwind and Radix UI. File routes live in `src/routes`, browser integration in `src/lib/supabase.ts`, services in `src/services`, and Vercel uses the root build plus `vercel.json`.

| Feature                        | Android                        | Web before                           | V1 action                                                                        |
| ------------------------------ | ------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- |
| Auth                           | Canonical Supabase identity    | Supabase session and protected shell | Retained session restore, callbacks, recovery and shell guard                    |
| Home / Assistant               | Canonical data / `ai-chat`     | Live dashboard and assistant         | Retained; mission is exposed through the same RPC in Journeys                    |
| Tasks / Projects / Studies     | Canonical tables               | Live CRUD                            | Retained server reads and mutations                                              |
| Journeys / Missions / Momentum | Server authoritative           | Missing                              | Added canonical mission RPC and owner reads; only journey-action RPC can confirm |
| Arena                          | RPC V1                         | Missing                              | Added read/join RPC UI; no leaderboard claims                                    |
| Community                      | RPC-only V1                    | Missing                              | Added privacy-safe home RPC read; no restricted-table reads                      |
| Journey Packs                  | RPC V1                         | Missing                              | Added catalog and Preview → Confirm → Apply with stable request UUID             |
| Settings / Premium             | Canonical profile/subscription | Existing                             | Retained canonical Supabase/Stripe flows                                         |
| Notifications                  | Native/web differ              | Web Push support exists              | Retained real Web Push only                                                      |
| Legal/account lifecycle        | Canonical links/profile        | Existing settings/auth               | Retained; no platform-only toggles added                                         |

No migration is introduced. Production requires the database baseline through `202608290003_journey_packs_v1.sql`, deployed Edge Functions, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL`, and optional `VITE_VAPID_PUBLIC_KEY`. Service-role, Stripe secret, OpenAI and VAPID private keys remain server-only.
