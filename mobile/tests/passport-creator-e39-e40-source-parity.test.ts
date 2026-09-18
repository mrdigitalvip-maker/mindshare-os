import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const passportMigration = source("../../supabase/migrations/202609180016_e39_passport_profile_rls_index.sql");
const creatorMigration = source("../../supabase/migrations/202609180017_e40_creator_core_rls_initplan.sql");
const passportService = source("../services/passport-service.ts");
const creatorService = source("../services/creator-service.ts");

describe("E39 + E40 Passport and Creator source parity", () => {
  test("Android Passport continues through shared passport_profiles owner scope", () => {
    expect(passportService).toContain('.from("passport_profiles")');
    expect(passportService).toContain('.eq("user_id", requireUser(userId))');
    expect(passportMigration).toContain("passport_profiles_track_id_idx");
    expect(passportMigration).toContain("user_id = (select auth.uid())");
    expect(passportMigration.toLowerCase()).not.toContain("drop index");
  });

  test("E39 keeps all four Passport profile owner CRUD policies authenticated", () => {
    for (const policy of [
      "passport profile owner select",
      "passport profile owner insert",
      "passport profile owner update",
      "passport profile owner delete",
    ]) {
      expect(passportMigration).toContain(`create policy "${policy}"`);
    }
    expect(passportMigration).toContain("to authenticated");
    expect(passportMigration).not.toContain("to public");
  });

  test("Android Creator continues through shared creator_profiles and creator_projects", () => {
    expect(creatorService).toContain('.from("creator_profiles")');
    expect(creatorService).toContain('.from("creator_projects")');
    expect(creatorService).toContain('.eq("user_id", userId)');
  });

  test("E40 shared backend preserves authenticated owner-only ALL policies", () => {
    expect(creatorMigration).toContain("creator_profiles_owner_all");
    expect(creatorMigration).toContain("creator_projects_owner_all");
    expect(creatorMigration).toContain("for all");
    expect(creatorMigration).toContain("to authenticated");
    expect(creatorMigration).not.toContain("to public");
    expect(creatorMigration).toContain("(select auth.uid()) = user_id");
  });
});
