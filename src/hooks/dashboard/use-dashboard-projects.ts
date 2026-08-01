import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

import { dashboardQueryKeys } from "./query-keys";

export type DashboardProject = {
  id: string;
  title: string;
  progress: number;
  color: string;
};

export function useDashboardProjects() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: dashboardQueryKeys.projects(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardProject[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("id, title, progress, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      return (data ?? []).map((project, index) => ({
        id: project.id,
        title: project.title ?? "Untitled project",
        progress: Math.round(project.progress ?? 0),
        color: ["bg-emerald-500", "bg-sky-500", "bg-amber-500"][index % 3],
      }));
    },
  });
}
