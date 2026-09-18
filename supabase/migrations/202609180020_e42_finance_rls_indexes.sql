-- E42 — Finance RLS + FK index hardening.
-- Preserve the existing public ALL owner policies while evaluating auth.uid()
-- once per statement. Add the advisor-reported FK covering indexes.

create index if not exists finance_accounts_user_id_idx
  on public.finance_accounts(user_id);

create index if not exists finance_transactions_account_id_idx
  on public.finance_transactions(account_id);

create index if not exists finance_transactions_user_id_idx
  on public.finance_transactions(user_id);

drop policy if exists finance_accounts_all on public.finance_accounts;
create policy finance_accounts_all
on public.finance_accounts
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists finance_transactions_all on public.finance_transactions;
create policy finance_transactions_all
on public.finance_transactions
for all
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
