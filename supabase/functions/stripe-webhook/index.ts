import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
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
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: payload.stripe_customer_id ?? null,
        stripe_subscription_id: payload.stripe_subscription_id ?? null,
        status: payload.status ?? null,
        price_id: payload.price_id ?? null,
        cancel_at_period_end: payload.cancel_at_period_end ?? null,
        current_period_end: payload.current_period_end ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
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
      { error: "Missing STRIPE_WEBHOOK_SECRET edge secret. Configure the Stripe webhook signing secret manually." },
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
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400, headers: CORS_HEADERS });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch (error) {
    return Response.json(
      {
        error: "Invalid Stripe signature",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabase = getSupabaseAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) {
        return Response.json({ received: true }, { headers: CORS_HEADERS });
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : undefined;

      await updateSubscriptionRecord(supabase, userId, {
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        status: "active",
        price_id: session.metadata?.price_id ?? null,
        cancel_at_period_end: false,
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const userId = subscription.metadata?.user_id;
      if (!userId) {
        return Response.json({ received: true }, { headers: CORS_HEADERS });
      }

      await updateSubscriptionRecord(supabase, userId, {
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id ?? null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: new Date((subscription.current_period_end ?? 0) * 1000).toISOString(),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) {
        return Response.json({ received: true }, { headers: CORS_HEADERS });
      }

      await updateSubscriptionRecord(supabase, userId, {
        stripe_subscription_id: subscription.id,
        status: "canceled",
        cancel_at_period_end: true,
        current_period_end: new Date((subscription.current_period_end ?? 0) * 1000).toISOString(),
      });
      break;
    }
  }

  return Response.json({ received: true }, { headers: CORS_HEADERS });
});
