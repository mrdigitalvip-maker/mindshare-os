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
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!publicKey) throw new Error("VITE_VAPID_PUBLIC_KEY is not configured.");
    const userId = await getRequiredUserId();
    const prepared = await preparePushNotifications();
    const subscription =
      prepared.subscription ??
      (await prepared.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(publicKey),
      }));
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
    const { data, error } = await supabase.functions.invoke("push-send", {
      body: {
        title: "NEXORA notifications are ready",
        body: "This test used your registered Web Push subscription.",
        url: "/settings",
      },
    });
    if (error) throw error;
    const delivered = Number((data as { delivered?: unknown } | null)?.delivered ?? 0);
    if (!Number.isFinite(delivered) || delivered < 1) {
      throw new Error("No active push subscription accepted the test notification.");
    }
    return delivered;
  },
};
