import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E19 fixes set_updated_at search_path and removes direct client execution", async () => {
  const migration = await read("supabase/migrations/20260916183445_edition_19_security_hardening.sql");
  assert.match(migration, /ALTER FUNCTION public\.set_updated_at\(\) SET search_path = pg_catalog;/);
  assert.match(
    migration,
    /REVOKE EXECUTE ON FUNCTION public\.set_updated_at\(\) FROM PUBLIC, anon, authenticated;/,
  );
});

test("E19 keeps trigger-only quota and integrity helpers server-internal", async () => {
  const migration = await read("supabase/migrations/20260916183445_edition_19_security_hardening.sql");
  for (const helper of [
    "enforce_creator_project_limit",
    "enforce_free_creation_limits",
    "enforce_free_workspace_limit",
    "enforce_journey_limit",
    "enforce_task_state_and_free_limit",
    "protect_journey_pack_source",
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${helper}\\(\\) FROM PUBLIC, anon, authenticated;`),
    );
  }
  assert.doesNotMatch(migration, /CREATE POLICY|DISABLE ROW LEVEL SECURITY|GRANT .* TO anon/i);
});
