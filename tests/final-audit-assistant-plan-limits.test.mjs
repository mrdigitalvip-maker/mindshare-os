import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("release Assistant authority enforces Free 10/2 and Premium 100/20", async () => {
  const sql = await read("supabase/migrations/202609191110_release_assistant_plan_limits.sql");
  assert.match(sql, /when premium then 100/);
  assert.match(sql, /when premium then 20/);
  assert.match(sql, /else 10/);
  assert.match(sql, /else 2/);
  assert.match(sql, /when internal_full then 2147483647/);
  assert.match(sql, /if not internal_full and assistant_used >= assistant_cap/);
  assert.match(sql, /if not internal_full and p_has_attachment and attachment_used >= attachment_cap/);
  assert.doesNotMatch(sql, /unlimited := premium or internal_full/);
});

test("published Web plan copy matches the server quota authority", async () => {
  const premium = await read("src/routes/_shell.premium.tsx");
  assert.match(premium, /10 mensagens por dia/);
  assert.match(premium, /2 análises de imagem\/arquivo por dia/);
  assert.match(premium, /100 mensagens por dia/);
  assert.match(premium, /20 análises de imagem\/arquivo por dia/);
});
