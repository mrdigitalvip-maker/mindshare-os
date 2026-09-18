-- E39 — Passport Profile RLS and FK hardening.
-- Preserve authenticated owner CRUD while evaluating auth.uid() once per statement.
-- Add a track_id-leading index because existing indexes lead with user_id and do not
-- cover the standalone FK lookup path.

create index if not exists passport_profiles_track_id_idx
  on public.passport_profiles(track_id);

drop policy if exists "passport profile owner select" on public.passport_profiles;
create policy "passport profile owner select"
on public.passport_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "passport profile owner insert" on public.passport_profiles;
create policy "passport profile owner insert"
on public.passport_profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "passport profile owner update" on public.passport_profiles;
create policy "passport profile owner update"
on public.passport_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "passport profile owner delete" on public.passport_profiles;
create policy "passport profile owner delete"
on public.passport_profiles
for delete
to authenticated
using (user_id = (select auth.uid()));
