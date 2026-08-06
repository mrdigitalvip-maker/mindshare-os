import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type CallbackState = { status: "loading" } | { status: "error"; message: string };

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Completing sign in — NEXORA" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const url = new URL(window.location.href);
      const oauthError = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (oauthError) {
        const cancelled = oauthError === "access_denied";
        if (active) {
          setState({
            status: "error",
            message: cancelled
              ? "Google sign-in was cancelled. You can safely try again."
              : errorDescription || "Google could not complete sign-in.",
          });
        }
        return;
      }

      try {
        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        let data = sessionResult.data;

        // detectSessionInUrl normally exchanges the PKCE code during client
        // initialization. Keep an explicit fallback for browsers where that
        // initialization did not consume the callback URL.
        const code = url.searchParams.get("code");
        if (!data.session && code) {
          const exchange = await supabase.auth.exchangeCodeForSession(code);
          if (exchange.error) throw exchange.error;
          data = exchange.data;
        }

        if (!data.session) throw new Error("No active session was returned. Please sign in again.");
        if (active) await navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Sign-in could not be completed.",
          });
        }
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section
        className="max-w-md text-center"
        aria-live="polite"
        aria-busy={state.status === "loading"}
      >
        {state.status === "loading" ? (
          <>
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"
              aria-hidden="true"
            />
            <h1 className="mt-6 font-display text-3xl">Completing sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Restoring your secure session…</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">Sign-in wasn't completed</h1>
            <p role="alert" className="mt-3 text-sm text-muted-foreground">
              {state.message}
            </p>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Return to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
