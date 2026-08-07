# Push notifications

## Configuration

Set these as deployment secrets; never expose private values to Vite or `public/`:

- `VAPID_PUBLIC_KEY` and frontend `VITE_VAPID_PUBLIC_KEY` (public key only)
- `VAPID_PRIVATE_KEY` (Edge Function secret)
- `VAPID_SUBJECT` (a `mailto:` or HTTPS subject)
- `SCHEDULER_SECRET` (shared only by the scheduler and functions)

Apply the Phase 3 migration and deploy `push-send` and `scheduled-reminders`. Schedule the latter every 30 minutes with Supabase Scheduled Functions. It evaluates local time, category preferences and `notification_deliveries` dedupe. Production should extend its same pattern for due/overdue tasks, tomorrow's projects, relevant study goals, and daily summaries; it must not create reminders without a relevant record.

The browser requests permission only after the Enable button. It registers `/sw.js`, subscribes with the public VAPID key and persists an owner-scoped subscription. `push-send` authenticates user-triggered calls or the scheduler secret, never logs endpoint/key material, and removes HTTP 404/410 subscriptions. Notification clicks accept only same-origin destinations.

Quiet-hour columns are persisted. Before enabling broader scheduled categories, the coordinator must compare local time against both quiet-hour bounds, including overnight ranges. This delivery currently schedules the conservative 18:00 Studio reminder only; task, project, study and summary generation are an explicit deployment limitation, not simulated.
