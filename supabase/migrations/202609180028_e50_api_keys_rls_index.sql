-- E50 — API keys RLS + FK index hardening.
-- Preserve public ALL owner-only semantics. No key material is read or changed.

create index if not exists api_keys_user_id_idx
  on public.api_keys(user_id);

drop policy if exists api_keys_all on public.api_keys;
create policy api_keys_all
on public.api_keys
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
