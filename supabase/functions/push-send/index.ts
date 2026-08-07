import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;
  const url = Deno.env.get("SUPABASE_URL"),
    anon = Deno.env.get("SUPABASE_ANON_KEY"),
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY"),
    privateKey = Deno.env.get("VAPID_PRIVATE_KEY"),
    subject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !anon || !service || !publicKey || !privateKey || !subject)
    return jsonResponse({ error: "configuration_error" }, 503, request);
  const bearer = request.headers.get("Authorization") ?? "";
  const authClient = createClient(url, anon, { global: { headers: { Authorization: bearer } } });
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const internal = request.headers.get("x-scheduler-secret") === Deno.env.get("SCHEDULER_SECRET");
  if (!user && !internal) return jsonResponse({ error: "unauthorized" }, 401, request);
  const input = await request.json().catch(() => ({}));
  const userId = internal ? input.userId : user?.id;
  if (!userId || typeof input.title !== "string" || typeof input.body !== "string")
    return jsonResponse({ error: "invalid_request" }, 400, request);
  const safePath =
    typeof input.url === "string" && input.url.startsWith("/") && !input.url.startsWith("//")
      ? input.url
      : "/dashboard";
  const admin = createClient(url, service);
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  if (error) return jsonResponse({ error: "delivery_lookup_failed" }, 500, request);
  webpush.setVapidDetails(subject, publicKey, privateKey);
  let delivered = 0;
  for (const subscription of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: input.title.slice(0, 80),
          body: input.body.slice(0, 240),
          url: safePath,
        }),
        { TTL: 3600 },
      );
      delivered++;
    } catch (cause) {
      const status = Number((cause as { statusCode?: number }).statusCode);
      if (status === 404 || status === 410)
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
    }
  }
  return jsonResponse({ delivered }, 200, request);
});
