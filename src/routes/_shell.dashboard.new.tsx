import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock3,
  Sparkles,
  Target,
  TrendingUp,
  Brain,
  FolderKanban,
  BookOpen,
  PenLine,
  Languages,
  Wallet,
  Crown,
  Zap,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

import { MODULES } from "@/lib/modules";

import {
  dashboardStats,
  aiSuggestions,
  recentProjects,
  todayAgenda,
} from "@/lib/dashboard-data";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardSection } from "@/components/dashboard/dashboard-section";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Dashboard — NEXORA",
      },
    ],
  }),
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

  const displayName =
    profile?.full_name ??
    user?.name ??
    "Friend";

  const quickModules = MODULES.filter(
    (m) => m.group === "modules"
  ).slice(0, 6);

  return (
    <PageShell>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .35 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8"
      >

        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-gold/10 blur-[120px]" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">

              {new Date().toLocaleDateString(undefined,{
                weekday:"long",
                month:"long",
                day:"numeric"
              })}

            </p>

            <h1 className="mt-4 font-display text-5xl">

              {greeting()},{" "}

              <span className="text-gold">
                {displayName}
              </span>

            </h1>

            <p className="mt-5 max-w-2xl text-muted-foreground leading-7">

              Welcome back to your Personal AI Operating System.

              Everything important today is organized below.

              Your projects, studies, content, productivity and AI are connected in one place.

            </p>

            <div className="mt-8 flex flex-wrap gap-3">

              <Link to="/assistant">

                <Button>

                  Open Assistant

                  <Sparkles className="ml-2 h-4 w-4"/>

                </Button>

              </Link>

              <Link to="/projects">

                <Button variant="outline">

                  Continue Project

                  <ArrowRight className="ml-2 h-4 w-4"/>

                </Button>

              </Link>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-4 lg:w-[340px]">

            <div className="glass rounded-2xl p-5">

              <TrendingUp className="h-5 w-5 text-gold"/>

              <p className="mt-5 text-sm text-muted-foreground">

                Productivity

              </p>

              <h3 className="mt-1 font-display text-3xl">

                94%

              </h3>

            </div>

            <div className="glass rounded-2xl p-5">

              <Target className="h-5 w-5 text-gold"/>

              <p className="mt-5 text-sm text-muted-foreground">

                Goals

              </p>

              <h3 className="mt-1 font-display text-3xl">

                12

              </h3>

            </div>

            <div className="glass rounded-2xl p-5">

              <Brain className="h-5 w-5 text-gold"/>

              <p className="mt-5 text-sm text-muted-foreground">

                AI Usage

              </p>

              <h3 className="mt-1 font-display text-3xl">

                184

              </h3>

            </div>

            <div className="glass rounded-2xl p-5">

              <Zap className="h-5 w-5 text-gold"/>

              <p className="mt-5 text-sm text-muted-foreground">

                Streak

              </p>

              <h3 className="mt-1 font-display text-3xl">

                18 Days

              </h3>

            </div>

          </div>

        </div>

      </motion.section>        <div className="mt-10">

        <DashboardSection
          title="Today's Overview"
          subtitle="Everything important for your day."
        >

          <DashboardGrid>

            {dashboardStats.map((item) => {

              const Icon = item.icon;

              return (

                <div
                  key={item.label}
                  className="glass rounded-2xl p-6 transition hover:border-gold/30"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>

                    <Icon className="h-5 w-5 text-gold"/>

                  </div>

                  <h3 className="mt-5 font-display text-4xl">
                    {item.value}
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>

                </div>

              );

            })}

          </DashboardGrid>

        </DashboardSection>

      </div>

      <div className="mt-12 grid gap-6 xl:grid-cols-[2fr_1fr]">

        <DashboardSection
          title="AI Suggestions"
          subtitle="Generated by your personal AI."
        >

          <div className="space-y-4">

            {aiSuggestions.map((item,index)=>(

              <div
                key={index}
                className="glass flex items-center justify-between rounded-2xl p-5"
              >

                <div className="flex items-start gap-4">

                  <div className="rounded-xl bg-gold/10 p-3">

                    <Sparkles className="h-5 w-5 text-gold"/>

                  </div>

                  <div>

                    <p className="font-medium">

                      {item.title}

                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">

                      {item.description}

                    </p>

                  </div>

                </div>

                <Button
                  size="sm"
                  variant="ghost"
                >

                  Open

                  <ArrowRight className="ml-2 h-4 w-4"/>

                </Button>

              </div>

            ))}

          </div>

        </DashboardSection>

        <DashboardSection
          title="Today's Agenda"
          subtitle="Upcoming schedule."
        >

          <div className="space-y-4">

            {todayAgenda.map((item,index)=>(

              <div
                key={index}
                className="glass rounded-2xl p-5"
              >

                <div className="flex items-center gap-3">

                  <Clock3 className="h-5 w-5 text-gold"/>

                  <span className="font-medium">

                    {item.time}

                  </span>

                </div>

                <p className="mt-4">

                  {item.title}

                </p>

                <p className="mt-1 text-sm text-muted-foreground">

                  {item.description}

                </p>

              </div>

            ))}

          </div>

        </DashboardSection>

      </div>       <div className="mt-12">

        <DashboardSection
          title="Recent Projects"
          subtitle="Continue where you left off."
        >

          <div className="space-y-4">

            {recentProjects.map((project,index)=>(

              <div
                key={index}
                className="glass rounded-2xl p-6 transition hover:border-gold/30"
              >

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="font-display text-xl">

                      {project.name}

                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">

                      {project.description}

                    </p>

                  </div>

                  <Button size="sm">

                    Continue

                    <ArrowRight className="ml-2 h-4 w-4"/>

                  </Button>

                </div>

              </div>

            ))}

          </div>

        </DashboardSection>

      </div>

      <div className="mt-12">

        <DashboardSection
          title="Continue Exploring"
          subtitle="Open one of your NEXORA modules."
        >

          <DashboardGrid>

            {quickModules.map((module)=>{

              const Icon = module.icon;

              return(

                <Link
                  key={module.id}
                  to={module.path}
                  className="glass group rounded-2xl p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-1"
                >

                  <div className="flex items-center justify-between">

                    <div className="rounded-xl bg-surface-elevated p-3">

                      <Icon className="h-6 w-6"/>

                    </div>

                    {module.premium && (

                      <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black">

                        PRO

                      </span>

                    )}

                  </div>

                  <h3 className="mt-6 font-display text-2xl">

                    {module.label}

                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground">

                    {module.description}

                  </p>

                  <div className="mt-6 flex items-center text-sm text-gold">

                    Open module

                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>

                  </div>

                </Link>

              );

            })}

          </DashboardGrid>

        </DashboardSection>

      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">

        <div className="glass overflow-hidden rounded-3xl p-8">

          <div className="flex items-center gap-3">

            <FolderKanban className="h-6 w-6 text-gold"/>

            <h3 className="font-display text-2xl">

              Productivity Hub

            </h3>

          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">

            <MiniModule
              icon={<FolderKanban className="h-5 w-5"/>}
              title="Projects"
            />

            <MiniModule
              icon={<BookOpen className="h-5 w-5"/>}
              title="Studies"
            />

            <MiniModule
              icon={<PenLine className="h-5 w-5"/>}
              title="Content"
            />

            <MiniModule
              icon={<Languages className="h-5 w-5"/>}
              title="Translate"
            />

          </div>

        </div>

        <div className="glass relative overflow-hidden rounded-3xl p-8">

          <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-gold/10 blur-[120px]" />

          <div className="relative">

            <Crown className="h-8 w-8 text-gold"/>

            <h3 className="mt-6 font-display text-3xl">

              Upgrade to Premium

            </h3>

            <p className="mt-4 max-w-sm text-muted-foreground leading-7">

              Unlock unlimited AI conversations,
              custom agents,
              finance,
              intelligent automations,
              cloud memory
              and every future feature released.

            </p>

            <Link
              to="/premium"
              className="mt-8 inline-flex"
            >

              <Button>

                Upgrade Now

                <ArrowRight className="ml-2 h-4 w-4"/>

              </Button>

            </Link>

          </div>

        </div>

      </div>       <div className="mt-12 grid gap-6 lg:grid-cols-2">

        <DashboardSection
          title="Recent Activity"
          subtitle="Your latest progress inside NEXORA."
        >

          <div className="space-y-4">

            <ActivityItem
              title="Project updated"
              description="NEXORA AI Operating System"
              time="5 min ago"
            />

            <ActivityItem
              title="Document summarized"
              description="Business Strategy.pdf"
              time="28 min ago"
            />

            <ActivityItem
              title="Study completed"
              description="Artificial Intelligence"
              time="2 hours ago"
            />

            <ActivityItem
              title="Translation finished"
              description="Portuguese → English"
              time="Today"
            />

          </div>

        </DashboardSection>

        <DashboardSection
          title="AI Performance"
          subtitle="Your AI workspace statistics."
        >

          <div className="grid gap-4">

            <MetricCard
              icon={<Brain className="h-5 w-5"/>}
              title="AI Conversations"
              value="184"
            />

            <MetricCard
              icon={<Sparkles className="h-5 w-5"/>}
              title="Generated Content"
              value="93"
            />

            <MetricCard
              icon={<Languages className="h-5 w-5"/>}
              title="Translations"
              value="51"
            />

            <MetricCard
              icon={<Wallet className="h-5 w-5"/>}
              title="Finance Records"
              value="27"
            />

          </div>

        </DashboardSection>

      </div>

    </PageShell>

  );

}

