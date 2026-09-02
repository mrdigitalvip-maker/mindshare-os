import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { disableCurrentPushDevice } from "@/services/notification-service";

/** The single logout path for authenticated mobile surfaces. */
export function useLogout() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const logoutLock = useRef(false);

  return useCallback(async () => {
    if (logoutLock.current) return;
    logoutLock.current = true;
    try {
      if (session?.user.id) await disableCurrentPushDevice(session.user.id).catch(() => undefined);
      await queryClient.cancelQueries();
      queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/auth");
    } finally {
      logoutLock.current = false;
    }
  }, [queryClient, session?.user.id]);
}
