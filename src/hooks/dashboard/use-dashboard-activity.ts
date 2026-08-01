import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

import { dashboardQueryKeys } from "./query-keys";

export type DashboardActivity = {
  id: string;
  title: string;
  time: string;
};

export function useDashboardActivity() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: dashboardQueryKeys.activity(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardActivity[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;

      return (data ?? []).map((item) => ({
        id: item.id,
        title: item.action ?? "Recent activity",
        time: new Date(item.created_at ?? Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    },
  });
}
