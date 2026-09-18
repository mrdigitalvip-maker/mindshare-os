import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const identityMigration = source("../../supabase/migrations/202609180014_e37_identity_preferences_rls_initplan.sql");
const checkinMigration = source("../../supabase/migrations/202609180015_e38_project_checkins_rls_index.sql");
const profileService = source("../services/profile-service.ts");
const workspaceService = source("../services/workspace-service.ts");
const settingsScreen = source("../app/(app)/settings.tsx");

describe("E37 + E38 Identity and Project Check-in source parity", () => {
  test("Android profile continues through the shared profiles table", () => {
    expect(profileService).toContain('.from("profiles")');
    expect(profileService).toContain('.eq("id", id)');
    expect(settingsScreen).toContain("updateProfileName");
    expect(identityMigration).toContain('"Users can read own profile"');
    expect(identityMigration).toContain("(select auth.uid()) = id");
  });

  test("E37 shared preferences policies stay owner-scoped without inventing mobile-only writes", () => {
    expect(identityMigration).toContain("preferences_select");
    expect(identityMigration).toContain("preferences_insert");
    expect(identityMigration).toContain("preferences_update");
    expect(identityMigration).toContain("(select auth.uid()) = user_id");
    expect(identityMigration).not.toContain("preferences_delete");
  });

  test("Android Project workspace still uses canonical project_check_ins reads and inserts", () => {
    expect(workspaceService).toContain('.from("project_check_ins")');
    expect(workspaceService).toContain("listProjectCheckIns");
    expect(workspaceService).toContain("createProjectCheckIn");
    expect(workspaceService).toContain('.eq("user_id", owner(userId))');
    expect(workspaceService).toContain('.eq("project_id", resource(projectId))');
  });

  test("E38 shared backend preserves linked Project ownership and adds only the missing FK index", () => {
    expect(checkinMigration).toContain("project_check_ins_project_id_idx");
    expect(checkinMigration).toContain("(select auth.uid()) = user_id");
    expect(checkinMigration).toContain("project.user_id = (select auth.uid())");
    expect(checkinMigration.toLowerCase()).not.toContain("drop index");
  });
});
