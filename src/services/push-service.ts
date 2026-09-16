/* eslint-disable @typescript-eslint/no-explicit-any -- Phase 3 tables are typed after the deployment migration regenerates Database. */
import {
  decodeVapidPublicKey,
  isPushNotificationSupported,
  preparePushNotifications,
} from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";
const db = supabase as unknown as { from: (table: string) => any };
export type NotificationPreferences = {
  tasks_enabled: boolean;
  projects_enabled: boolean;
  studies_enabled: boolean;
  studio_enabled: boolean;
  daily_summary_enabled: boolean;
  timezone: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};
export type PushSubscriptionState = "subscribed" | "not-subscribed" | "unavailable";

type WebPushConfiguration = {
  configured: true;
  publicKey: string;
};

type PushDeliveryResult = {
  accepted?: unknown;
  delivered?: unknown;
  failed?: unknown;
  webPushConfigured?: unknown;
  webSubscriptions?: unknown;
  webFailureStatuses?: unknown;
};

const defaults: NotificationPreferences = {
  tasks_enabled: true,
  projects_enabled: true,
  studies_enabled: true,
  studio_enabled: true,
  daily_summary_enabled: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

async function webPushConfiguration(): Promise<WebPushConfiguration> {
  const { data, error } = await supabase.functions.invoke("push-send", {
    body: { action: "config" },
  });
  if (error) throw error;
  const result = data as { configured?: unknown; publicKey?: unknown } | null;
  if (result?.configured !== true || typeof result.publicKey !== "string" || !result.publicKey) {
    throw new Error("Web Push backend VAPID configuration is unavailable.");
  }
  return { configured: true, publicKey: result.publicKey };
}

function subscriptionUsesPublicKey(subscription: PushSubscription, publicKey: string): boolean {
  const applicationServerKey = subscription.options.applicationServerKey;
  if (!applicationServerKey) return false;
  const current = new Uint8Array(applicationServerKey);
  const expected = decodeVapidPublicKey(publicKey);
  return current.length === expected.length && current.every((byte, index) => byte === expected[index]);
}

export const PushService = {
  support() {
    return !isPushNotificationSupported()
      ? "unsupported"
      : Notification.permission === "denied"
        ? "blocked"
        : Notification.permission === "granted"
          ? "enabled"
          : "available";
  },
  async subscriptionState(): Promise<PushSubscriptionState> {
    if (!isPushNotificationSupported() || Notification.permission !== "granted") {
      return "unavailable";
    }
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return "not-subscribed";
    return (await registration.pushManager.getSubscription()) ? "subscribed" : "not-subscribed";
  },
  async preferences(): Promise<NotificationPreferences> {
    const userId = await getRequiredUserId();
    const { data, error } = await db
      .from("notification_preferences")
      .select(
        "tasks_enabled,projects_enabled,studies_enabled,studio_enabled,daily_summary_enabled,timezone,quiet_hours_start,quiet_hours_end",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? defaults;
  },
  async save(patch: Partial<NotificationPreferences>) {
    const userId = await getRequiredUserId();
    const current = await this.preferences();
    const { error } = await db
      .from("notification_preferences")
      .upsert({ user_id: userId, ...current, ...patch, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async enable() {
    const userId = await getRequiredUserId();
    const config = await webPushConfiguration();
    const prepared = await preparePushNotifications();
    let subscription = prepared.subscription;

    if (subscription && !subscriptionUsesPublicKey(subscription, config.publicKey)) {
      const staleEndpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const { error: staleDeleteError } = await db
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", staleEndpoint);
      if (staleDeleteError) throw staleDeleteError;
      subscription = null;
    }

    subscription ??= await prepared.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(config.publicKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
      throw new Error("The browser returned an incomplete push subscription.");
    const { error } = await db.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
    if (error) throw error;
    // Scheduled reminders iterate persisted preferences. Ensure a first-time
    // subscriber has an owner-scoped row even before changing a toggle.
    await this.save({});
    return subscription;
  },
  async sendTest(): Promise<number> {
    // Make the test path self-healing. If the backend VAPID key changed or the
    // browser holds a stale subscription, repair/persist it immediately before
    // asking the provider to deliver the test notification.
    await this.enable();

    const { data, error } = await supabase.functions.invoke("push-send", {
      body: {
        title: "KIVRYN notifications are ready",
        body: "This test used your registered Web Push subscription.",
        url: "/settings",
      },
    });
    if (error) throw error;
    const result = data as PushDeliveryResult | null;
    const accepted = Number(result?.accepted ?? result?.delivered ?? 0);
    if (!Number.isFinite(accepted) || accepted < 1) {
      if (result?.webPushConfigured === false) {
        throw new Error("Web Push backend VAPID configuration is incomplete.");
      }
      const failed = Number(result?.failed ?? 0);
      const subscriptions = Number(result?.webSubscriptions ?? 0);
      const statuses = Array.isArray(result?.webFailureStatuses)
        ? result.webFailureStatuses.filter((value): value is number => typeof value === "number")
        : [];
      const detail = statuses.length > 0 ? ` Provider HTTP: ${statuses.join(", ")}.` : "";
      throw new Error(
        `No push delivery was accepted (${subscriptions} web subscription(s), ${failed} failed).${detail}`,
      );
    }
    return accepted;
  },
};
