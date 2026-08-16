import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { getSubscription } from "@/services/subscription-service";
export function useSubscription() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => getSubscription(session!.user.id),
    enabled: status === "authenticated" && Boolean(session?.user.id),
    retry: 1,
  });
}
