export type NotificationPlatform = "web" | "android" | "ios";
export type NotificationProvider = "webpush" | "expo" | "fcm" | "apns";
export type NativeNotificationRoute =
  | "/dashboard"
  | "/journeys"
  | `/journeys/${string}`
  | `/projects/${string}`
  | `/studies/${string}`
  | `/tasks/${string}`;

export function normalizePushToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token) ? token : null;
}

export function notificationRoute(data: unknown): NativeNotificationRoute {
  if (!data || typeof data !== "object") return "/dashboard";
  const payload = data as Record<string, unknown>;
  const id = typeof payload.resourceId === "string" ? payload.resourceId.trim() : "";
  if (!id || !/^[A-Za-z0-9-]+$/.test(id)) return "/dashboard";
  if (payload.kind === "project") return `/projects/${id}`;
  if (payload.kind === "study") return `/studies/${id}`;
  if (payload.kind === "task") return `/tasks/${id}`;
  if (payload.kind === "journey" || payload.kind === "mission")
    return payload.kind === "journey" ? `/journeys/${id}` : "/journeys";
  if (payload.kind === "weekly_challenge") return "/journeys";
  return "/dashboard";
}
