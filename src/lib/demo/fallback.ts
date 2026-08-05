/**
 * TEMPORARY FALLBACK HELPER — NEXORA OS
 * Selects mock data only in explicit demo mode. Live integration failures are
 * intentionally propagated so production can never report simulated success.
 */
import { DEMO_MODE, canCallBackend } from "./config";

export async function withDemoFallback<T>(
  run: () => Promise<T>,
  fallback: T | (() => T),
  label = "request",
): Promise<T> {
  const resolveFallback = (): T =>
    typeof fallback === "function" ? (fallback as () => T)() : fallback;

  if (DEMO_MODE) {
    return resolveFallback();
  }

  if (!canCallBackend) {
    throw new Error(
      `[nexora:${label}] Supabase is not configured. Set credentials or explicitly enable VITE_DEMO_MODE.`,
    );
  }

  return run();
}
