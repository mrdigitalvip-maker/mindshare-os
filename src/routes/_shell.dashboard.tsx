import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Target,
  Zap,
  BookOpen,
  Crown,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NEXORA" }] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const quickModules = MODULES.filter((m) => m.group === "modules").slice(0, 6);

  return (
    <PageShell>
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">
          {greeting()}, <span className="text-gold">{user?.name ?? "friend"}</span>.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Here's your day at a glance. NEXORA is thinking with you.
        </p>
      </motion.div>

      {/* Summary grid */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card
          icon={<Target className="h-5 w-5" />}
          label="Focus today"
          value="3 blocks"
          hint="Next: Deep work at 10:00"
        />
        <Card
          icon={<Calendar className="h-5 w-5" />}
          label="Agenda"
          value="2 events"
          hint="Design sync · Studies review"
        />
        <Card
          icon={<Zap className="h-5 w-5" />}
          label="Momentum"
          value="4-day streak"
          hint="Keep it going"
        />
      </div>

      {/* AI Suggestions */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Suggestions from NEXORA
          </div>
          <h2 className="mt-3 font-display text-2xl">
            Three things you could do next
          </h2>
          <ul className="mt-5 space-y-3">
            {[
              "Draft the outline for your Q3 review",
              "Summarize the last 5 documents you opened",
              "Practice 10 Spanish phrases from yesterday",
            ].map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <span>{s}</span>
                <Button size="sm" variant="ghost" className="rounded-full">
                  Start <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass relative overflow-hidden rounded-2xl p-6">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,oklch(0.78_0.12_72/0.15),transparent_60%)]" />
          <div className="relative">
            <Crown className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">Go Premium</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlock Agents, Finance and unlimited AI usage.
            </p>
            <Link to="/premium" className="mt-6 inline-block">
              <Button size="sm" className="rounded-full">
                See plans <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Continue exploring
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickModules.map((m) => (
            <Link
              key={m.id}
              to={m.path}
              className="glass group flex items-center gap-4 rounded-2xl p-5 transition hover:border-[color:var(--gold)]/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-elevated">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
