import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public sitemap is permanently canonical to kivryn.co", async () => {
  const source = await read("src/routes/sitemap[.]xml.ts");
  assert.match(source, /const BASE_URL = "https:\/\/kivryn\.co"/);
  assert.doesNotMatch(source, /VITE_PUBLIC_SITE_URL/);
  assert.doesNotMatch(source, /nexora\.app/);
});

test("authenticated shell is noindex even when its client-side auth guard is pending", async () => {
  const source = await read("src/routes/_shell.tsx");
  assert.match(source, /noindex,nofollow,noarchive/);
  assert.match(source, /name: "googlebot"/);
});

test("public discovery files stay canonical and auth utility routes stay noindex", async () => {
  const [robots, auth, callback, confirm, reset, onboarding] = await Promise.all([
    read("public/robots.txt"),
    read("src/routes/auth.tsx"),
    read("src/routes/auth.callback.tsx"),
    read("src/routes/confirm-email.tsx"),
    read("src/routes/reset-password.tsx"),
    read("src/routes/onboarding.tsx"),
  ]);
  assert.match(robots, /Sitemap: https:\/\/kivryn\.co\/sitemap\.xml/);
  for (const source of [auth, callback, confirm, reset, onboarding]) {
    assert.match(source, /robots"[\s\S]*noindex/);
  }
});
