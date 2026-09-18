import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const documents = source("../../supabase/migrations/202609180019_e41_documents_rls_index.sql");
const finance = source("../../supabase/migrations/202609180020_e42_finance_rls_indexes.sql");

describe("E41/E42 shared backend parity", () => {
  test("Documents backend remains owner-scoped and additive", () => {
    expect(documents).toContain("documents_user_id_idx");
    expect(documents).toContain("for all");
    expect(documents).toContain("to public");
    expect(documents).toContain("(select auth.uid()) = user_id");
    expect(documents.toLowerCase()).not.toContain("drop index");
  });

  test("Finance backend remains owner-scoped and covers all three FKs", () => {
    expect(finance).toContain("finance_accounts_user_id_idx");
    expect(finance).toContain("finance_transactions_account_id_idx");
    expect(finance).toContain("finance_transactions_user_id_idx");
    expect(finance).toContain("finance_accounts_all");
    expect(finance).toContain("finance_transactions_all");
    expect(finance).toContain("(select auth.uid()) = user_id");
    expect(finance.toLowerCase()).not.toContain("drop index");
  });

  test("No Android Documents/Finance feature is fabricated by this hardening", () => {
    expect(documents.toLowerCase()).not.toContain("security definer");
    expect(finance.toLowerCase()).not.toContain("security definer");
  });
});
