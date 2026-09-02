export type AuthLinkPayload = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

export type SafeAuthDestination = "/auth/reset-password" | null;

export function safeAuthDestination(value: unknown): SafeAuthDestination {
  return value === "/auth/reset-password" ? value : null;
}

const consumedCallbacks = new Set<number>();
function callbackFingerprint(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1)
    result = (Math.imul(result, 31) + value.charCodeAt(index)) | 0;
  return result;
}

/** Claims a callback without retaining its credentials in memory. */
export function claimAuthCallback(url: string): boolean {
  const fingerprint = callbackFingerprint(url);
  if (consumedCallbacks.has(fingerprint)) return false;
  if (consumedCallbacks.size >= 64)
    consumedCallbacks.delete(consumedCallbacks.values().next().value!);
  consumedCallbacks.add(fingerprint);
  return true;
}

export function parseAuthLink(url: string): AuthLinkPayload {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { code: null, accessToken: null, refreshToken: null, error: "invalid_redirect" };
  }
  const validCallback =
    parsed.protocol === "nexora:" &&
    ((parsed.hostname === "auth" && parsed.pathname === "/callback") ||
      (!parsed.hostname && parsed.pathname === "/auth/callback"));
  if (!validCallback)
    return { code: null, accessToken: null, refreshToken: null, error: "invalid_redirect" };
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const value = (name: string) => parsed.searchParams.get(name) ?? hash.get(name);
  return {
    code: value("code"),
    accessToken: value("access_token"),
    refreshToken: value("refresh_token"),
    error: value("error_description") ?? value("error"),
  };
}
