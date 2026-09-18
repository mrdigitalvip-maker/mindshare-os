-- E48 — Translations RLS + FK index hardening.
-- Preserve existing public ALL owner-only semantics while evaluating auth.uid()
-- once per statement and add the missing user_id FK index.

create index if not exists translations_user_id_idx
  on public.translations(user_id);

drop policy if exists translations_all on public.translations;
create policy translations_all
on public.translations
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
