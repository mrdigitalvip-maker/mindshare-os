import { supabase } from "@/lib/supabase";

export type RuntimeErrorContext = {
  module?: string;
  boundary?: string;
  operation?: string;
  queryKey?: string;
};

const REDACT = /(?:bearer\s+|token|key|secret|password|authorization|apikey)/gi;
const ids = new WeakMap<object, string>();

function referenceFor(error: unknown): string {
  if (error && typeof error === "object") {
    const existing = ids.get(error);
    if (existing) return existing;
  }
  const bytes = new Uint8Array(3);
  globalThis.crypto?.getRandomValues?.(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const reference = `NX-${(suffix || Math.random().toString(16).slice(2, 8)).toUpperCase()}`;
  if (error && typeof error === "object") ids.set(error, reference);
  return reference;
}

function clean(value: string, max: number): string {
  return value.replace(REDACT, "[redacted]").slice(0, max);
}

function describe(error: unknown) {
  if (error instanceof Response) {
    return { name: "Response", message: `HTTP ${error.status}`, stack: undefined };
  }
  if (error instanceof Error) {
    return {
      name: clean(error.name || "Error", 120),
      message: clean(error.message || "Unknown error", 500),
      stack: error.stack ? clean(error.stack, 4_000) : undefined,
    };
  }
  return { name: "UnknownError", message: clean(String(error), 500), stack: undefined };
}

export const RuntimeErrorService = {
  referenceFor,

  capture(error: unknown, context: RuntimeErrorContext = {}): string {
    const reference = referenceFor(error);
    if (typeof window === "undefined") return reference;
    const detail = describe(error);
    const safeContext = {
      reference,
      boundary: context.boundary?.slice(0, 80),
      operation: context.operation?.slice(0, 80),
      queryKey: context.queryKey?.slice(0, 160),
      online: navigator.onLine,
      userAgent: navigator.userAgent.slice(0, 300),
      appVersion: import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_COMMIT_SHA || null,
      timestamp: new Date().toISOString(),
    };

    if (import.meta.env.DEV) console.error("[NEXORA runtime]", { ...detail, ...safeContext });

    // Telemetry is deliberately best-effort. It must never replace the original
    // failure or keep a boundary from rendering.
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session?.user.id) return;
        await supabase.from("runtime_errors").insert({
          user_id: data.session.user.id,
          route: window.location.pathname.slice(0, 500),
          module: (context.module || "global").slice(0, 80),
          error_name: detail.name,
          error_message: detail.message,
          stack_sanitized: detail.stack,
          context: { ...safeContext, sessionExisted: true },
        });
      })
      .catch(() => undefined);
    return reference;
  },
};
