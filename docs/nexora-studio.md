# NEXORA Studio

## Delivery matrix

| Feature           | Current support              | Schema gap                            | Backend gap                             | Free/Premium            | Implementation                                   |
| ----------------- | ---------------------------- | ------------------------------------- | --------------------------------------- | ----------------------- | ------------------------------------------------ |
| Studio catalog    | No prior catalog             | Tracks and lessons                    | Atomic completion                       | Basic / full catalog    | Normalized catalog plus seeded practical lessons |
| Engagement        | No Studio source             | Goals, activity, streak, achievements | Timezone-safe transaction               | Same XP rules           | `complete_studio_lesson` owns mutations          |
| Language Lab      | Translation only             | Enrollment and progress               | Coach action remains provider-dependent | Basic / premium lessons | Four extensible language tracks and onboarding   |
| Academy / Creator | Content tools only           | Catalog and progress                  | Advanced coaching remains external      | Basic / complete        | Practical tasks and Content Studio handoff       |
| Push              | Service worker receiver only | Subscriptions, preferences, dedupe    | VAPID delivery and scheduler            | Both                    | Explicit browser opt-in and Edge Functions       |
| Usage             | Message counters             | `ai_usage` ledger                     | Remaining boundaries need rollout       | Per-action limits       | Real request rows without prompt content         |

## Learning model

Studio has three paths: Language Lab, AI Academy and Creator Growth. Global catalog rows are readable by authenticated users; enrollment, progress and activity are owner-only. The first lessons are free and later catalog items can be premium. Creator Growth makes no income or virality guarantee.

A lesson records `in_progress` when opened. Completion runs in one database transaction: progress, local-day minutes/activity, streak, XP, and achievements are updated together. Exercise answers are not written to `studio_activity`; metadata contains only bounded facts such as score.

## Daily goals, streaks and XP

A local calendar day qualifies when at least one valid Studio lesson is completed (which also satisfies the default one-activity goal) or the configured Studio daily goal is reached. The database uses `notification_preferences.timezone`, with UTC only as a safe fallback for an invalid/missing preference. A repeated completion on the same date does not extend the streak.

Central values are 20 XP for lesson completion, 5 for an exercise, 10 for a daily goal, and 15 for a challenge. XP is an internal progress signal—not money, cryptocurrency, a token, or a financial reward. Phase 3 includes only First Lesson, 3/7 Day Streak, 10 Lessons, First AI Challenge and First Creator Task.

## Deployment and tests

Apply `202608070002_phase3_engagement.sql`, regenerate Supabase TypeScript types, and deploy `ai-chat`. Seed content may be expanded through migrations. Run `npm run check` and the SQL isolation tests. Provider-backed Studio coaching is a documented limitation until its dedicated allow-listed action is deployed; lessons, exercises, completion, goals, streak and XP do not depend on it.
