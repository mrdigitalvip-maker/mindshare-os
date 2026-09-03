type AuthMetadata = Record<string, unknown> | null | undefined;

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a human name only; account identifiers are deliberately rejected. */
export function normalizeHumanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name && !EMAIL_ADDRESS.test(name) ? name : null;
}

/** Canonical identity order for every NEXORA personal-name surface. */
export function resolveCanonicalDisplayName(
  persistedFullName: unknown,
  authMetadata?: AuthMetadata,
): string | null {
  const profileName = normalizeHumanName(persistedFullName);
  if (profileName) return profileName;
  return normalizeHumanName(authMetadata?.full_name) ?? normalizeHumanName(authMetadata?.name);
}

export function firstDisplayName(displayName: unknown): string | null {
  return normalizeHumanName(displayName)?.split(" ")[0] ?? null;
}

export function homeGreeting(displayName: unknown): string {
  const firstName = firstDisplayName(displayName);
  return firstName
    ? `Olá ${firstName}, vamos para o próximo passo.`
    : "Olá, vamos para o próximo passo.";
}
