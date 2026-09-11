export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

export type AccountLifecycleState =
  | "authenticating"
  | "unauthenticated"
  | "provisioning"
  | "onboarding_required"
  | "ready"
  | "recoverable_error";

export function canNavigateNotification(status: AuthStatus): boolean {
  return status === "authenticated";
}

export function resolveAuthStatus(initialized: boolean, hasSession: boolean): AuthStatus {
  if (!initialized) return "initializing";
  return hasSession ? "authenticated" : "unauthenticated";
}

export type AppDestination = "/auth" | "/onboarding" | "/dashboard" | null;

export function resolveAccountLifecycle(input: {
  authStatus: AuthStatus;
  provisioning: "idle" | "pending" | "success" | "error";
  onboarded?: boolean;
}): AccountLifecycleState {
  if (input.authStatus === "initializing") return "authenticating";
  if (input.authStatus === "unauthenticated") return "unauthenticated";
  if (input.provisioning === "error") return "recoverable_error";
  if (input.provisioning !== "success") return "provisioning";
  return input.onboarded ? "ready" : "onboarding_required";
}

export function lifecycleDestination(state: AccountLifecycleState): AppDestination {
  if (state === "unauthenticated") return "/auth";
  if (state === "onboarding_required") return "/onboarding";
  if (state === "ready") return "/dashboard";
  return null;
}

export function resolveAppDestination(input: {
  authStatus: AuthStatus;
  onboarding: "loading" | "complete" | "incomplete" | "error";
}): AppDestination {
  return lifecycleDestination(
    resolveAccountLifecycle({
      authStatus: input.authStatus,
      provisioning:
        input.onboarding === "error"
          ? "error"
          : input.onboarding === "loading"
            ? "pending"
            : "success",
      onboarded: input.onboarding === "complete",
    }),
  );
}
