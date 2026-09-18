import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const e57=source("../../supabase/migrations/202609180035_e57_activity_reactions_fk_index.sql");
const e58=source("../../supabase/migrations/202609180036_e58_notification_deliveries_grants.sql");

describe("E57/E58 shared backend parity",()=>{
  test("Activity Reactions receives only the missing user FK index",()=>{
    expect(e57).toContain("activity_reactions_user_id_idx");
    expect(e57.toLowerCase()).not.toContain("drop index");
  });

  test("notification_deliveries remains a server-owned table",()=>{
    expect(e58).toContain("public.notification_deliveries");
    expect(e58).toContain("from anon, authenticated");
    expect(e58.toLowerCase()).not.toContain("create policy");
    expect(e58.toLowerCase()).not.toContain("service_role");
  });
});
