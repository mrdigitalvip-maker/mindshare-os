import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { getProfile } from "@/services/profile-service";

export function useProfile() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getProfile(session!.user.id),
    enabled: status === "authenticated" && Boolean(session?.user.id),
    retry: 2,
  });
}
