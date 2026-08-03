import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { withDemoFallback } from "@/lib/demo/fallback";
import { demoSuggestions } from "@/lib/demo/demo-data";

import { dashboardQueryKeys } from "./query-keys";

export type DashboardSuggestion = {
  id: string;
  title: string;
  description: string;
  action: string;
};

export function useDashboardSuggestions() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: dashboardQueryKeys.suggestions(user?.id),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardSuggestion[]> =>
      withDemoFallback(
        async () => {
          if (!user) return demoSuggestions;

          const { data: projects, error: projectsError } = await supabase
            .from("projects")
            .select("id, title, progress, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(2);

          const { data: documents, error: documentsError } = await supabase
            .from("documents")
            .select("id, title, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1);

          const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select("id, title, completed")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1);

          if (projectsError) throw projectsError;
          if (documentsError) throw documentsError;
          if (tasksError) throw tasksError;

          const suggestions: DashboardSuggestion[] = [];

          if (projects && projects.length > 0) {
            suggestions.push({
              id: `project-${projects[0].id}`,
              title: "Continue your active workspace",
              description: `Pick up ${projects[0].title} and move it closer to completion.`,
              action: "Continue",
            });
          }

          if (documents && documents.length > 0) {
            suggestions.push({
              id: `document-${documents[0].id}`,
              title: "Review your recent document",
              description: `Open ${documents[0].title} and turn it into an AI-ready summary.`,
              action: "Summarize",
            });
          }

          if (tasks && tasks.length > 0) {
            suggestions.push({
              id: `task-${tasks[0].id}`,
              title: "Close the next action item",
              description: tasks[0].completed
                ? "Your latest task is already completed. Keep the momentum going."
                : `Move ${tasks[0].title ?? "your next task"} forward with a focused session.`,
              action: "Review",
            });
          }

          return suggestions.length > 0 ? suggestions.slice(0, 3) : demoSuggestions;
        },
        demoSuggestions,
        "dashboard suggestions",
      ),
  });
}
