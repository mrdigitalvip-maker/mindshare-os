import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import {
  claimPremiumActivityReward,
  getSubscription,
} from "@/services/subscription-service";

export function useSubscription() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => getSubscription(session!.user.id),
    enabled: status === "authenticated" && Boolean(session?.user.id),
    retry: 1,
  });
}

export function useClaimPremiumActivityReward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: claimPremiumActivityReward,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
}
