function fnv1a(input: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministic UUID-shaped identifier for executor idempotency keys.
 * This is not used as a security token; authorization remains user-scoped in Postgres.
 */
export function deterministicKivrynUuid(input: string) {
  const words = [
    fnv1a(input, 0x811c9dc5),
    fnv1a(input, 0x9e3779b9),
    fnv1a(input, 0x85ebca6b),
    fnv1a(input, 0xc2b2ae35),
  ];
  const hex = words.map((word) => word.toString(16).padStart(8, "0")).join("");
  const version = `5${hex.slice(13, 16)}`;
  const variantNibble = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
