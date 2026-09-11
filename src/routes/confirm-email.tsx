import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";

export const Route = createFileRoute("/confirm-email")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Email confirmed — KIVRYN" }, { name: "robots", content: "noindex" }],
  }),
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const { t } = useLanguage();
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
            <h1 className="font-display text-3xl">{t("auth.confirming")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("auth.oneMoment")}</p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="font-display text-3xl">{t("auth.confirmed")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("auth.confirmedHelp")}</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="font-display text-3xl">{t("auth.confirmInvalid")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("auth.confirmInvalidHelp")}</p>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              {t("auth.goToSignIn")}
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
