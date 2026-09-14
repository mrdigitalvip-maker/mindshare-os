import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

const CANONICAL_APP_URL = "https://kivryn.co";

Deno.serve(async (req) => {
  const response = (code: string, status: number) => jsonResponse(req, { error: { code } }, status);
  if (req.method === "OPTIONS") return preflightResponse(req);
  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) return rejectedOrigin;
  if (req.method !== "POST") return response("portal_unavailable", 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return response("unauthorized", 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !stripeKey) return response("configuration_error", 500);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return response("unauthorized", 401);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return response("persistence_error", 500);
  if (!data?.stripe_customer_id) return response("subscription_not_found", 404);

  try {
    const idempotencyBucket = Math.floor(Date.now() / (5 * 60_000));
    const session = await new Stripe(stripeKey).billingPortal.sessions.create(
      {
        customer: data.stripe_customer_id,
        return_url: `${CANONICAL_APP_URL}/premium`,
      },
      { idempotencyKey: `kivryn-portal:${user.id}:${idempotencyBucket}` },
    );
    return jsonResponse(req, { url: session.url });
  } catch (error) {
    const stripeError = error as { statusCode?: number; type?: string };
    console.error("[portal] Stripe request failed", { type: stripeError.type });
    if (stripeError.statusCode === 429) return response("stripe_rate_limited", 429);
    if (stripeError.statusCode === 401 || stripeError.statusCode === 403) {
      return response("stripe_configuration_error", 503);
    }
    return response("portal_unavailable", 502);
  }
});
