-- E45 — Notes RLS + FK index hardening.
-- Preserve existing public ALL owner-only semantics while evaluating auth.uid()
-- once per statement and add the missing user_id FK index.

create index if not exists notes_user_id_idx
  on public.notes(user_id);

drop policy if exists notes_all on public.notes;
create policy notes_all
on public.notes
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
