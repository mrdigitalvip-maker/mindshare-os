import { useQuery } from "@tanstack/react-query";
import { Target, CalendarDays, Zap, Brain, type LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

import { dashboardQueryKeys } from "./query-keys";

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export function useDashboardStats() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: dashboardQueryKeys.stats(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardStat[]> => {
      if (!user) return [];

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, progress, status, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, completed, due_date")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      const { data: conversations, error: conversationsError } = await supabase
        .from("ai_conversations")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (projectsError) throw projectsError;
      if (tasksError) throw tasksError;
      if (conversationsError) throw conversationsError;

      const projectCount = projects?.length ?? 0;
      const totalProgress =
        projects?.reduce((accumulator, project) => accumulator + (project.progress ?? 0), 0) ?? 0;
      const completionRate = projectCount === 0 ? 0 : Math.round(totalProgress / projectCount);

      const openTasks = tasks?.filter((task) => task.completed !== true).length ?? 0;
      const dueSoon =
        tasks?.filter((task) => {
          if (!task.due_date) return false;
          return new Date(task.due_date).getTime() > Date.now();
        }).length ?? 0;

      const conversationCount = conversations?.length ?? 0;

      return [
        {
          id: "focus",
          label: "Focus Today",
          value: `${Math.max(1, openTasks)} Blocks`,
          hint: `${openTasks} active tasks`,
          icon: Target,
        },
        {
          id: "agenda",
          label: "Agenda",
          value: `${Math.max(0, dueSoon)} Events`,
          hint: dueSoon > 0 ? "Upcoming workload" : "No upcoming tasks",
          icon: CalendarDays,
        },
        {
          id: "momentum",
          label: "Momentum",
          value: `${Math.max(1, projectCount)} Projects`,
          hint: `${completionRate}% average progress`,
          icon: Zap,
        },
        {
          id: "ai-usage",
          label: "AI Usage",
          value: `${Math.max(0, conversationCount)} Chats`,
          hint: "Active AI workspace",
          icon: Brain,
        },
      ];
    },
  });
}
