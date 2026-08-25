import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { normalizePushToken } from "@/lib/notification-routing";
import { supabase } from "@/lib/supabase";

export type NativePermission = "granted" | "denied" | "blocked" | "undetermined" | "unsupported";
const DEVICE_KEY = "nexora:device-id";
async function deviceId() {
  const stored = await SecureStore.getItemAsync(DEVICE_KEY);
  if (stored) return stored;
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_KEY, next);
  return next;
}
export async function notificationPermission(): Promise<NativePermission> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return "unsupported";
  const value = await Notifications.getPermissionsAsync();
  if (value.granted) return "granted";
  if (value.canAskAgain) return value.status === "undetermined" ? "undetermined" : "denied";
  return "blocked";
}
export async function registerNativeNotifications(
  userId: string,
): Promise<{ permission: NativePermission; registered: boolean }> {
  const existing = await notificationPermission();
  const permission =
    existing === "granted"
      ? existing
      : (await Notifications.requestPermissionsAsync()).granted
        ? "granted"
        : await notificationPermission();
  if (permission !== "granted") return { permission, registered: false };
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "NEXORA",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS project ID is required for push registration.");
  const token = normalizePushToken((await Notifications.getExpoPushTokenAsync({ projectId })).data);
  if (!token) throw new Error("The push provider returned an invalid token.");
  const { error } = await supabase.from("push_devices").upsert(
    {
      user_id: userId,
      platform: Platform.OS,
      provider: "expo",
      token_or_endpoint: token,
      device_id: await deviceId(),
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider,device_id" },
  );
  if (error) throw error;
  return { permission, registered: true };
}

export async function sendTestNotification(): Promise<{ accepted: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke<{
    accepted?: number;
    failed?: number;
    error?: string;
  }>("push-send", {
    body: {
      title: "NEXORA is connected",
      body: "Native notifications are ready on this device.",
      url: "/dashboard",
    },
  });
  if (error || data?.error) throw new Error("The test notification could not be sent.");
  return { accepted: data?.accepted ?? 0, failed: data?.failed ?? 0 };
}

/** One local reminder per task. Permission is requested only after an explicit user action. */
export async function scheduleTaskReminder(
  task: { id: string; title: string },
  reminderAt: string,
) {
  const permission = await notificationPermission();
  const granted =
    permission === "granted" || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { scheduled: false as const, permission: await notificationPermission() };
  await cancelTaskReminder(task.id);
  const date = new Date(reminderAt);
  if (!Number.isFinite(date.getTime()) || date <= new Date())
    throw new Error("Invalid reminder date.");
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: `Hora de avançar em “${task.title}”. Abra para revisar o próximo passo.`,
      data: { kind: "task", resourceId: task.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
  return { scheduled: true as const, permission: "granted" as const, identifier };
}

export async function cancelTaskReminder(taskId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(({ content }) => content.data?.kind === "task" && content.data.resourceId === taskId)
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
}
