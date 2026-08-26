export const ANDROID_PURCHASE_AVAILABILITY = "unavailable_for_tester_build" as const;

export type AndroidPurchaseAvailability =
  | typeof ANDROID_PURCHASE_AVAILABILITY
  | "available";

/**
 * Product capability only. This value must never be used to infer a user's
 * canonical Free/Premium entitlement.
 */
export function getAndroidPurchaseAvailability(): AndroidPurchaseAvailability {
  return ANDROID_PURCHASE_AVAILABILITY;
}

export function isPlayBillingAvailable(): boolean {
  return getAndroidPurchaseAvailability() === "available";
}
