-- E41 — Documents RLS + FK index hardening.
-- Preserve the existing public ALL owner policy semantics while evaluating
-- auth.uid() once per statement and add the missing user_id covering index.

create index if not exists documents_user_id_idx
  on public.documents(user_id);

drop policy if exists documents_all on public.documents;
create policy documents_all
on public.documents
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
