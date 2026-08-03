/**
 * TEMPORARY DEVELOPMENT FALLBACK LAYER — NEXORA OS
 * ------------------------------------------------
 * This module is the single switch for the demo/fallback mode used while the
 * real APIs (Supabase project, OpenAI, Stripe) are not fully available.
 *
 * HOW TO REMOVE IT LATER:
 *   1. Set `VITE_DEMO_MODE=false` (or provide real Supabase credentials) — the
 *      whole layer becomes inert at runtime, no component change required.
 *   2. To delete it for good: remove `src/lib/demo/*` and the
 *      `withDemoFallback(...)` wrappers in the hooks. The underlying real
 *      queries are untouched inside those wrappers.
 */

const rawFlag = import.meta.env.VITE_DEMO_MODE as string | undefined;

export const hasSupabaseCredentials =
  !!(import.meta.env.VITE_SUPABASE_URL as string | undefined) &&
  !!(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

/**
 * Demo mode is ON when explicitly requested, or automatically when the
 * Supabase credentials are missing (otherwise every screen would crash).
 */
export const DEMO_MODE: boolean =
  rawFlag === "true" ? true : rawFlag === "false" ? false : !hasSupabaseCredentials;

/** True when a live backend call is even possible. */
export const canCallBackend = hasSupabaseCredentials && !DEMO_MODE;
