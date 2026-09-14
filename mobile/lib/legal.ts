export const LEGAL_URLS = {
  privacyPolicy: "https://kivryn.co/privacy",
  termsOfService: "https://kivryn.co/terms",
} as const;

export function isConfiguredLegalUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
