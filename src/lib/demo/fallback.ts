/**
 * TEMPORARY FALLBACK HELPER — NEXORA OS
 * Wraps a real backend call so the UI never crashes or blanks while the
 * backend is unavailable. Remove together with `src/lib/demo/*`.
 */
import { DEMO_MODE, canCallBackend } from "./config";

export async function withDemoFallback<T>(
  run: () => Promise<T>,
  fallback: T | (() => T),
  label = "request",
): Promise<T> {
  const resolveFallback = (): T =>
    typeof fallback === "function" ? (fallback as () => T)() : fallback;

  if (DEMO_MODE || !canCallBackend) {
    return resolveFallback();
  }

  try {
    return await run();
  } catch (error) {
    console.warn(`[nexora:fallback] ${label} failed, serving demo data.`, error);
    return resolveFallback();
  }
}
