import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const e57=read("supabase/migrations/202609180035_e57_activity_reactions_fk_index.sql");
const e58=read("supabase/migrations/202609180036_e58_notification_deliveries_grants.sql");

test("E57 adds the final Activity Reactions user FK index additively",()=>{
  assert.match(e57,/create index if not exists activity_reactions_user_id_idx/);
  assert.match(e57,/on public\.activity_reactions\(user_id\)/);
  assert.doesNotMatch(e57,/drop index/i);
});

test("E58 keeps notification_deliveries server-owned and fail-closed",()=>{
  assert.match(
    e58,
    /revoke all privileges on table public\.notification_deliveries\s+from anon, authenticated/i,
  );
  assert.doesNotMatch(e58,/create policy/i);
  assert.doesNotMatch(e58,/grant .* to (anon|authenticated)/i);
  assert.doesNotMatch(e58,/revoke .*service_role/i);
});
