import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const e47 = read("supabase/migrations/202609180025_e47_files_rls_index.sql");
const e48 = read("supabase/migrations/202609180026_e48_translations_rls_index.sql");
const workspace = read("src/services/workspace-services.ts");

test("E47 keeps Files owner-only access and adds the missing user FK index", () => {
  assert.match(workspace, /\.from\("files"\)/);
  assert.match(workspace, /\.eq\("user_id", userId\)/);
  assert.match(e47, /create index if not exists files_user_id_idx\s+on public\.files\(user_id\)/);
  assert.match(e47, /create policy files_all/);
  assert.match(e47, /for all\s+to public/);
  assert.match(e47, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(e47, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(e47, /drop index/i);
});

test("E48 keeps Translations owner-only and provider-backed persistence", () => {
  assert.match(workspace, /\.from\("translations"\)/);
  assert.match(workspace, /\.eq\("user_id", userId\)/);
  assert.match(workspace, /A real provider result is required/);
  assert.match(e48, /create index if not exists translations_user_id_idx\s+on public\.translations\(user_id\)/);
  assert.match(e48, /create policy translations_all/);
  assert.match(e48, /for all\s+to public/);
  assert.match(e48, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(e48, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(e48, /drop index/i);
});

test("E47/E48 do not invent privileged helpers or backend success", () => {
  const combined = e47 + e48;
  assert.doesNotMatch(combined, /security definer/i);
  assert.doesNotMatch(combined, /grant .* anon/i);
  assert.doesNotMatch(combined, /insert into/i);
  assert.doesNotMatch(combined, /update public\./i);
  assert.doesNotMatch(combined, /delete from public\./i);
});
