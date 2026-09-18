import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const e47 = source("../../supabase/migrations/202609180025_e47_files_rls_index.sql");
const e48 = source("../../supabase/migrations/202609180026_e48_translations_rls_index.sql");

describe("E47/E48 shared backend parity", () => {
  test("Files hardening stays owner-only and additive", () => {
    expect(e47).toContain("files_user_id_idx");
    expect(e47).toContain("for all");
    expect(e47).toContain("to public");
    expect(e47).toContain("(select auth.uid())");
    expect(e47.toLowerCase()).not.toContain("drop index");
  });

  test("Translations hardening stays owner-only and additive", () => {
    expect(e48).toContain("translations_user_id_idx");
    expect(e48).toContain("for all");
    expect(e48).toContain("to public");
    expect(e48).toContain("(select auth.uid())");
    expect(e48.toLowerCase()).not.toContain("drop index");
  });

  test("No fake Android Files or Translation module is introduced by this hardening", () => {
    expect((e47 + e48).toLowerCase()).not.toContain("security definer");
  });
});
