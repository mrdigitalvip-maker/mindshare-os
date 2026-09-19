-- E75 hardening: Supabase default grants may leave anon EXECUTE on new functions.
-- The retention RPC is authenticated-only and should not be callable by anon.

revoke all on function public.get_passport_retention_summary(uuid) from public;
revoke all on function public.get_passport_retention_summary(uuid) from anon;
grant execute on function public.get_passport_retention_summary(uuid) to authenticated;
