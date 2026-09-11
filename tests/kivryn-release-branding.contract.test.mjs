import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public discovery metadata uses the KIVRYN production origin", async () => {
  const [robots, sitemap] = await Promise.all([
    read("public/robots.txt"),
    read("src/routes/sitemap[.]xml.ts"),
  ]);

  assert.match(robots, /Sitemap: https:\/\/kivryn\.app\/sitemap\.xml/);
  assert.match(sitemap, /VITE_PUBLIC_SITE_URL \?\? "https:\/\/kivryn\.app"/);
  assert.doesNotMatch(`${robots}\n${sitemap}`, /https:\/\/nexora\.app/i);
});

test("tracked release manifests identify KIVRYN consistently", async () => {
  const [appSource, webManifestSource] = await Promise.all([
    read("mobile/app.json"),
    read("public/manifest.webmanifest"),
  ]);
  const app = JSON.parse(appSource);
  const webManifest = JSON.parse(webManifestSource);

  assert.equal(app.expo.name, "KIVRYN");
  assert.equal(app.expo.scheme, "kivryn");
  assert.equal(app.expo.android.package, "kivryn.app");
  assert.equal(webManifest.short_name, "KIVRYN");
  assert.match(webManifest.name, /^KIVRYN\b/);
});
