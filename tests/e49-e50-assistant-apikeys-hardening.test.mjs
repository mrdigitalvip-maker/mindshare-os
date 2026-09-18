import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const e49 = read("supabase/migrations/202609180027_e49_assistant_history_rls.sql");
const e50 = read("supabase/migrations/202609180028_e50_api_keys_rls_index.sql");
const ai = read("src/services/ai-service.ts");

test("E49 preserves Assistant conversation ownership and message parent ownership", () => {
  assert.match(ai, /\.from\("ai_conversations"\)/);
  assert.match(ai, /\.from\("ai_messages"\)/);

  assert.match(e49, /create policy conversation_all/);
  assert.match(e49, /for all\s+to public/);
  assert.match(e49, /\(select auth\.uid\(\)\) = user_id/);

  assert.match(e49, /create policy messages_all/);
  assert.match(e49, /c\.id = ai_messages\.conversation_id/);
  assert.match(e49, /c\.user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(e49, /drop index/i);
});

test("E49 does not broaden Assistant direct access or bypass parent ownership", () => {
  const allPolicies = e49.match(/for all\s+to public/g) ?? [];
  assert.equal(allPolicies.length, 2);
  assert.doesNotMatch(e49, /to anon/);
  assert.doesNotMatch(e49, /security definer/i);
});

test("E50 adds only the missing API key owner index and initplan-safe owner policy", () => {
  assert.match(e50, /create index if not exists api_keys_user_id_idx\s+on public\.api_keys\(user_id\)/);
  assert.match(e50, /create policy api_keys_all/);
  assert.match(e50, /for all\s+to public/);
  assert.match(e50, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(e50, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(e50, /select .*key|secret|token/i);
  assert.doesNotMatch(e50, /drop index/i);
});
