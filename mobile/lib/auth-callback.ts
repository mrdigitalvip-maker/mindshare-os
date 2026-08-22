export type AuthLinkPayload = { code: string | null; accessToken: string | null; refreshToken: string | null; error: string | null };

export function parseAuthLink(url: string): AuthLinkPayload {
  if (!url.startsWith("nexora://auth/callback") && !url.startsWith("nexora:///auth/callback"))
    return { code: null, accessToken: null, refreshToken: null, error: "invalid_redirect" };
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const value = (name: string) => parsed.searchParams.get(name) ?? hash.get(name);
  return { code: value("code"), accessToken: value("access_token"), refreshToken: value("refresh_token"), error: value("error_description") ?? value("error") };
}
