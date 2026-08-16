import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const EXPECTED_PACKAGE = "app.vercel.nexora_os_eosin.twa";
const REQUIRED_SIGNING_FINGERPRINTS = [
  "C0:5B:11:7A:2A:93:B8:5C:EC:A9:61:3C:76:97:7E:D7:BB:FC:38:09:50:DF:16:65:04:5A:FD:A3:D6:92:AB:3F",
  "24:11:49:B1:2D:2C:07:5A:E9:00:D8:36:A9:BB:5F:7F:BA:9F:F9:43:71:28:21:70:13:B5:BA:01:96:CD:BF:CD",
  "18:9F:73:63:6C:C8:DA:8C:18:A5:D0:56:55:AE:1A:7D:2C:5B:9A:F3:BE:6E:1D:55:86:8D:02:A9:D5:A5:97:F3",
  "16:36:AA:D5:AA:20:4A:95:55:12:BA:3A:68:14:57:B1:F6:72:47:07:8F:F2:07:4D:96:20:AE:9A:C7:A5:30:D0",
];
const PLAY_CLASSIC_SIGNING_FINGERPRINT = REQUIRED_SIGNING_FINGERPRINTS[2];
const PLAY_HYBRID_SIGNING_FINGERPRINT = REQUIRED_SIGNING_FINGERPRINTS[3];
const SHA256_FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const assertBuiltAssetLinks = async () => {
  const sourcePath = "public/.well-known/assetlinks.json";
  const builtPath = ".output/public/.well-known/assetlinks.json";

  try {
    await access(".output/public");
  } catch {
    console.log(
      "Production output is absent; run npm run build before checking its asset links copy.",
    );
    return;
  }

  const [source, built] = await Promise.all([readFile(sourcePath), readFile(builtPath)]);
  assert.deepEqual(built, source, `${builtPath} must be an exact copy of ${sourcePath}`);
};

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
for (const fingerprint of REQUIRED_SIGNING_FINGERPRINTS) {
  assert.ok(
    twaStatement.target.sha256_cert_fingerprints.includes(fingerprint),
    `asset links must authorize required signing certificate ${fingerprint}`,
  );
}

await assertBuiltAssetLinks();

console.log(`PWA/TWA static configuration is consistent for ${EXPECTED_PACKAGE}.`);
console.log(
  `Confirmed Play Classic signing fingerprint is authorized: ${PLAY_CLASSIC_SIGNING_FINGERPRINT}`,
);
console.log(
  `Confirmed Play hybrid signing fingerprint is authorized: ${PLAY_HYBRID_SIGNING_FINGERPRINT}`,
);
