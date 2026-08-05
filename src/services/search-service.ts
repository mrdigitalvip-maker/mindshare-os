import { DEMO_MODE } from "@/lib/demo/config";
import { MODULES } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { readMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";

export type SearchResult = { id: string; title: string; description: string; path: string };

export const SearchService = {
  async search(query: string): Promise<SearchResult[]> {
    const text = query.trim();
    const modules = MODULES.filter(
      (module) =>
        !text || `${module.label} ${module.description}`.toLowerCase().includes(text.toLowerCase()),
    ).map((module) => ({
      id: module.id,
      title: module.label,
      description: module.description,
      path: module.path,
    }));
    if (!text) return modules;
    if (DEMO_MODE) {
      const database = readMockDatabase();
      return [
        ...modules,
        ...database.projects.map((item) => ({
          id: item.id,
          title: item.title,
          description: "Project",
          path: "/projects",
        })),
        ...database.tasks.map((item) => ({
          id: item.id,
          title: item.title,
          description: "Task",
          path: "/productivity",
        })),
        ...database.documents.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.summary,
          path: "/documents",
        })),
      ].filter((item) =>
        `${item.title} ${item.description}`.toLowerCase().includes(text.toLowerCase()),
      );
    }
    const userId = await getRequiredUserId();
    const pattern = `%${text.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const [projects, tasks, documents] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, description")
        .eq("user_id", userId)
        .ilike("title", pattern)
        .limit(8),
      supabase
        .from("tasks")
        .select("id, title, description")
        .eq("user_id", userId)
        .ilike("title", pattern)
        .limit(8),
      supabase
        .from("documents")
        .select("id, title, file_type")
        .eq("user_id", userId)
        .ilike("title", pattern)
        .limit(8),
    ]);
    const error = projects.error ?? tasks.error ?? documents.error;
    if (error) throw error;
    return [
      ...modules,
      ...(projects.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled project",
        description: item.description ?? "Project",
        path: "/projects",
      })),
      ...(tasks.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled task",
        description: item.description ?? "Task",
        path: "/productivity",
      })),
      ...(documents.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled document",
        description: item.file_type ?? "Document",
        path: "/documents",
      })),
    ];
  },
};
