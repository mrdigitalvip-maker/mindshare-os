import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("KIVRYN legal pages are public and canonical", async () => {
  const [privacy, terms, legalUrls, sitemap, landing] = await Promise.all([
    read("src/routes/privacy.tsx"),
    read("src/routes/terms.tsx"),
    read("mobile/lib/legal.ts"),
    read("src/routes/sitemap[.]xml.ts"),
    read("src/routes/index.tsx"),
  ]);

  assert.match(privacy, /createFileRoute\("\/privacy"\)/);
  assert.match(terms, /createFileRoute\("\/terms"\)/);
  assert.match(privacy, /Política de Privacidade/);
  assert.match(terms, /Termos de Serviço/);

  assert.match(legalUrls, /https:\/\/kivryn\.co\/privacy/);
  assert.match(legalUrls, /https:\/\/kivryn\.co\/terms/);
  assert.doesNotMatch(legalUrls, /nexora-/i);

  assert.match(sitemap, /path: "\/privacy"/);
  assert.match(sitemap, /path: "\/terms"/);
  assert.match(landing, /to="\/privacy"/);
  assert.match(landing, /to="\/terms"/);
  assert.match(landing, /src="\/icon-512\.png"/);
});
