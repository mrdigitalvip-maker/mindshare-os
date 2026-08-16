import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { notificationRoute } from "@/lib/notification-routing";
export function useNotificationRouting() {
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => undefined);
    const response = Notifications.addNotificationResponseReceivedListener((event) =>
      router.push(notificationRoute(event.notification.request.content.data)),
    );
    void Notifications.getLastNotificationResponseAsync().then((event) => {
      if (event) router.push(notificationRoute(event.notification.request.content.data));
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, []);
}
