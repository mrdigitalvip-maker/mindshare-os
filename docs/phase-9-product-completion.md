# Phase 9 — Product completion

## Base validation

Phase 9 started from commit `18bb65766cec6e437b553c971d5699e8a4bb4f15`. The Phase 4–8 audit/release documents, shared HTTP helper, AI chat and Stripe functions, canonical query keys, AI service, subscription status service, and workspace services were present and reviewed before frontend changes began. No schema, migration, RLS policy, Storage policy, Edge Function, Stripe/OpenAI integration, authentication flow, public route, or branding asset was changed.

## Initial diagnosis

The pre-change audit was recorded before code edits. It found:

- dashboard hero and AI performance cards showing fixed values (`94%`, `12`, `184`, `18 Days`, `93`, `51`, and `27`);
- dashboard hooks querying Supabase directly, duplicating project/task/conversation reads, selecting the nonexistent `projects.progress` column, and replacing empty/error production results with demo suggestions, projects, and activity;
- `AnalyticsService` reading only the local demo database and returning fixed productivity, AI usage, and streak values;
- global search using component-local request state and searching only projects, tasks, and documents;
- notification service using the nonexistent `read_at` column instead of generated `is_read`, with no mark-all or delete operation and no connected interface;
- Assistant rendering plain text only, loading only the latest history, and lacking conversation navigation, search, rename/delete, message/code copy, recoverable errors, intelligent scroll, and structured Markdown;
- project services and legacy dashboard hooks selecting/writing the nonexistent `projects.progress` column;
- pre-existing TypeScript incompatibilities in the SSR realtime constructor and profile preference update;
- no real streaming contract in `ai-chat`: the existing Edge Function returns a complete persisted response. Phase 9 deliberately does not simulate streaming;
- no `favorite` field on `ai_conversations`; conversation favorites remain schema-blocked.

No frontend TODO or FIXME marker was present. Explicit demo data remains isolated behind `VITE_DEMO_MODE`/`DEMO_MODE`; production failures are not converted into mock success by the new flows.

## Real data connected

### Dashboard

`AnalyticsService.getDashboardSnapshot` is now the canonical dashboard boundary. It obtains the authenticated user from the session service, reads every supported workspace source in parallel, verifies every query, and calculates:

- active/completed projects;
- pending/completed tasks;
- documents and notes;
- subjects, completed study sessions, and study minutes;
- finance accounts, income, expenses, and account balance;
- total/active agents;
- saved translations;
- AI conversations and messages;
- unread notifications;
- recent projects and cross-module activity.

The dashboard has one user-scoped React Query cache entry, real zero values, skeletons, recoverable error feedback, and empty states. Static performance/productivity/streak claims and fabricated AI suggestions were removed.

### Assistant and conversation history

The existing `AIService` remains the sole Assistant boundary. It now supports schema-safe conversation listing, loading, manual rename, and deletion, while sends continue through the existing `ai-chat` Edge Function so server-side ownership, plan limits, OpenAI access, and persistence remain authoritative.

The interface adds conversation search and date grouping, new/open/delete/rename actions, reload recovery, duplicate-send protection, a typing indicator, recoverable retry input, smart auto-scroll, responsive layout, copy-message and copy-code controls, response regeneration, and a lightweight Markdown renderer for headings, paragraphs, bold/inline code, fenced code, tables, blockquotes, ordered/unordered lists, and task lists. Code blocks are visually distinguished and preserve the language label; adding a third-party grammar highlighter was blocked by registry policy, so token-level syntax coloring is a documented follow-up.

The server is non-streaming today. Real streaming requires an Edge Function transport/contract change and was outside the allowed scope. Auto-renaming already occurs safely on first send in the existing Edge Function (`message.slice(0, 80)`); favorites require a schema field and were not invented.

### Global search

`SearchService` now searches projects, tasks, documents, notes, study subjects, agents, translations, and owned AI conversation titles in parallel. Results carry a module category and timestamp, are grouped in the interface, ordered by recency, linked to existing routes, and cached using a user/query-scoped React Query key. The interface includes minimum-input, loading, error, and no-result states.

### Notifications

`NotificationService` now uses the generated `is_read` contract and authenticated user scope for list, mark-read, mark-all-read, and delete. A header notification center provides a real unread badge, empty/loading/error states, per-item actions, and targeted dashboard/notification cache invalidation.

### Projects and generated contracts

Project progress is derived from persisted child-task completion rather than a nonexistent project column. A project with no tasks uses its real persisted status. Create and update operations write only generated schema fields. Legacy dashboard hooks that accessed Supabase directly and depended on nonexistent fields were removed.

## React Query and performance

Before Phase 9, the dashboard used four independent caches and repeated reads of projects and tasks while still omitting most modules. After Phase 9 it uses one user-scoped snapshot cache with a 60-second stale time, parallel source reads, one message count query after owned conversation IDs are known, and targeted invalidation after Assistant/notification mutations. Search moved from unmanaged component requests to a 30-second user/query cache. Conversation lists and notifications also use 30-second caches; sensitive mutations have retry disabled where applicable.

This reduces duplicate dashboard refetch paths from four to one and prevents stale local search/notification state. The dashboard intentionally performs more distinct source reads than before because it now represents all requested real modules; these reads execute concurrently and are shared by a single cache entry. No synthetic timing claim is made because an authenticated production dataset was unavailable in this checkout.

## UX and accessibility

- responsive dashboard grids and Assistant panes avoid fixed desktop-only widths;
- modern skeleton, empty, recoverable error, typing, and disabled states replace silent blanks;
- icon-only conversation, notification, send, copy, and regeneration controls have accessible labels;
- intelligent Assistant scrolling stops following when the user scrolls away from the bottom;
- destructive conversation deletion requires confirmation and success feedback;
- no global visual redesign, public route, or branding change was made.

## Security validation

All new database calls live in services, derive `user_id` from the authenticated session, and add ownership filters. The frontend contains no service-role credential or direct OpenAI request. AI capability and plan enforcement remain server-authoritative in `ai-chat`; the client only presents server outcomes. Demo behavior remains explicitly gated. The existing authentication context is the documented exception for direct Supabase auth subscription/session operations and was not changed architecturally.

## Remaining schema/scope blockers and next steps

- Conversation favorites require a boolean/timestamp field plus policy support on `ai_conversations`.
- Token-level syntax highlighting requires an approved bundled highlighter dependency; registry access returned HTTP 403 during Phase 9.
- True streaming and stop-generation require an Edge Function streaming contract and cancellation semantics; fake streaming was intentionally rejected.
- Deep links to individual search records require existing detail routes/query parameters; search currently links to the correct module route without inventing public routes.
- Several existing module screens remain intentionally simple and some keep local UI state around service results. Migrating every CRUD surface to fully editable forms would be a subsequent frontend phase; no unsupported schema capability was fabricated.
- Authenticated browser E2E and production-query timing require configured Supabase credentials and test-user data.

## Validation notes

The mandatory build, lint, TypeScript, whitespace, targeted ESLint, static audits, and local smoke checks are recorded in the final delivery. The initial dependency attempt for `react-markdown`, `remark-gfm`, and `rehype-highlight` was rejected by registry policy with HTTP 403 and made no package-file change.
