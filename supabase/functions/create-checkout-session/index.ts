import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => jsonResponse(req, body, status);
  const fail = (code: string, status: number) => json({ error: { code } }, status);
  if (req.method === "OPTIONS") return preflightResponse(req);
  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) return rejectedOrigin;
  if (req.method !== "POST") return fail("checkout_error", 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return fail("unauthorized", 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRICE_MONTHLY");
  const appUrlValue = Deno.env.get("APP_URL");
  if (!supabaseUrl || !anonKey || !stripeKey || !priceId || !appUrlValue) {
    return fail("configuration_error", 500);
  }
  if (!priceId.startsWith("price_")) return fail("invalid_price", 500);

  let appUrl: URL;
  try {
    appUrl = new URL(appUrlValue);
    if (!["http:", "https:"].includes(appUrl.protocol)) throw new Error();
  } catch {
    return fail("configuration_error", 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return fail("unauthorized", 401);

  const { data: existing, error: lookupError } = await supabase
    .from("subscriptions")
    .select("status, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) return fail("persistence_error", 500);
  if (existing && ["active", "trialing"].includes(existing.status ?? "")) {
    return fail("subscription_exists", 409);
  }

  const stripe = new Stripe(stripeKey);
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.type !== "recurring") return fail("invalid_price", 400);

    // A prior Stripe subscription means this user has already consumed the one-time trial.
    const trialEligible = !existing?.stripe_subscription_id;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: "pro" },
      subscription_data: {
        metadata: { user_id: user.id, plan: "pro" },
        ...(trialEligible ? { trial_period_days: 7 } : {}),
      },
      success_url: new URL("/premium?checkout=success", appUrl).toString(),
      cancel_url: new URL("/premium?checkout=cancelled", appUrl).toString(),
      allow_promotion_codes: true,
    });
    if (!session.url) return fail("checkout_error", 502);
    return json({ url: session.url });
  } catch (error) {
    const stripeError = error as { statusCode?: number; type?: string };
    console.error("[checkout] Stripe request failed", { type: stripeError.type });
    if (stripeError.statusCode === 429) return fail("stripe_rate_limited", 429);
    if (stripeError.statusCode === 404) return fail("invalid_price", 400);
    return fail("stripe_error", 502);
  }
});
