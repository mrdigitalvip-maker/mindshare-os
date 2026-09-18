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

async function persist(
  admin: Admin,
  subscription: Stripe.Subscription,
  event: Stripe.Event,
  fallback?: string | null,
) {
  const userId = await findUser(admin, subscription, fallback);
  if (!userId) throw new Error("subscription_not_found");
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const fields = subscription as unknown as {
    current_period_end?: number | null;
    trial_start?: number | null;
  };
  const { data, error } = await admin.rpc("persist_stripe_subscription_state", {
    p_user: userId,
    p_customer_id: customerId,
    p_subscription_id: subscription.id,
    p_product_id: subscription.items.data[0]?.price?.id ?? null,
    p_status: subscription.status,
    p_period_end: fields.current_period_end
      ? new Date(fields.current_period_end * 1000).toISOString()
      : null,
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_subscription_created_at: new Date(subscription.created * 1000).toISOString(),
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created_at: new Date(event.created * 1000).toISOString(),
    p_trial_started_at: fields.trial_start
      ? new Date(fields.trial_start * 1000).toISOString()
      : null,
  });
  if (error) throw new Error("persistence_error");
  return String(data ?? "applied");
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
    const { data: processed, error: processedLookupError } = await admin
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (processedLookupError) throw new Error("persistence_error");
    if (processed) return reply({ received: true, handled: true, duplicate: true });

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
          event,
          session.client_reference_id ?? session.metadata?.user_id ?? null,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const snapshot = event.data.object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(snapshot.id);
        await persist(admin, subscription, event);
        break;
      }
      case "customer.subscription.deleted": {
        const snapshot = event.data.object as Stripe.Subscription;
        let subscription = snapshot;
        try {
          subscription = await stripe.subscriptions.retrieve(snapshot.id);
        } catch (error) {
          const stripeError = error as { statusCode?: number };
          if (stripeError.statusCode !== 404) throw error;
        }
        await persist(admin, subscription, event);
        break;
      }
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
        if (id) await persist(admin, await stripe.subscriptions.retrieve(id), event);
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
