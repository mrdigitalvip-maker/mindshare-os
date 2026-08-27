# Journeys, Momentum and challenges hardening (2D)

## Audit and trust boundary

Before 2D, owners could update every column of their `journey_missions` rows. That included the source linkage, scheduled date, completion timestamps and the `momentum_value` later copied into a reward event. The source trigger awarded an event idempotently, but challenge increments were not conditional on a newly inserted event. The journey-action RPC did not contribute to challenges, and the Studies trigger compared a session id with a subject id. Challenge definitions, Momentum and participation had no client write policy, but default table grants were not explicitly reduced.

After 2D, authenticated clients can read their missions/events/participation and active definitions, but cannot directly insert, update or delete missions, Momentum, challenge definitions, or participation. The mobile only requests a journey-action completion. Trusted source triggers and the completion RPC own all state, timestamps, points and progress. Journey rows retain their existing owner-managed contract; challenge definitions remain backend/migration-owned.

## Atomic completion and verified sources

`journey_missions.user_id`, `journey_id`, `source_type`, `source_id`, title, description, status, scheduled date, `momentum_value`, `completed_at`, and both timestamps are server-controlled. Daily missions are generated from an owned, open task or owned, active study subject. Task completion verifies the exact task and owner. A completed study session verifies its owner and subject. A journey action requires an owned mission attached to an owned journey.

Completion locks/updates the eligible mission, assigns `completed_at` from the database clock and calls one internal effect function in the same transaction. The deterministic unique tuple `(user_id, source_type='mission', source_id=mission_id, event_type='mission_completed')` is the idempotency key. Only a newly inserted verified event advances active, in-period `mission_completions` challenges, capped at `target_value`. Challenge completion reward insertion uses the equivalent unique challenge tuple. A retry returns the already completed journey action and creates no event, progress, completion timestamp or reward. No task/project/study points model was invented; only the existing mission reward contract is retained.

Momentum streak remains a read-time derivation over persisted event dates in the mobile. Dates are deduplicated before consecutive calendar days are counted, so multiple events or retries in one day do not add streak days. Its existing local calendar semantics are unchanged.

## RLS, grants and constraints

All five domain tables explicitly keep RLS enabled. Private read policies use `auth.uid()`; definitions expose only active challenges. There is no authenticated write policy for the four server-owned tables, and 2D additionally revokes their authenticated DML grants. Security-definer functions validate `auth.uid()` where client-callable, validate ownership, set `search_path = pg_catalog, public`, and have minimal execute grants. Internal trigger/effect functions are not executable by authenticated users.

Journeys Foundation created no `NOT VALID` constraints. The relevant unresolved constraints are the Studies ownership/source foreign keys created `NOT VALID` to avoid rejecting a deployment with pre-existing legacy rows. They cannot be safely validated from the repository alone. Before production, staging must query `pg_constraint.convalidated`, check orphan and cross-owner rows for `study_subjects`/`study_sessions`, repair them without guessing ownership, then run `VALIDATE CONSTRAINT` in a separate reviewed migration. The unrelated task, monetization and project constraints are outside this task's domain.

## Staging/deploy plan and residual risks

Run the migration on a restored staging snapshot, verify the Studies constraints and source ownership queries, then exercise two concurrent completions and two RPC retries under separate authenticated users. Confirm event/progress counts, RLS denials, query plans and local-date behavior around the product's supported timezones before a normal migration release. No remote push/deploy is part of 2D.

Residual risks: the database has no canonical user timezone, so streak display retains device-local day boundaries while event timestamps are UTC; legacy Studies rows still require staging validation; and `journey_action` creation is a backend-only future contract, so this change hardens completion without inventing an action generator.
