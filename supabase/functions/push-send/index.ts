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
  if (!url || !anon || !service)
    return jsonResponse({ error: "configuration_error" }, 503, request);
  const bearer = request.headers.get("Authorization") ?? "";
  const authClient = createClient(url, anon, { global: { headers: { Authorization: bearer } } });
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  const internal = Boolean(
    schedulerSecret && request.headers.get("x-scheduler-secret") === schedulerSecret,
  );
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
  const [{ data: subscriptions, error }, { data: devices, error: devicesError }] =
    await Promise.all([
      admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId),
      admin
        .from("push_devices")
        .select("id,provider,token_or_endpoint")
        .eq("user_id", userId)
        .eq("enabled", true),
    ]);
  if (error || devicesError) return jsonResponse({ error: "delivery_lookup_failed" }, 500, request);
  if (publicKey && privateKey && subject) webpush.setVapidDetails(subject, publicKey, privateKey);
  let accepted = 0,
    failed = 0;
  for (const subscription of publicKey && privateKey && subject ? (subscriptions ?? []) : []) {
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
      accepted++;
    } catch (cause) {
      const status = Number((cause as { statusCode?: number }).statusCode);
      if (status === 404 || status === 410)
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      failed++;
    }
  }
  const route = nativeRoute(safePath);
  for (const device of devices ?? []) {
    if (device.provider !== "expo") continue;
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          to: device.token_or_endpoint,
          title: input.title.slice(0, 80),
          body: input.body.slice(0, 240),
          sound: "default",
          data: route,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        data?: { status?: string; details?: { error?: string } };
      } | null;
      if (response.ok && result?.data?.status === "ok") accepted++;
      else {
        failed++;
        if (result?.data?.details?.error === "DeviceNotRegistered")
          await admin.from("push_devices").update({ enabled: false }).eq("id", device.id);
      }
    } catch {
      failed++;
    }
  }
  return jsonResponse({ accepted, failed }, 200, request);
});

function nativeRoute(path: string) {
  const project = path.match(/^\/projects\/([A-Za-z0-9-]+)$/)?.[1];
  if (project) return { kind: "project", resourceId: project };
  const study = path.match(/^\/studies\/([A-Za-z0-9-]+)$/)?.[1];
  if (study) return { kind: "study", resourceId: study };
  const task = path.match(/^\/tasks\/([A-Za-z0-9-]+)$/)?.[1];
  if (task) return { kind: "task", resourceId: task };
  const journey = path.match(/^\/journeys\/([A-Za-z0-9-]+)$/)?.[1];
  if (journey) return { kind: "journey", resourceId: journey };
  if (path === "/journeys") return { kind: "weekly_challenge" };
  return { kind: "general" };
}
