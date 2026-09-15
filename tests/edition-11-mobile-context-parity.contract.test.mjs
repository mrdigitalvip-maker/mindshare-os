import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverPath = new URL(
  "../supabase/functions/_shared/kivryn-personal-context.ts",
  import.meta.url,
);
const mobilePath = new URL("../mobile/services/agent-schedule-service.ts", import.meta.url);

test("Android exposes the same capability-to-context mapping as the server authority", async () => {
  const [server, mobile] = await Promise.all([
    readFile(serverPath, "utf8"),
    readFile(mobilePath, "utf8"),
  ]);

  for (const source of [server, mobile]) {
    assert.match(source, /profile/);
    assert.match(source, /preferences/);
    assert.match(source, /planning/);
    assert.match(source, /productivity/);
    assert.match(source, /tasks/);
    assert.match(source, /projects/);
    assert.match(source, /study/);
    assert.match(source, /studies/);
    assert.match(source, /passport/);
  }

  assert.match(mobile, /contextScopesForAgentCapabilities/);
  assert.match(mobile, /\.eq\("user_id", uid\)/);
});
