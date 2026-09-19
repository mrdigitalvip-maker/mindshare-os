import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Route as RouteIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEGAL_URLS } from "@/lib/legal";
import { useLanguage } from "@/providers/language-provider";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "KIVRYN" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/auth" && pathname !== "/auth/" ? <Outlet /> : <AuthPage />;
}

function AuthPage() {
  const { t, resolvedLocale } = useLanguage();
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    resendConfirmation,
    signInWithGoogle,
    resetPassword,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState<"signup" | "forgot" | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const submitLock = useRef(false);
  const resendLock = useRef(false);
  const discovery =
    resolvedLocale === "pt-BR"
      ? {
          label: "ENTENDA A KIVRYN",
          title: "Não é só um chat de IA. É um sistema para pensar, organizar e executar.",
          intro:
            "A KIVRYN conecta sua IA ao trabalho real que você cria dentro do sistema — projetos, tarefas, estudos, jornadas e contexto.",
          items: [
            {
              title: "Pense com contexto",
              copy: "Converse com uma IA que pode trabalhar a partir do seu próprio espaço, não de uma tela isolada.",
              icon: BrainCircuit,
            },
            {
              title: "Transforme metas em ação",
              copy: "Projetos, tarefas, missões e jornadas mantêm intenção e execução no mesmo lugar.",
              icon: RouteIcon,
            },
            {
              title: "Evolua com o uso",
              copy: "Aprendizado, criação e progresso passam a fazer parte de um único sistema pessoal.",
              icon: Sparkles,
            },
          ],
        }
      : {
          label: "UNDERSTAND KIVRYN",
          title: "It is not just an AI chat. It is a system to think, organize and execute.",
          intro:
            "KIVRYN connects AI to the real work you create inside the system — projects, tasks, studies, journeys and context.",
          items: [
            {
              title: "Think with context",
              copy: "Talk with AI that can work from your own workspace instead of an isolated chat screen.",
              icon: BrainCircuit,
            },
            {
              title: "Turn goals into action",
              copy: "Projects, tasks, missions and journeys keep intention and execution in the same place.",
              icon: RouteIcon,
            },
            {
              title: "Grow with the system",
              copy: "Learning, creation and progress become part of one personal operating system.",
              icon: Sparkles,
            },
          ],
        };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUp(email, password, name);
        if (needsEmailConfirmation) {
          setSent("signup");
        } else {
          toast.success(t("auth.welcomeKivryn"));
          navigate({ to: "/onboarding" });
        }
      } else if (mode === "forgot") {
        await resetPassword(email);
        setSent("forgot");
      } else {
        await signIn(email, password);
        toast.success(t("auth.welcome"));
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(t("common.error"));
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = window.setInterval(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function onResendConfirmation() {
    if (resendLock.current || resendCooldown) return;
    resendLock.current = true;
    try {
      await resendConfirmation(email);
      setResendCooldown(60);
      toast.success(t("auth.resendAccepted"));
    } catch (err) {
      toast.error(t("auth.resendError"));
    } finally {
      resendLock.current = false;
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google; component unmounts, no need to reset loading.
    } catch (err) {
      toast.error(t("auth.googleError"));
      setGoogleLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? t("auth.createKivryn")
      : mode === "forgot"
        ? t("auth.resetTitle")
        : t("auth.welcome");
  const cta =
    mode === "signup"
      ? t("auth.signUp")
      : mode === "forgot"
        ? t("auth.sendEmail")
        : t("auth.signIn");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,oklch(0.35_0.05_60/0.4),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-512.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-2xl">KIVRYN</span>
          </Link>
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
              {discovery.label}
            </p>
            <p className="mt-4 font-display text-4xl leading-tight">{discovery.title}</p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              {discovery.intro}
            </p>
            <div className="mt-7 grid gap-3">
              {discovery.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/80 bg-background/45 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.copy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/nexora-icon.png" alt="" width={28} height={28} className="rounded-md" />
              <span className="font-display text-xl">KIVRYN</span>
            </Link>
          </div>

          {sent ? (
            <div role="status" aria-live="polite">
              <h1 className="font-display text-3xl">{t("auth.checkEmail")}</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {sent === "signup" ? t("auth.signupSent", { email }) : t("auth.recoverySent")}
              </p>
              {sent === "signup" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 w-full rounded-full"
                  disabled={resendCooldown > 0}
                  onClick={() => void onResendConfirmation()}
                >
                  {resendCooldown > 0
                    ? t("auth.resendIn", { seconds: resendCooldown })
                    : t("auth.resend")}
                </Button>
              ) : null}
              <button
                onClick={() => {
                  setSent(null);
                  navigate({ to: "/auth", search: { mode: "signin" } });
                }}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {t("auth.backToSignIn")}
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signup"
                  ? t("auth.signupHelp")
                  : mode === "forgot"
                    ? t("auth.forgotHelp")
                    : t("auth.signInHelp")}
              </p>

              {mode === "signup" ? (
                <div className="mt-5 rounded-2xl border border-border bg-surface/60 p-4 lg:hidden">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
                    {discovery.label}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-5">{discovery.title}</p>
                  <div className="mt-3 space-y-2">
                    {discovery.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="flex items-center gap-2.5 text-xs">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("auth.name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@kivryn.app"
                    autoComplete="email"
                    required
                  />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      {mode === "signin" && (
                        <Link
                          to="/auth"
                          search={{ mode: "forgot" }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {t("auth.forgotShort")}
                        </Link>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? t("auth.wait") : cta}
                </Button>
              </form>

              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    <span>{t("auth.or")}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={onGoogleSignIn}
                    disabled={googleLoading}
                    aria-busy={googleLoading}
                  >
                    {googleLoading ? t("auth.redirecting") : t("auth.google")}
                  </Button>
                </>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    {t("auth.haveAccount")}{" "}
                    <Link
                      to="/auth"
                      search={{ mode: "signin" }}
                      className="text-foreground hover:underline"
                    >
                      {t("auth.signIn")}
                    </Link>
                  </>
                ) : (
                  <>
                    {t("auth.newToKivryn")}{" "}
                    <Link
                      to="/auth"
                      search={{ mode: "signup" }}
                      className="text-foreground hover:underline"
                    >
                      {t("auth.createAccount")}
                    </Link>
                  </>
                )}
              </p>

              {mode !== "forgot" && (
                <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
                  {t("auth.termsPrefix")}{" "}
                  <a
                    href={LEGAL_URLS.termsOfService}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center text-foreground underline underline-offset-4 hover:text-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("auth.terms")}
                  </a>{" "}
                  {t("auth.privacyJoin")}{" "}
                  <a
                    href={LEGAL_URLS.privacyPolicy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center text-foreground underline underline-offset-4 hover:text-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("auth.privacy")}
                  </a>
                  .
                </p>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
