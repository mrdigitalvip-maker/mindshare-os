-- E57 — final FK coverage hardening.
-- Add the last advisor-reported leading foreign-key index.

create index if not exists activity_reactions_user_id_idx
  on public.activity_reactions(user_id);
