import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";

/** The single logout path for authenticated mobile surfaces. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await queryClient.cancelQueries();
    queryClient.clear();
    router.replace("/auth");
  }, [queryClient]);
}
