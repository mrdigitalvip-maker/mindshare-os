import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { AnalyticsService, workspaceQueryKeys } from "@/services";

export function useDashboardStats() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: workspaceQueryKeys.dashboard(user?.id),
    queryFn: () => AnalyticsService.getDashboardSnapshot(),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
  });
}
