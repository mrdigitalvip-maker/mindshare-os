import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("web auth callbacks are pinned to the canonical KIVRYN domain", () => {
  const destinations = read("src/lib/auth-destinations.ts");
  assert.match(destinations, /CANONICAL_WEB_ORIGIN = "https:\/\/kivryn\.co"/);
  assert.doesNotMatch(destinations, /nexora-os-eosin\.vercel\.app/);
});

test("authenticated Android users can always reach self-healing onboarding", () => {
  const root = read("mobile/app/index.tsx");
  const onboarding = read("mobile/app/onboarding/index.tsx");
  assert.match(root, /return <Redirect href="\/onboarding" \/>/);
  assert.doesNotMatch(root, /useAccountLifecycle/);
  assert.doesNotMatch(onboarding, /lifecycle\.state === "provisioning"/);
  assert.match(onboarding, /client\.setQueryData/);
});

test("Android release config packages the KIVRYN launcher icon", () => {
  const config = read("mobile/app.json");
  assert.match(config, /kivryn-app-icon\.png/);
  assert.doesNotMatch(config, /"icon": "\.\/assets\/branding\/nexora-app-icon-master\.png"/);
});
