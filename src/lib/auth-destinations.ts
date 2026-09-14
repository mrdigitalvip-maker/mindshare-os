/** Trusted browser authentication routes. Never accept these from query input. */
export const WEB_AUTH_PATHS = {
  oauth: "/auth/callback",
  emailConfirmation: "/confirm-email",
  passwordRecovery: "/reset-password",
} as const;

export const CANONICAL_WEB_ORIGIN = "https://kivryn.co";

function trustedWebOrigin(origin: string): string {
  try {
    const parsed = new URL(origin);
    const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const safeProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    if (localHost && safeProtocol) return parsed.origin;
  } catch {
    // Fall through to the canonical production origin.
  }
  return CANONICAL_WEB_ORIGIN;
}

/**
 * Authentication must never inherit a Vercel preview/deployment hostname.
 * Supabase callbacks always return to the stable KIVRYN origin in production.
 */
export function webAuthDestination(kind: keyof typeof WEB_AUTH_PATHS, origin: string): string {
  return new URL(WEB_AUTH_PATHS[kind], trustedWebOrigin(origin)).toString();
}
