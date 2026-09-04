import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { notificationRoute } from "@/lib/notification-routing";
import { useAuth } from "@/providers/auth-provider";
import type { AuthStatus } from "@/lib/auth-state";
import { createNotificationResponseDedupe } from "@/lib/notification-contract";
const dedupeNotificationResponse = createNotificationResponseDedupe();

export function shouldHandleNotificationResponse(identifier: string) {
  return dedupeNotificationResponse(identifier);
}
export function canNavigateNotification(status: AuthStatus) {
  return status === "authenticated";
}

export function NotificationRoutingGate() {
  useNotificationRouting();
  return null;
}

export function useNotificationRouting() {
  const { status } = useAuth();
  const statusRef = useRef(status);
  const pendingRoute = useRef<ReturnType<typeof notificationRoute> | undefined>(undefined);
  statusRef.current = status;
  useEffect(() => {
    if (canNavigateNotification(status) && pendingRoute.current) {
      router.push(pendingRoute.current);
      pendingRoute.current = undefined;
    }
    if (status === "unauthenticated") pendingRoute.current = undefined;
  }, [status]);
  useEffect(() => {
    let received: { remove(): void } | undefined;
    let response: { remove(): void } | undefined;
    try {
      received = Notifications.addNotificationReceivedListener(() => undefined);
      response = Notifications.addNotificationResponseReceivedListener((event) => {
        if (shouldHandleNotificationResponse(event.notification.request.identifier)) {
          const route = notificationRoute(event.notification.request.content.data);
          if (canNavigateNotification(statusRef.current)) router.push(route);
          else if (statusRef.current === "initializing") pendingRoute.current = route;
        }
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      });
      void Notifications.getLastNotificationResponseAsync()
        .then((event) => {
          if (event && shouldHandleNotificationResponse(event.notification.request.identifier)) {
            const route = notificationRoute(event.notification.request.content.data);
            if (canNavigateNotification(statusRef.current)) router.push(route);
            else if (statusRef.current === "initializing") pendingRoute.current = route;
          }
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
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
