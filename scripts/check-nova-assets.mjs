import { existsSync } from "node:fs";

const expected = ["nova-640.avif", "nova-640.webp", "nova-960.avif", "nova-960.webp", "nova.png"];
const root = "public/nexora/personas/nova";
const missing = expected.filter((file) => !existsSync(`${root}/${file}`));
if (missing.length) {
  console.log(
    `NOVA_ASSET_MISSING: HUMAN ARTWORK REQUIRED\n${missing.map((file) => `${root}/${file}`).join("\n")}`,
  );
} else {
  console.log("NOVA_ASSET_READY");
}