type MiniModuleProps = {

  icon: React.ReactNode;

  title: string;

};

function MiniModule({

  icon,

  title,

}: MiniModuleProps){

  return(

    <div className="glass rounded-2xl p-5 transition hover:border-gold/30">

      <div className="rounded-xl bg-surface-elevated p-3 w-fit">

        {icon}

      </div>

      <h4 className="mt-5 font-medium">

        {title}

      </h4>

    </div>

  );

}

type MetricCardProps={

  icon:React.ReactNode;

  title:string;

  value:string;

};

function MetricCard({

  icon,

  title,

  value,

}:MetricCardProps){

  return(

    <div className="glass flex items-center justify-between rounded-2xl p-5">

      <div>

        <p className="text-sm text-muted-foreground">

          {title}

        </p>

        <h3 className="mt-1 font-display text-3xl">

          {value}

        </h3>

      </div>

      <div className="rounded-xl bg-gold/10 p-3">

        {icon}

      </div>

    </div>

  );

}

type ActivityItemProps={

  title:string;

  description:string;

  time:string;

};

function ActivityItem({

  title,

  description,

  time,

}:ActivityItemProps){

  return(

    <div className="glass flex items-center justify-between rounded-2xl p-5">

      <div>

        <h4 className="font-medium">

          {title}

        </h4>

        <p className="mt-1 text-sm text-muted-foreground">

          {description}

        </p>

      </div>

      <span className="text-xs text-muted-foreground">

        {time}

      </span>

    </div>

  );

}
