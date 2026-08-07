import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const EXPECTED_PACKAGE = "app.vercel.nexora_os_eosin.twa";
const SHA256_FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const manifest = await readJson("public/manifest.webmanifest");
assert.equal(manifest.id, "/", "manifest id must remain on the root origin");
assert.equal(manifest.start_url, "/dashboard", "TWA and PWA must start at /dashboard");
assert.equal(manifest.scope, "/", "all application routes must remain in scope");
assert.equal(manifest.display, "standalone", "the PWA must not request browser chrome");
assert.deepEqual(
  manifest.display_override,
  ["standalone", "fullscreen"],
  "display fallbacks must not include browser-like modes",
);

for (const forbiddenMode of ["browser", "minimal-ui", "window-controls-overlay"]) {
  assert.ok(
    !manifest.display_override.includes(forbiddenMode),
    `display_override must not contain ${forbiddenMode}`,
  );
}

assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "icons are required");
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith("/"), `icon must be same-origin: ${icon.src}`);
  const image = await readFile(`public${icon.src}`);
  assert.equal(image.toString("ascii", 1, 4), "PNG", `${icon.src} must be a PNG`);
  const [declaredWidth, declaredHeight] = icon.sizes.split("x").map(Number);
  assert.equal(image.readUInt32BE(16), declaredWidth, `${icon.src} width must match the manifest`);
  assert.equal(
    image.readUInt32BE(20),
    declaredHeight,
    `${icon.src} height must match the manifest`,
  );
}

const statements = await readJson("public/.well-known/assetlinks.json");
assert.ok(Array.isArray(statements) && statements.length > 0, "asset links need a statement");
const twaStatement = statements.find(
  ({ target }) => target?.namespace === "android_app" && target.package_name === EXPECTED_PACKAGE,
);
assert.ok(twaStatement, `asset links must contain ${EXPECTED_PACKAGE}`);
assert.ok(
  twaStatement.relation?.includes("delegate_permission/common.handle_all_urls"),
  "asset links must delegate URL handling",
);
assert.ok(
  Array.isArray(twaStatement.target.sha256_cert_fingerprints) &&
    twaStatement.target.sha256_cert_fingerprints.length > 0,
  "asset links require a signing certificate fingerprint",
);
for (const fingerprint of twaStatement.target.sha256_cert_fingerprints) {
  assert.match(fingerprint, SHA256_FINGERPRINT, "fingerprint must be an uppercase SHA-256 value");
}

console.log(`PWA/TWA static configuration is consistent for ${EXPECTED_PACKAGE}.`);
console.log(
  "Fingerprint syntax is valid; ownership must still be verified against Play Console App signing key certificate.",
);
