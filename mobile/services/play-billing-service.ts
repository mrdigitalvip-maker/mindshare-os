import { getAndroidPurchaseAvailability } from "@/lib/purchase-capabilities";

export const PLAY_BILLING_CONFIG = Object.freeze({
  productId: process.env.EXPO_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_ID ?? "",
  basePlanId: process.env.EXPO_PUBLIC_GOOGLE_PLAY_BASE_PLAN_ID ?? "",
  // Must remain identical to expo.android.package and the Play Console app.
  packageName: "app.vercel.nexora_os_eosin.twa",
});
export type PlayProduct = { productId: string; localizedPrice: string; offerToken?: string };

export class PlayBillingUnavailableError extends Error {
  constructor() {
    super("PLAY_BILLING_UNAVAILABLE_FOR_TESTER_BUILD");
    this.name = "PlayBillingUnavailableError";
  }
}

function unavailable(): never {
  throw new PlayBillingUnavailableError();
}

export async function loadPlayProduct(): Promise<PlayProduct> {
  return unavailable();
}
export async function purchasePremium(_product: PlayProduct): Promise<never> {
  return unavailable();
}
export async function restorePremium(): Promise<never> {
  return unavailable();
}

export { getAndroidPurchaseAvailability };
