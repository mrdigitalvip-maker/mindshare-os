import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Target,
  TrendingUp,
  Brain,
  Zap,
  FolderKanban,
  BookOpen,
  PenLine,
  Languages,
  Wallet,
  Sparkles,
  Crown,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

import {
  DASHBOARD_STATS,
  DASHBOARD_SUGGESTIONS,
  DASHBOARD_ACTIVITY,
  DASHBOARD_PROJECTS,
} from "@/lib/dashboard-data";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { DashboardAiCard } from "@/components/dashboard/dashboard-ai-card";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NEXORA" }] }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const displayName = profile?.full_name ?? user?.name ?? "Friend";

  return (
    <PageShell>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8"
      >
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-gold/10 blur-[120px]" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>

            <h1 className="mt-4 font-display text-4xl md:text-5xl">
              {greeting()}, <span className="text-gold">{displayName}</span>
            </h1>

            <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
              Welcome back to your Personal AI Operating System. Everything
              important today is organized below. Your projects, studies,
              content, productivity and AI are connected in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assistant">
                <Button className="rounded-full">
                  Open Assistant <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/projects">
                <Button variant="outline" className="rounded-full">
                  Continue Project <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Snapshot mini-stats — cosmetic placeholders until wired to real usage data */}
          <div className="grid grid-cols-2 gap-4 lg:w-[340px]">
            <div className="glass rounded-2xl p-5">
              <TrendingUp className="h-5 w-5 text-gold" />
              <p className="mt-5 text-sm text-muted-foreground">Productivity</p>
              <h3 className="mt-1 font-display text-3xl">94%</h3>
            </div>
            <div className="glass rounded-2xl p-5">
              <Target className="h-5 w-5 text-gold" />
              <p className="mt-5 text-sm text-muted-foreground">Goals</p>
              <h3 className="mt-1 font-display text-3xl">12</h3>
            </div>
            <div className="glass rounded-2xl p-5">
              <Brain className="h-5 w-5 text-gold" />
              <p className="mt-5 text-sm text-muted-foreground">AI Usage</p>
              <h3 className="mt-1 font-display text-3xl">184</h3>
            </div>
            <div className="glass rounded-2xl p-5">
              <Zap className="h-5 w-5 text-gold" />
              <p className="mt-5 text-sm text-muted-foreground">Streak</p>
              <h3 className="mt-1 font-display text-3xl">18 Days</h3>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Today's Overview */}
      <div className="mt-10">
        <DashboardSection title="Today's Overview" subtitle="Everything important for your day.">
          <DashboardGrid>
            {DASHBOARD_STATS.map((item, i) => (
              <DashboardStatCard
                key={item.id}
                label={item.label}
                value={item.value}
                hint={item.hint}
                icon={item.icon}
                delay={i * 0.05}
              />
            ))}
          </DashboardGrid>
        </DashboardSection>
      </div>

      {/* AI Suggestions + Agenda */}
      <div className="mt-12 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <DashboardSection title="AI Suggestions" subtitle="Generated by your personal AI.">
          <div className="space-y-4">
            {DASHBOARD_SUGGESTIONS.map((item) => (
              <DashboardAiCard
                key={item.id}
                title={item.title}
                description={item.description}
                action={item.action}
              />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Today's Agenda" subtitle="Recent activity in your workspace.">
          <div className="space-y-4">
            {DASHBOARD_ACTIVITY.map((item) => (
              <div key={item.id} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-gold" />
                  <span className="font-medium">{item.time}</span>
                </div>
                <p className="mt-3">{item.title}</p>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Recent Projects */}
      <div className="mt-12">
        <DashboardSection title="Recent Projects" subtitle="Continue where you left off.">
          <div className="space-y-4">
            {DASHBOARD_PROJECTS.map((project) => (
              <div key={project.id} className="glass rounded-2xl p-6 transition hover:border-gold/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">{project.title}</h3>
                  <Button size="sm" className="rounded-full">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className={`h-full rounded-full ${project.color}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{project.progress}% complete</p>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Quick actions (self-contained component — pulls MODULES itself) */}
      <div className="mt-12">
        <DashboardQuickActions />
      </div>

      {/* Productivity hub + Premium upsell */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="glass overflow-hidden rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-gold" />
            <h3 className="font-display text-2xl">Productivity Hub</h3>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <MiniModule icon={<FolderKanban className="h-5 w-5" />} title="Projects" />
            <MiniModule icon={<BookOpen className="h-5 w-5" />} title="Studies" />
            <MiniModule icon={<PenLine className="h-5 w-5" />} title="Content" />
            <MiniModule icon={<Languages className="h-5 w-5" />} title="Translate" />
          </div>
        </div>

        <div className="glass relative overflow-hidden rounded-3xl p-8">
          <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-gold/10 blur-[120px]" />
          <div className="relative">
            <Crown className="h-8 w-8 text-gold" />
            <h3 className="mt-6 font-display text-3xl">Upgrade to Premium</h3>
            <p className="mt-4 max-w-sm leading-7 text-muted-foreground">
              Unlock unlimited AI conversations, custom agents, finance,
              intelligent automations, cloud memory and every future feature
              released.
            </p>
            <Link to="/premium" className="mt-8 inline-flex">
              <Button className="rounded-full">
                Upgrade Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity + AI Performance */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <DashboardRecentActivity />

        <DashboardSection title="AI Performance" subtitle="Your AI workspace statistics.">
          <div className="grid gap-4">
            <MetricCard icon={<Brain className="h-5 w-5" />} title="AI Conversations" value="184" />
            <MetricCard icon={<Sparkles className="h-5 w-5" />} title="Generated Content" value="93" />
            <MetricCard icon={<Languages className="h-5 w-5" />} title="Translations" value="51" />
            <MetricCard icon={<Wallet className="h-5 w-5" />} title="Finance Records" value="27" />
          </div>
        </DashboardSection>
      </div>
    </PageShell>
  );
}

function MiniModule({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="glass rounded-2xl p-5 transition hover:border-gold/30">
      <div className="w-fit rounded-xl bg-surface-elevated p-3">{icon}</div>
      <h4 className="mt-5 font-medium">{title}</h4>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl p-5">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <h3 className="mt-1 font-display text-3xl">{value}</h3>
      </div>
      <div className="rounded-xl bg-gold/10 p-3">{icon}</div>
    </div>
  );
}
