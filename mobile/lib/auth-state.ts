export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

export function resolveAuthStatus(initialized: boolean, hasSession: boolean): AuthStatus {
  if (!initialized) return "initializing";
  return hasSession ? "authenticated" : "unauthenticated";
}

export type AppDestination = "/auth" | "/onboarding" | "/dashboard" | null;

export function resolveAppDestination(input: {
  authStatus: AuthStatus;
  onboarding: "loading" | "complete" | "incomplete" | "error";
}): AppDestination {
  if (input.authStatus === "initializing") return null;
  if (input.authStatus === "unauthenticated") return "/auth";
  if (input.onboarding === "loading" || input.onboarding === "error") return null;
  return input.onboarding === "complete" ? "/dashboard" : "/onboarding";
}
