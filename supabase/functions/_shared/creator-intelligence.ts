export type CreatorProvider = "youtube" | "tiktok" | "instagram";
export const PROVIDERS = {
  youtube: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    identityUrl: "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    readiness: "CONFIG_REQUIRED",
  },
  tiktok: {
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    identityUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
    scopes: ["user.info.basic", "video.list"],
    readiness: "APP_REVIEW_REQUIRED",
  },
  instagram: {
    scopes: [],
    readiness: "APP_REVIEW_REQUIRED",
    reason: "Professional account and verified Meta app contract required",
  },
} as const;

export const allowedRedirect = (value: string) => {
  const allowlist = (Deno.env.get("CREATOR_OAUTH_REDIRECT_ALLOWLIST") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return allowlist.includes(value);
};
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export const randomUrlSafe = (size = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};
async function encryptionKey() {
  const encoded = Deno.env.get("CREATOR_TOKEN_ENCRYPTION_KEY");
  if (!encoded) throw new Error("encryption_not_configured");
  const raw = Uint8Array.from(atob(encoded), (x) => x.charCodeAt(0));
  if (raw.byteLength !== 32) throw new Error("invalid_encryption_key");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptServerSecret(plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(plaintext),
  );
  return `v1.${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
}
export async function decryptServerSecret(ciphertext: string) {
  const [version, ivText, body] = ciphertext.split(".");
  if (version !== "v1" || !ivText || !body) throw new Error("invalid_ciphertext");
  const iv = Uint8Array.from(atob(ivText), (x) => x.charCodeAt(0));
  const bytes = Uint8Array.from(atob(body), (x) => x.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await encryptionKey(), bytes),
  );
}
export function safeProviderError(status: number) {
  return status === 401
    ? "credential_expired"
    : status === 429
      ? "rate_limited"
      : status >= 500
        ? "provider_unavailable"
        : "provider_request_failed";
}
