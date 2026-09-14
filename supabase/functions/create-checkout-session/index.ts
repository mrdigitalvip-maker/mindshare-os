import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

const CANONICAL_APP_URL = "https://kivryn.co";
const EXPECTED_PRICE = {
  currency: "usd",
  unitAmount: 1200,
  interval: "month",
} as const;

class BillingConfigurationError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "BillingConfigurationError";
  }
}

function priceMatches(price: Stripe.Price) {
  return (
    price.active &&
    price.type === "recurring" &&
    price.currency.toLowerCase() === EXPECTED_PRICE.currency &&
    price.unit_amount === EXPECTED_PRICE.unitAmount &&
    price.recurring?.interval === EXPECTED_PRICE.interval
  );
}

function productName(price: Stripe.Price) {
  const product = price.product;
  return typeof product === "object" && product && "name" in product
    ? String((product as Stripe.Product).name ?? "")
    : "";
}

async function resolveMonthlyPriceId(stripe: Stripe, configuredPriceId?: string) {
  if (configuredPriceId?.startsWith("price_")) {
    try {
      const configured = await stripe.prices.retrieve(configuredPriceId, { expand: ["product"] });
      if (priceMatches(configured)) return configured.id;
      console.warn("[checkout] configured Stripe price does not match the KIVRYN Premium contract");
    } catch (error) {
      const stripeError = error as { statusCode?: number; type?: string };
      if (stripeError.statusCode !== 404) throw error;
      console.warn("[checkout] configured Stripe price no longer exists; attempting safe discovery");
    }
  }

  const page = await stripe.prices.list({
    active: true,
    currency: EXPECTED_PRICE.currency,
    limit: 100,
    expand: ["data.product"],
  });
  const candidates = page.data.filter(priceMatches);
  if (candidates.length === 1) return candidates[0].id;

  const kivryn = candidates.filter((price) => /kivryn/i.test(productName(price)));
  if (kivryn.length === 1) return kivryn[0].id;

  // Keep one migration-safe fallback while the Stripe catalog may still carry the former product name.
  const nexora = candidates.filter((price) => /nexora/i.test(productName(price)));
  if (nexora.length === 1) return nexora[0].id;

  throw new BillingConfigurationError(
    candidates.length === 0 ? "price_not_configured" : "price_configuration_ambiguous",
  );
}

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
  const configuredPriceId = Deno.env.get("STRIPE_PRICE_MONTHLY") ?? undefined;
  if (!supabaseUrl || !anonKey || !stripeKey) return fail("configuration_error", 500);

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
    const priceId = await resolveMonthlyPriceId(stripe, configuredPriceId);
    const trialEligible = !existing?.stripe_subscription_id;
    const idempotencyBucket = Math.floor(Date.now() / (10 * 60_000));
    const session = await stripe.checkout.sessions.create(
      {
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
        success_url: `${CANONICAL_APP_URL}/premium?checkout=success`,
        cancel_url: `${CANONICAL_APP_URL}/premium?checkout=cancelled`,
        allow_promotion_codes: true,
      },
      { idempotencyKey: `kivryn-checkout:${user.id}:${idempotencyBucket}` },
    );
    if (!session.url) return fail("checkout_error", 502);
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      console.error("[checkout] billing configuration error", { code: error.code });
      return fail(error.code, 503);
    }
    const stripeError = error as { statusCode?: number; type?: string };
    console.error("[checkout] Stripe request failed", { type: stripeError.type });
    if (stripeError.statusCode === 429) return fail("stripe_rate_limited", 429);
    if (stripeError.statusCode === 401 || stripeError.statusCode === 403) {
      return fail("stripe_configuration_error", 503);
    }
    return fail("stripe_error", 502);
  }
});
