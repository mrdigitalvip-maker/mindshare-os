import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  updated_at: string | null;
};

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY edge secrets");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

async function updateSubscriptionRecord(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Partial<SubscriptionRow>,
) {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: payload.stripe_customer_id ?? null,
      stripe_subscription_id: payload.stripe_subscription_id ?? null,
      plan: payload.plan ?? null,
      status: payload.status ?? null,
      cancel_at_period_end: payload.cancel_at_period_end ?? null,
      current_period_end: payload.current_period_end ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeWebhookSecret) {
    return Response.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET edge secret." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return Response.json(
      { error: "Missing STRIPE_SECRET_KEY edge secret" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    // Deno requires the async variant (WebCrypto-based signature verification).
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeWebhookSecret);
  } catch (error) {
    return Response.json(
      {
        error: "Invalid Stripe signature",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        if (!userId) break;

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : undefined;

        await updateSubscriptionRecord(supabase, userId, {
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          plan: session.metadata?.plan ?? "pro",
          status: "active",
          cancel_at_period_end: false,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        const periodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;

        await updateSubscriptionRecord(supabase, userId, {
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscription.id,
          plan: subscription.metadata?.plan ?? "pro",
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        const periodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;

        await updateSubscriptionRecord(supabase, userId, {
          stripe_subscription_id: subscription.id,
          plan: "free",
          status: "canceled",
          cancel_at_period_end: true,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
        break;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook] handler error", { type: event.type, message });
    return Response.json(
      { error: message, event: event.type },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return Response.json({ received: true }, { headers: CORS_HEADERS });
});
