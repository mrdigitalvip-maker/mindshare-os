import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { disableCurrentPushDevice } from "@/services/notification-service";

/** The single logout path for authenticated mobile surfaces. */
export function useLogout() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useCallback(async () => {
    if (session?.user.id) await disableCurrentPushDevice(session.user.id);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await queryClient.cancelQueries();
    queryClient.clear();
    router.replace("/auth");
  }, [queryClient, session?.user.id]);
}
