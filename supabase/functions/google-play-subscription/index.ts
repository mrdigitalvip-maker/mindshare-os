import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";
import { jsonResponse, preflightResponse } from "../_shared/http.ts";

const entitledStates = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const url = Deno.env.get("SUPABASE_URL")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!,
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return jsonResponse(req, { error: { code: "unauthorized" } }, 401);
  const body = await req.json().catch(() => null),
    expectedProduct = Deno.env.get("GOOGLE_PLAY_SUBSCRIPTION_ID"),
    expectedPackage = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME"),
    basePlan = Deno.env.get("GOOGLE_PLAY_BASE_PLAN_ID");
  if (
    !body?.purchaseToken ||
    body.productId !== expectedProduct ||
    body.packageName !== expectedPackage
  )
    return jsonResponse(req, { error: { code: "invalid_product" } }, 400);
  const credentials = JSON.parse(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "{}");
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const token = await auth.getAccessToken();
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(expectedPackage!)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(body.purchaseToken)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    return jsonResponse(req, { error: { code: "provider_verification_failed" } }, 502);
  const purchase = await response.json();
  const item = purchase.lineItems?.find(
    (line: Record<string, unknown>) =>
      line.productId === expectedProduct &&
      (!basePlan || line.offerDetails?.basePlanId === basePlan),
  );
  if (!item) return jsonResponse(req, { error: { code: "invalid_product" } }, 400);
  const expiry = item.expiryTime ? new Date(item.expiryTime) : null;
  const entitled =
    entitledStates.has(purchase.subscriptionState) && !!expiry && expiry.getTime() > Date.now();
  const status =
    purchase.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
      ? "grace_period"
      : purchase.subscriptionState === "SUBSCRIPTION_STATE_CANCELED"
        ? "canceled"
        : entitled
          ? "active"
          : purchase.subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD"
            ? "on_hold"
            : "expired";
  const admin = createClient(url, service);
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        provider: "google_play",
        provider_product_id: expectedProduct,
        provider_purchase_token: body.purchaseToken,
        status,
        entitlement: entitled ? "premium" : "free",
        plan: entitled ? "pro" : "free",
        current_period_end: expiry?.toISOString() ?? null,
        cancel_at_period_end: status === "canceled",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) return jsonResponse(req, { error: { code: "persistence_error" } }, 500);
  return jsonResponse(req, { entitled, status, currentPeriodEnd: expiry?.toISOString() ?? null });
});
