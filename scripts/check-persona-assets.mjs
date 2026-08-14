import { existsSync } from "node:fs";

const personas = ["nexora", "atlas", "lyra", "orion"];
const sizes = ["640", "960"];
const expected = personas.flatMap((persona) =>
  sizes.map((size) => `public/nexora/personas/${persona}/presence-${size}.webp`),
);
const missing = expected.filter((file) => !existsSync(file));

if (missing.length) {
  console.error(`PERSONA_ASSET_MISSING\n${missing.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`PERSONA_ASSETS_READY\n${expected.join("\n")}`);
}
