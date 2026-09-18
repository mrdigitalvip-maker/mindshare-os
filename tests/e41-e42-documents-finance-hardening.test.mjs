import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const documents = read("supabase/migrations/202609180019_e41_documents_rls_index.sql");
const finance = read("supabase/migrations/202609180020_e42_finance_rls_indexes.sql");
const workspace = read("src/services/workspace-services.ts");

test("E41 preserves canonical Documents owner CRUD and adds the missing FK index", () => {
  assert.match(workspace, /\.from\("documents"\)/);
  assert.match(workspace, /\.eq\("user_id", userId\)/);
  assert.match(documents, /create index if not exists documents_user_id_idx\s+on public\.documents\(user_id\)/);
  assert.match(documents, /create policy documents_all/);
  assert.match(documents, /for all\s+to public/);
  assert.match(documents, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(documents, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(documents, /drop index/i);
});

test("E42 preserves canonical Finance owner CRUD and adds all advisor-reported FK indexes", () => {
  assert.match(workspace, /\.from\("finance_accounts"\)/);
  assert.match(workspace, /\.from\("finance_transactions"\)/);
  for (const index of [
    "finance_accounts_user_id_idx",
    "finance_transactions_account_id_idx",
    "finance_transactions_user_id_idx",
  ]) {
    assert.match(finance, new RegExp(`create index if not exists ${index}`));
  }
  for (const policy of ["finance_accounts_all", "finance_transactions_all"]) {
    assert.match(finance, new RegExp(`create policy ${policy}`));
  }
  const ownerPolicies = finance.match(/for all\s+to public/g) ?? [];
  assert.equal(ownerPolicies.length, 2);
  assert.match(finance, /\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(finance, /auth\.uid\(\) = user_id/);
  assert.doesNotMatch(finance, /drop index/i);
});

test("E41/E42 do not change feature behavior or invent mobile APIs", () => {
  assert.doesNotMatch(documents + finance, /security definer/i);
  assert.doesNotMatch(documents + finance, /grant .* anon/i);
  assert.doesNotMatch(documents + finance, /insert into/i);
  assert.doesNotMatch(documents + finance, /update public\./i);
  assert.doesNotMatch(documents + finance, /delete from public\./i);
});
