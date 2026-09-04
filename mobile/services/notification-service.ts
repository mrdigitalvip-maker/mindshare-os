import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { normalizePushToken } from "@/lib/notification-routing";
import {
  normalizeNotificationPermission,
  normalizeProjectId,
  type NativePermission,
} from "@/lib/notification-contract";
import { supabase } from "@/lib/supabase";

export type { NativePermission } from "@/lib/notification-contract";
export type NotificationDiagnostic =
  | "permission"
  | "channel"
  | "project-config"
  | "token"
  | "registration"
  | "network"
  | "remote-provider"
  | "unexpected";
export type NotificationDeviceState = {
  platformSupported: boolean;
  permission: NativePermission;
  channelReady: boolean;
  projectConfigAvailable: boolean;
  deviceRegistered: boolean;
  remotePushReady: boolean;
};
export class NotificationSetupError extends Error {
  constructor(readonly category: NotificationDiagnostic) {
    super(category);
    this.name = "NotificationSetupError";
  }
}

const DEVICE_KEY = "nexora:device-id";
const DEVICE_OWNER_KEY = "nexora:push-device-owner";
async function deviceId() {
  const stored = await SecureStore.getItemAsync(DEVICE_KEY);
  if (stored) return stored;
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_KEY, next);
  return next;
}
const projectId = () =>
  normalizeProjectId(
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
  );

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return true;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "NEXORA",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    return Boolean(await Notifications.getNotificationChannelAsync("default"));
  } catch {
    throw new NotificationSetupError("channel");
  }
}

export async function isCurrentDeviceRegistered(userId: string): Promise<boolean> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  const { data, error } = await supabase
    .from("push_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "expo")
    .eq("device_id", await deviceId())
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw new NotificationSetupError("registration");
  return Boolean(data);
}

export async function getNotificationDeviceState(userId: string): Promise<NotificationDeviceState> {
  const platformSupported = Platform.OS === "android" || Platform.OS === "ios";
  const permission = await notificationPermission();
  let channelReady = Platform.OS === "ios";
  if (Platform.OS === "android") {
    try {
      channelReady = Boolean(await Notifications.getNotificationChannelAsync("default"));
    } catch {
      channelReady = false;
    }
  }
  const deviceRegistered = permission === "granted" && (await isCurrentDeviceRegistered(userId));
  const projectConfigAvailable = Boolean(projectId());
  return {
    platformSupported,
    permission,
    channelReady,
    projectConfigAvailable,
    deviceRegistered,
    remotePushReady:
      permission === "granted" && channelReady && projectConfigAvailable && deviceRegistered,
  };
}

export async function disableCurrentPushDevice(userId: string): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  const { error } = await supabase
    .from("push_devices")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "expo")
    .eq("device_id", await deviceId());
  if (error) throw new NotificationSetupError("registration");
  if ((await SecureStore.getItemAsync(DEVICE_OWNER_KEY)) === userId)
    await SecureStore.deleteItemAsync(DEVICE_OWNER_KEY);
}
export async function notificationPermission(): Promise<NativePermission> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return "unsupported";
  const value = await Notifications.getPermissionsAsync();
  return normalizeNotificationPermission(value);
}

/** Must only be called from an explicit activation action. */
export async function registerNativeNotifications(
  userId: string,
): Promise<{ permission: NativePermission; registered: boolean }> {
  await ensureAndroidChannel();
  const existing = await notificationPermission();
  const permission =
    existing === "granted"
      ? existing
      : (await Notifications.requestPermissionsAsync()).granted
        ? "granted"
        : await notificationPermission();
  if (permission !== "granted") return { permission, registered: false };
  const easProjectId = projectId();
  if (!easProjectId) throw new NotificationSetupError("project-config");
  let rawToken: unknown;
  try {
    rawToken = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
  } catch {
    throw new NotificationSetupError("token");
  }
  const token = normalizePushToken(rawToken);
  if (!token) throw new NotificationSetupError("token");
  const id = await deviceId();
  const currentOwner = await SecureStore.getItemAsync(DEVICE_OWNER_KEY);
  // A registration owned by another signed-in account must be disabled through that
  // account's authenticated logout before this physical installation can be reassigned.
  if (currentOwner && currentOwner !== userId) throw new NotificationSetupError("registration");
  const { error } = await supabase.from("push_devices").upsert(
    {
      user_id: userId,
      platform: Platform.OS,
      provider: "expo",
      token_or_endpoint: token,
      device_id: id,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider,device_id" },
  );
  if (error) throw new NotificationSetupError("registration");
  // Never report ready based only on the write response: read the canonical row back.
  if (!(await isCurrentDeviceRegistered(userId))) throw new NotificationSetupError("registration");
  await SecureStore.setItemAsync(DEVICE_OWNER_KEY, userId);
  return { permission, registered: true };
}

export async function scheduleLocalNotificationTest(): Promise<string> {
  if ((await notificationPermission()) !== "granted")
    throw new NotificationSetupError("permission");
  await ensureAndroidChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Teste NEXORA",
      body: "As notificações locais estão funcionando neste aparelho.",
      data: { kind: "general" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
}

export async function sendTestNotification(): Promise<{ accepted: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke<{
    accepted?: number;
    failed?: number;
    error?: string;
  }>("push-send", {
    body: {
      title: "Teste remoto NEXORA",
      body: "Teste remoto enviado pela NEXORA.",
      url: "/dashboard",
    },
  });
  if (error || data?.error) throw new NotificationSetupError("remote-provider");
  return { accepted: data?.accepted ?? 0, failed: data?.failed ?? 0 };
}

/** One local reminder per task. Permission is requested only after an explicit user action. */
export async function scheduleTaskReminder(
  task: { id: string; title: string },
  reminderAt: string,
) {
  const date = new Date(reminderAt);
  if (!Number.isFinite(date.getTime()) || date <= new Date())
    throw new Error("Invalid reminder date.");
  const permission = await notificationPermission();
  const granted =
    permission === "granted" || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { scheduled: false as const, permission: await notificationPermission() };
  await ensureAndroidChannel();
  await cancelTaskReminder(task.id);
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
