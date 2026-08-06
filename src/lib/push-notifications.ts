export type PushPreparationResult = {
  registration: ServiceWorkerRegistration;
  subscription: PushSubscription | null;
};

/** Return whether this browser exposes every API required for web push. */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Ask for notification permission only when called from an explicit user action,
 * then prepare the PushManager without creating or transmitting a subscription.
 */
export async function preparePushNotifications(): Promise<PushPreparationResult> {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission was denied."
        : "Notification permission was not granted.",
    );
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return { registration, subscription };
}

/** Convert a public VAPID key for a future PushManager.subscribe call. */
export function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Uint8Array(bytes.buffer);
}
