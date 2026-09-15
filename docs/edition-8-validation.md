# Edition 8 validation record

Production backend state before merge:

- Agent schedule schema migrations applied.
- Schedule coherence and server-side entitlement enforcement applied.
- One active `kivryn-scheduled-agent-runs` cron job runs every five minutes.
- `agent-run` uses the shared server executor.
- `scheduled-agent-runs` uses the same shared executor and scheduler-secret authentication.
- `push-send` preserves manual/internal authentication and understands Agent result routes.
- No invalid saved Agent schedules were present at validation time.
- No scheduled Agent runs existed yet at validation time; therefore no user run was synthesized for testing.

Repository merge gates:

- Web Quality: build, typecheck, web contract tests.
- Mobile Typecheck: generated typed routes + TypeScript noEmit.
- No Android AAB is part of Edition 8.
- Vercel production deployment is monitored after merge before closing the edition.
