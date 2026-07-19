import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  FolderKanban,
  Languages,
  FileText,
  Bot,
  ArrowRight,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { FullPageLoader } from "@/components/full-page-loader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXORA — Your Personal AI Operating System" },
      {
        name: "description",
        content:
          "One intelligent workspace for productivity, projects, learning, content and translation. Meet NEXORA.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Sparkles, title: "AI Assistant", copy: "A thoughtful companion that learns your rhythm." },
  { icon: FolderKanban, title: "Projects", copy: "Plan, ship and reflect. All in one canvas." },
  { icon: FileText, title: "Documents", copy: "Read, summarize and question any file." },
  { icon: Languages, title: "Translate", copy: "Seamless multilingual writing and speech." },
  { icon: Bot, title: "Agents", copy: "Build your own AI workers, without code." },
  { icon: Zap, title: "Automations", copy: "Let NEXORA handle the busywork for you." },
];

export default function Landing() {
  const navigate = Route.useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  // If a valid session already exists (e.g. the installed PWA was just
  // reopened), skip the marketing page entirely instead of asking the
  // user to sign in again.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (profileLoading) return;
    if (profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    } else if (profile?.onboarded) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, isAuthenticated, profileLoading, profile, navigate]);

  // Brief check only — avoids flashing the landing page for someone who's
  // already logged in. Anonymous visitors clear this almost instantly.
  if (authLoading || (isAuthenticated && profileLoading)) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    // Redirect effect above is already in flight.
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/nexora-icon.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="font-display text-xl tracking-tight">NEXORA</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#modules" className="hover:text-foreground">Modules</a>
            <Link to="/premium" className="hover:text-foreground">Premium</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="rounded-full">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center md:pt-32 md:pb-36">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Introducing NEXORA
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] sm:text-5xl md:text-7xl">
              Your Personal <span className="text-gold italic">AI</span>
              <br />
              Operating System
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              One intelligent workspace for productivity, projects, learning,
              content and translation. NEXORA works with you — every day.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="rounded-full px-7">
                  Start free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/premium">
                <Button size="lg" variant="ghost" className="rounded-full px-7">
                  See Premium
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Screen mock */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto mt-16 max-w-4xl"
          >
            <div className="glass rounded-3xl p-2 shadow-[var(--shadow-elevated)]">
              <div className="rounded-[1.25rem] bg-background p-8 text-left">
                <div className="mb-6 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Good morning, Alex
                </p>
                <h2 className="mt-2 font-display text-3xl">
                  You have <span className="text-gold">3 focus</span> blocks today.
                </h2>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {["Ship v2 launch", "Draft Q3 review", "Study Spanish"].map((t) => (
                    <div key={t} className="rounded-xl border border-border bg-surface p-4">
                      <p className="text-xs text-muted-foreground">Next up</p>
                      <p className="mt-1 text-sm font-medium">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Modules</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Everything you use, unified.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ten deeply integrated modules that share memory, context and taste.
            </p>
          </div>
          <div id="modules" className="mt-14 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass group rounded-2xl p-6 transition hover:border-[color:var(--gold)]/40"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
                  <f.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="text-lg font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-24 md:grid-cols-3">
          {[
            { icon: Shield, title: "Private by design", copy: "Your context stays yours." },
            { icon: Globe, title: "Global-ready", copy: "Multilingual across every module." },
            { icon: Zap, title: "Fast, everywhere", copy: "Installable PWA. Works offline." },
          ].map((v) => (
            <div key={v.title} className="flex items-start gap-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated">
                <v.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{v.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{v.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="font-display text-4xl md:text-6xl">
            Meet the workspace that <span className="text-gold italic">meets you</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Free to start. Premium when you're ready to go deeper.
          </p>
          <Link to="/auth" search={{ mode: "signup" }} className="mt-8 inline-block">
            <Button size="lg" className="rounded-full px-8">
              Create your NEXORA <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} NEXORA. All rights reserved.</p>
          <p>Your Personal AI Operating System.</p>
        </div>
      </footer>
    </div>
  );
}
