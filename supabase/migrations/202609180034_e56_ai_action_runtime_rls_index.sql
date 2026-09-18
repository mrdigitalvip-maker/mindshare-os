-- E56 — AI / Action runtime ownership hardening.
-- Preserve existing roles and operation surfaces exactly. Add the remaining
-- action-history conversation FK index.

create index if not exists nexora_action_runs_conversation_id_idx
  on public.nexora_action_runs(conversation_id);

drop policy if exists "owner select" on public.ai_usage;
create policy "owner select"
on public.ai_usage
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "owner insert" on public.ai_usage;
create policy "owner insert"
on public.ai_usage
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "owner update" on public.ai_usage;
create policy "owner update"
on public.ai_usage
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "owner delete" on public.ai_usage;
create policy "owner delete"
on public.ai_usage
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Owners read action history" on public.nexora_action_runs;
create policy "Owners read action history"
on public.nexora_action_runs
for select
to public
using ((select auth.uid()) = user_id);

drop policy if exists personal_challenges_owner_select on public.personal_challenges;
create policy personal_challenges_owner_select
on public.personal_challenges
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists personal_challenge_events_owner_select on public.personal_challenge_progress_events;
create policy personal_challenge_events_owner_select
on public.personal_challenge_progress_events
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users insert own runtime errors" on public.runtime_errors;
create policy "Users insert own runtime errors"
on public.runtime_errors
for insert
to authenticated
with check ((select auth.uid()) = user_id);
