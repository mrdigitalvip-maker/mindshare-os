export const LEGAL_URLS = {
  privacyPolicy: "https://nexora-privacy-policy.vercel.app/",
  termsOfService: "https://nexora-terms-of-service.vercel.app/",
} as const;

export function isConfiguredLegalUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
