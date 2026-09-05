import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/confirm-email")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Email confirmed — NEXORA" }, { name: "robots", content: "noindex" }],
  }),
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error_description") ?? params.get("error");
    if (authError) {
      setStatus("error");
      return;
    }
    if (loading) return;
    setStatus(user ? "success" : "error");
  }, [loading, user]);

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => navigate({ to: "/dashboard", replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm text-center"
        role="status"
        aria-live="polite"
      >
        {status === "checking" && (
          <>
            <h1 className="font-display text-3xl">Confirming your email…</h1>
            <p className="mt-3 text-sm text-muted-foreground">One moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="font-display text-3xl">Email confirmed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your account is ready. Taking you to your workspace…
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="font-display text-3xl">Confirmation link invalid</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This link may have expired or already been used. Try signing in — if your email still
              isn't confirmed, request a new link.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Go to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
