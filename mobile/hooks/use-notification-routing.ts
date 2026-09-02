import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { notificationRoute } from "@/lib/notification-routing";
let lastHandledResponseId: string | undefined;

export function shouldHandleNotificationResponse(identifier: string) {
  if (!identifier || identifier === lastHandledResponseId) return false;
  lastHandledResponseId = identifier;
  return true;
}
export function useNotificationRouting() {
  useEffect(() => {
    let received: { remove(): void } | undefined;
    let response: { remove(): void } | undefined;
    try {
      received = Notifications.addNotificationReceivedListener(() => undefined);
      response = Notifications.addNotificationResponseReceivedListener((event) => {
        if (shouldHandleNotificationResponse(event.notification.request.identifier))
          router.push(notificationRoute(event.notification.request.content.data));
      });
      void Notifications.getLastNotificationResponseAsync()
        .then((event) => {
          if (event && shouldHandleNotificationResponse(event.notification.request.identifier))
            router.push(notificationRoute(event.notification.request.content.data));
        })
        .catch(() => {
          console.info("NEXORA could not read the initial notification response.");
        });
    } catch {
      // Notification routing is optional and must not replace the core application UI.
      console.info("NEXORA notification routing is unavailable on this device.");
    }
    return () => {
      received?.remove();
      response?.remove();
    };
  }, []);
}
