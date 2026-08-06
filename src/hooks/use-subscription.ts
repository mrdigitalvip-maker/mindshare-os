import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  SubscriptionStatusService,
  type SubscriptionStatus,
} from "@/services/subscription-status-service";

export type { SubscriptionStatus } from "@/services/subscription-status-service";

export const subscriptionQueryKey = (userId?: string) => ["subscription-status", userId] as const;

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  return useQuery<SubscriptionStatus>({
    queryKey: subscriptionQueryKey(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: () => SubscriptionStatusService.get(user?.id),
  });
}
