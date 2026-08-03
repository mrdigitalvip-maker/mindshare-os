import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY edge secrets" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: CORS_HEADERS });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return Response.json(
      { error: "Missing STRIPE_SECRET_KEY edge secret" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const stripePriceId = Deno.env.get("STRIPE_PRICE_MONTHLY");
  if (!stripePriceId) {
    return Response.json(
      { error: "Missing STRIPE_PRICE_MONTHLY edge secret." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const appUrl = Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL");
  if (!appUrl) {
    return Response.json(
      { error: "Missing APP_URL or SITE_URL edge secret. Set the public app origin for success/cancel redirects." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
        },
      },
      success_url: `${appUrl}/premium?checkout=success`,
      cancel_url: `${appUrl}/premium?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return Response.json(
        { error: "Stripe checkout session was created without a redirect URL" },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    return Response.json({ url: session.url }, { headers: CORS_HEADERS });
  } catch (error) {
    const err = error as { message?: string; type?: string; code?: string; statusCode?: number };
    console.error("[create-checkout-session] Stripe error", {
      type: err?.type,
      code: err?.code,
      message: err?.message,
    });
    return Response.json(
      {
        error: err?.message ?? "Stripe checkout session creation failed",
        stripe: { type: err?.type ?? null, code: err?.code ?? null },
      },
      { status: err?.statusCode && err.statusCode < 500 ? 400 : 502, headers: CORS_HEADERS },
    );
  }
});
