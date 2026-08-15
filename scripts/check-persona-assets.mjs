import { readFileSync } from "node:fs";

const allPersonas = ["nexora", "atlas", "lyra", "orion"];
const requestedPersonas = process.argv.slice(2);
const unknownPersonas = requestedPersonas.filter((persona) => !allPersonas.includes(persona));

if (unknownPersonas.length) {
  console.error(`UNKNOWN_PERSONA\n${unknownPersonas.join("\n")}`);
  process.exit(1);
}

const personas = requestedPersonas.length ? requestedPersonas : allPersonas;
const variants = [
  { name: "640", width: 640, height: 800 },
  { name: "960", width: 960, height: 1200 },
];

function readWebpDimensions(file) {
  const data = readFileSync(file);
  if (
    data.length < 30 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("not a valid WebP container");
  }

  const format = data.toString("ascii", 12, 16);
  if (format === "VP8 ") {
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) {
      throw new Error("invalid VP8 frame header");
    }
    return {
      width: data.readUInt16LE(26) & 0x3fff,
      height: data.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === "VP8L") {
    if (data[20] !== 0x2f) throw new Error("invalid VP8L signature");
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === "VP8X") {
    return {
      width: data.readUIntLE(24, 3) + 1,
      height: data.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`unsupported WebP encoding ${format}`);
}

const failures = [];
const ready = [];
for (const persona of personas) {
  for (const variant of variants) {
    const file = `public/nexora/personas/${persona}/presence-${variant.name}.webp`;
    try {
      const dimensions = readWebpDimensions(file);
      if (dimensions.width !== variant.width || dimensions.height !== variant.height) {
        throw new Error(
          `expected ${variant.width}x${variant.height}, received ${dimensions.width}x${dimensions.height}`,
        );
      }
      ready.push(`${file} (${dimensions.width}x${dimensions.height})`);
    } catch (error) {
      const reason = error?.code === "ENOENT" ? "missing" : error.message;
      failures.push(`${file}: ${reason}`);
    }
  }
}

if (failures.length) {
  console.error(`PERSONA_ASSET_INVALID\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`PERSONA_ASSETS_READY\n${ready.join("\n")}`);
}
