/** Trusted browser authentication routes. Never accept these from query input. */
export const WEB_AUTH_PATHS = {
  oauth: "/auth/callback",
  emailConfirmation: "/confirm-email",
  passwordRecovery: "/reset-password",
} as const;

export function webAuthDestination(kind: keyof typeof WEB_AUTH_PATHS, origin: string): string {
  const trustedOrigin = new URL(origin).origin;
  return new URL(WEB_AUTH_PATHS[kind], trustedOrigin).toString();
}
