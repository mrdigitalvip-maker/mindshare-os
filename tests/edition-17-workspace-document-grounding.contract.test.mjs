import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E17 grounds writing and summarization in bounded user-owned documents", async () => {
  const [context, skills, connectors] = await Promise.all([
    read("supabase/functions/_shared/kivryn-personal-context.ts"),
    read("supabase/functions/_shared/kivryn-agent-skills.ts"),
    read("supabase/functions/_shared/kivryn-agent-connectors.ts"),
  ]);
  assert.match(context, /writing:\s*\["documents"\]/);
  assert.match(context, /summarization:\s*\["documents"\]/);
  assert.match(context, /\.from\("documents"\)[\s\S]*?\.eq\("user_id", input\.userId\)[\s\S]*?\.limit\(8\)/);
  assert.match(context, /content:\s*1200/);
  assert.match(skills, /contextScopes:\s*\[\.\.\.BASE_CONTEXT, "documents"\]/);
  assert.match(connectors, /id:\s*"workspace\.documents"[\s\S]*?canMutate:\s*false/);
});

test("E17 does not grant document mutation authority", async () => {
  const registry = await read("supabase/functions/_shared/kivryn-action-registry.ts");
  assert.doesNotMatch(registry, /domain:\s*"documents"/);
});
