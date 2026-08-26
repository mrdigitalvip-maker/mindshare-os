import { Platform } from "react-native";
import * as Iap from "react-native-iap";
import { supabase } from "@/lib/supabase";

export const PLAY_BILLING_CONFIG = Object.freeze({
  productId: process.env.EXPO_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_ID ?? "",
  basePlanId: process.env.EXPO_PUBLIC_GOOGLE_PLAY_BASE_PLAN_ID ?? "",
  packageName: "com.nexora.app",
});
export type PlayProduct = { productId: string; localizedPrice: string; offerToken?: string };
const configured = () => {
  if (Platform.OS !== "android") throw new Error("PLAY_ANDROID_ONLY");
  if (!PLAY_BILLING_CONFIG.productId) throw new Error("PLAY_PRODUCT_NOT_CONFIGURED");
};
const productIdOf = (value: Record<string, unknown>) => String(value.productId ?? value.id ?? "");
const tokenOf = (value: Record<string, unknown>) =>
  String(value.purchaseToken ?? value.transactionReceipt ?? "");

export async function loadPlayProduct(): Promise<PlayProduct> {
  configured();
  await Iap.initConnection();
  const products = await Iap.fetchProducts({ skus: [PLAY_BILLING_CONFIG.productId], type: "subs" });
  const raw = products.find(
    (item: Record<string, unknown>) =>
      productIdOf(item as unknown as Record<string, unknown>) === PLAY_BILLING_CONFIG.productId,
  ) as unknown as Record<string, unknown> | undefined;
  if (!raw) throw new Error("PLAY_PRODUCT_UNAVAILABLE");
  const offers = raw.subscriptionOfferDetailsAndroid as Array<Record<string, unknown>> | undefined;
  const offer =
    offers?.find(
      (item) =>
        !PLAY_BILLING_CONFIG.basePlanId || item.basePlanId === PLAY_BILLING_CONFIG.basePlanId,
    ) ?? offers?.[0];
  const phases = offer?.pricingPhases as
    { pricingPhaseList?: Array<Record<string, unknown>> } | undefined;
  const price =
    phases?.pricingPhaseList?.at(-1)?.formattedPrice ?? raw.localizedPrice ?? raw.displayPrice;
  return {
    productId: PLAY_BILLING_CONFIG.productId,
    localizedPrice: String(price ?? "US$ 12/mês"),
    offerToken: typeof offer?.offerToken === "string" ? offer.offerToken : undefined,
  };
}

async function verify(raw: Record<string, unknown>) {
  const purchaseToken = tokenOf(raw);
  if (!purchaseToken || productIdOf(raw) !== PLAY_BILLING_CONFIG.productId)
    throw new Error("PLAY_INVALID_PURCHASE");
  const { data, error } = await supabase.functions.invoke("google-play-subscription", {
    body: {
      purchaseToken,
      productId: PLAY_BILLING_CONFIG.productId,
      packageName: PLAY_BILLING_CONFIG.packageName,
    },
  });
  if (error || !data?.entitled) throw new Error("PLAY_VERIFICATION_FAILED");
  await Iap.finishTransaction({ purchase: raw as never, isConsumable: false });
  return data;
}
export async function purchasePremium(product: PlayProduct) {
  const purchase = await Iap.requestPurchase({
    request: {
      android: {
        skus: [product.productId],
        ...(product.offerToken
          ? { subscriptionOffers: [{ sku: product.productId, offerToken: product.offerToken }] }
          : {}),
      },
    },
    type: "subs",
  });
  const raw = (Array.isArray(purchase) ? purchase[0] : purchase) as unknown as Record<
    string,
    unknown
  >;
  if (String(raw.purchaseStateAndroid ?? "").toLowerCase() === "pending") return { pending: true };
  await verify(raw);
  return { pending: false };
}
export async function restorePremium() {
  configured();
  await Iap.initConnection();
  const purchases = await Iap.getAvailablePurchases();
  const owned = purchases.find(
    (item: Record<string, unknown>) =>
      productIdOf(item as unknown as Record<string, unknown>) === PLAY_BILLING_CONFIG.productId,
  );
  if (!owned) throw new Error("PLAY_NOT_OWNED");
  return verify(owned as unknown as Record<string, unknown>);
}
