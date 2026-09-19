import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("auth uses canonical KIVRYN icon and keeps auth surfaces noindex", async () => {
  const source = await readFile(new URL("../src/routes/auth.tsx", import.meta.url), "utf8");
  assert.match(source, /src="\/icon-512\.png"/);
  assert.doesNotMatch(source, /nexora-icon\.png/);
  assert.match(source, /name: "robots", content: "noindex"/);
});
