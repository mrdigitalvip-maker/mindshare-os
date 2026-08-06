import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — NEXORA" },
      { name: "description", content: "Access your NEXORA workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
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

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUp(email, password, name);
        if (needsEmailConfirmation) {
          setSent("signup");
        } else {
          toast.success("Welcome to NEXORA");
          navigate({ to: "/onboarding" });
        }
      } else if (mode === "forgot") {
        await resetPassword(email);
        setSent("forgot");
      } else {
        await signIn(email, password);
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google; component unmounts, no need to reset loading.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start Google sign-in");
      setGoogleLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create your NEXORA"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";
  const cta = mode === "signup" ? "Create account" : mode === "forgot" ? "Send email" : "Sign in";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,oklch(0.35_0.05_60/0.4),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <img src="/nexora-icon.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-2xl">NEXORA</span>
          </Link>
          <div>
            <p className="font-display text-4xl leading-tight">
              "The first workspace that <span className="text-gold italic">actually</span> feels
              personal."
            </p>
            <p className="mt-4 text-sm text-muted-foreground">— early access user</p>
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
              <span className="font-display text-xl">NEXORA</span>
            </Link>
          </div>

          {sent ? (
            <div role="status" aria-live="polite">
              <h1 className="font-display text-3xl">Check your email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {sent === "signup"
                  ? `We sent a confirmation link to ${email}. Click it to activate your account.`
                  : `We sent a password reset link to ${email}. Click it to choose a new password.`}
              </p>
              <button
                onClick={() => {
                  setSent(null);
                  navigate({ to: "/auth", search: { mode: "signin" } });
                }}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Start free. Upgrade whenever you're ready."
                  : mode === "forgot"
                    ? "We'll email you a reset link."
                    : "Sign in to continue to your workspace."}
              </p>

              <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@nexora.app"
                    autoComplete="email"
                    required
                  />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <Link
                          to="/auth"
                          search={{ mode: "forgot" }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Forgot?
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
                  {loading ? "Please wait…" : cta}
                </Button>
              </form>

              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    <span>or continue with</span>
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
                    {googleLoading ? "Redirecting…" : "Continue with Google"}
                  </Button>
                </>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <Link
                      to="/auth"
                      search={{ mode: "signin" }}
                      className="text-foreground hover:underline"
                    >
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New to NEXORA?{" "}
                    <Link
                      to="/auth"
                      search={{ mode: "signup" }}
                      className="text-foreground hover:underline"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
