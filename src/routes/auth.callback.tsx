import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type CallbackState = { status: "loading" } | { status: "error"; message: string };

let pendingCode: string | null = null;
let pendingExchange: ReturnType<typeof supabase.auth.exchangeCodeForSession> | null = null;

function exchangeCodeOnce(code: string) {
  if (pendingCode !== code || !pendingExchange) {
    pendingCode = code;
    pendingExchange = supabase.auth.exchangeCodeForSession(code);
  }
  return pendingExchange;
}

function clearOAuthParams(url: URL) {
  for (const param of ["code", "error", "error_code", "error_description"]) {
    url.searchParams.delete(param);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

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
        clearOAuthParams(url);
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
        const code = url.searchParams.get("code");
        let session = null;

        if (code) {
          const exchange = await exchangeCodeOnce(code);
          session = exchange.data.session;

          // detectSessionInUrl may have completed the same exchange while the
          // client initialized. In that case the persisted session is the
          // authoritative result, rather than a second-use code error.
          if (exchange.error || !session) {
            const current = await supabase.auth.getSession();
            if (current.error) throw current.error;
            session = current.data.session;
            if (!session) throw exchange.error;
          }
        } else {
          // A remount or history restore can revisit a callback whose code was
          // already consumed. Continue only when that exchange produced a session.
          const current = await supabase.auth.getSession();
          if (current.error) throw current.error;
          session = current.data.session;
        }

        if (!session?.user)
          throw new Error("No active session was returned. Please sign in again.");
        clearOAuthParams(url);
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
