import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { ensureAuthenticatedProfile } from "@/services/profile-service";
import { resolveAccountLifecycle } from "@/lib/auth-state";

export function useProfile() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => ensureAuthenticatedProfile(session!.user),
    enabled: status === "authenticated" && Boolean(session?.user.id),
    retry: 2,
  });
}

/** Authoritative session -> provisioning -> onboarding lifecycle for route guards. */
export function useAccountLifecycle() {
  const { status } = useAuth();
  const profile = useProfile();
  const state = resolveAccountLifecycle({
    authStatus: status,
    provisioning: profile.isPending ? "pending" : profile.isError ? "error" : "success",
    onboarded: profile.data?.onboarded,
  });
  return { state, profile: profile.data ?? null, retry: profile.refetch };
}
