import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/providers/language-provider";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Reset password — KIVRYN" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLanguage();
  const { updatePassword, recoverySession, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setReady(recoverySession);
    setInvalidLink(!recoverySession);
  }, [authLoading, recoverySession]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordLength"));
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success(t("auth.passwordUpdated"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-3xl">{t("auth.linkExpired")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("auth.linkExpiredHelp")}</p>
          <Link
            to="/auth"
            search={{ mode: "forgot" }}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {t("auth.requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="font-display text-3xl">{t("auth.newPasswordTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.newPasswordHelp")}</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.newPassword")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={loading || !ready}
            aria-busy={loading}
          >
            {loading
              ? t("common.saving")
              : ready
                ? t("auth.updatePassword")
                : t("auth.verifyingLink")}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
