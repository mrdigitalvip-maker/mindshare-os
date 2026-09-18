-- E47 — Files RLS + FK index hardening.
-- Preserve existing public ALL owner-only semantics while evaluating auth.uid()
-- once per statement and add the missing user_id FK index.

create index if not exists files_user_id_idx
  on public.files(user_id);

drop policy if exists files_all on public.files;
create policy files_all
on public.files
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
