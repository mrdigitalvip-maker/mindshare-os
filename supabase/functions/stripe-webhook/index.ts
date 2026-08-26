import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

const headers = { "Content-Type": "application/json" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const fail = (code: string, status: number) => reply({ error: { code } }, status);
type Admin = ReturnType<typeof createClient>;

async function findUser(admin: Admin, subscription: Stripe.Subscription, fallback?: string | null) {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id;
  if (fallback) return fallback;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function persist(admin: Admin, subscription: Stripe.Subscription, fallback?: string | null) {
  const userId = await findUser(admin, subscription, fallback);
  if (!userId) throw new Error("subscription_not_found");
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const now = new Date().toISOString();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      provider: "stripe",
      entitlement:
        ["active", "trialing"].includes(subscription.status) &&
        (!periodEnd || periodEnd * 1000 > Date.now())
          ? "premium"
          : "free",
      provider_product_id: subscription.items.data[0]?.price?.id ?? null,
      plan: ["active", "trialing"].includes(subscription.status) ? "pro" : "free",
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      created_at: new Date(subscription.created * 1000).toISOString(),
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("persistence_error");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("webhook_event_unsupported", 405);
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceKey)
    return fail("configuration_error", 500);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return fail("webhook_signature_invalid", 400);
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch {
    return fail("webhook_signature_invalid", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const id =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!id) throw new Error("subscription_not_found");
        const subscription = await stripe.subscriptions.retrieve(id);
        await persist(
          admin,
          subscription,
          session.client_reference_id ?? session.metadata?.user_id ?? null,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await persist(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parent = (
          invoice as unknown as {
            parent?: { subscription_details?: { subscription?: string | Stripe.Subscription } };
          }
        ).parent;
        const value = parent?.subscription_details?.subscription;
        const id = typeof value === "string" ? value : value?.id;
        if (id) await persist(admin, await stripe.subscriptions.retrieve(id));
        break;
      }
      default:
        // Stripe expects 2xx for deliberately ignored event types to avoid retries.
        return reply({ received: true, handled: false, code: "webhook_event_unsupported" });
    }
  } catch (error) {
    const code =
      error instanceof Error &&
      ["subscription_not_found", "persistence_error"].includes(error.message)
        ? error.message
        : "stripe_error";
    console.error("[stripe-webhook] event failed", { eventId: event.id, type: event.type, code });
    return fail(code, code === "subscription_not_found" ? 404 : 500);
  }
  return reply({ received: true, handled: true });
});
