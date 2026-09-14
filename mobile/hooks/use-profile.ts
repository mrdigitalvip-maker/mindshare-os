import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { ensureAuthenticatedProfile } from "@/services/profile-service";
import { resolveAccountLifecycle } from "@/lib/auth-state";

export const PROVISIONING_UI_TIMEOUT_MS = 18_000;

export function useProfile() {
  const { session, status } = useAuth();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: [...queryKeys.profile, userId ?? "anonymous"],
    queryFn: () => ensureAuthenticatedProfile(session!.user),
    enabled: status === "authenticated" && Boolean(userId),
    retry: 0,
    staleTime: 60_000,
    networkMode: "always",
  });
}

/** Authoritative session -> provisioning -> onboarding lifecycle for route guards. */
export function useAccountLifecycle() {
  const { session, status } = useAuth();
  const profile = useProfile();
  const [provisioningTimedOut, setProvisioningTimedOut] = useState(false);
  const userId = session?.user.id ?? null;
  const refetch = profile.refetch;

  useEffect(() => {
    setProvisioningTimedOut(false);
    if (status !== "authenticated" || !userId || !profile.isPending) return;

    const timer = setTimeout(() => setProvisioningTimedOut(true), PROVISIONING_UI_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [profile.isPending, status, userId]);

  useEffect(() => {
    if (!profile.isPending) setProvisioningTimedOut(false);
  }, [profile.isPending]);

  const retry = useCallback(async () => {
    setProvisioningTimedOut(false);
    return refetch();
  }, [refetch]);

  // Once a profile has been resolved, keep it authoritative even when a later
  // background refresh fails. A transient refetch must never throw an already
  // onboarded user back into the account-preparation gate.
  const provisioning = profile.data
    ? "success"
    : provisioningTimedOut || profile.isError
      ? "error"
      : profile.isPending
        ? "pending"
        : "success";

  const state = resolveAccountLifecycle({
    authStatus: status,
    provisioning,
    onboarded: profile.data?.onboarded,
  });

  return { state, profile: profile.data ?? null, retry };
}
