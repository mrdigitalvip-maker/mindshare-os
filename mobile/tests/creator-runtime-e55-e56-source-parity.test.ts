import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const creator=source("../../supabase/migrations/202609180033_e55_creator_residual_rls_indexes.sql");
const runtime=source("../../supabase/migrations/202609180034_e56_ai_action_runtime_rls_index.sql");

describe("E55/E56 shared backend parity",()=>{
  test("Creator residual policies stay authenticated and owner-scoped",()=>{
    expect(creator).toContain("to authenticated");
    expect(creator).toContain("(select auth.uid())");
    expect(creator.toLowerCase()).not.toContain("security definer");
  });
  test("AI/action runtime keeps existing role boundaries",()=>{
    expect(runtime).toContain("on public.ai_usage");
    expect(runtime).toContain('create policy "Owners read action history"');
    expect(runtime).toContain("to public");
    expect(runtime).toContain("Users insert own runtime errors");
  });
  test("hardening is additive",()=>{
    expect(creator.toLowerCase()).not.toContain("drop index");
    expect(runtime.toLowerCase()).not.toContain("drop index");
  });
});
