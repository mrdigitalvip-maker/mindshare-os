import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const studio=source("../../supabase/migrations/202609180021_e43_studio_rls_indexes.sql");
const passport=source("../../supabase/migrations/202609180022_e44_passport_companion_rls_indexes.sql");

describe("E43/E44 shared backend parity",()=>{
  test("Studio remains authenticated owner-scoped",()=>{
    expect(studio).toContain("to authenticated");
    expect(studio).toContain("(select auth.uid())");
    expect(studio.toLowerCase()).not.toContain("security definer");
  });
  test("Passport companion tables remain authenticated owner-scoped",()=>{
    expect(passport).toContain("to authenticated");
    expect(passport).toContain("(select auth.uid())");
    expect(passport).toContain("passport vocabulary reviews owner select");
    expect(passport.toLowerCase()).not.toContain("security definer");
  });
  test("hardening is additive and does not fabricate Android feature code",()=>{
    expect(studio.toLowerCase()).not.toContain("drop index");
    expect(passport.toLowerCase()).not.toContain("drop index");
  });
});
