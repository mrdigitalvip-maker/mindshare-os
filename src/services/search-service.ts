import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { readMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";

export type SearchCategory =
  | "Projects"
  | "Tasks"
  | "Documents"
  | "Notes"
  | "Studies"
  | "Agents"
  | "Translations"
  | "Conversations";
export type SearchResult = {
  id: string;
  title: string;
  description: string;
  path: string;
  category: SearchCategory;
  occurredAt: string | null;
};

function escapePattern(text: string) {
  return `%${text.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export const SearchService = {
  async search(query: string): Promise<SearchResult[]> {
    const text = query.trim();
    if (text.length < 2) return [];
    if (DEMO_MODE) {
      const database = readMockDatabase();
      return [
        ...database.projects.map((item) => ({
          id: item.id,
          title: item.title,
          description: "Project",
          path: "/projects",
          category: "Projects" as const,
          occurredAt: item.updatedAt,
        })),
        ...database.tasks.map((item) => ({
          id: item.id,
          title: item.title,
          description: "Task",
          path: "/productivity",
          category: "Tasks" as const,
          occurredAt: null,
        })),
        ...database.documents.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.type,
          path: `/documents/${item.id}`,
          category: "Documents" as const,
          occurredAt: item.updatedAt,
        })),
      ].filter((item) =>
        `${item.title} ${item.description}`.toLowerCase().includes(text.toLowerCase()),
      );
    }
    const userId = await getRequiredUserId();
    const pattern = escapePattern(text);
    const queries = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, description, updated_at")
        .eq("user_id", userId)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("tasks")
        .select("id, title, description, updated_at")
        .eq("user_id", userId)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("documents")
        .select("id, title, type, updated_at")
        .eq("user_id", userId)
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("notes")
        .select("id, title, content, updated_at")
        .eq("user_id", userId)
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("study_subjects")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .ilike("name", pattern)
        .limit(6),
      supabase
        .from("agents")
        .select("id, name, description, created_at")
        .eq("user_id", userId)
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("translations")
        .select("id, original_text, translated_text, created_at")
        .eq("user_id", userId)
        .or(`original_text.ilike.${pattern},translated_text.ilike.${pattern}`)
        .limit(6),
      supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .ilike("title", pattern)
        .limit(6),
    ]);
    const failed = queries.find((result) => result.error);
    if (failed?.error) throw failed.error;
    const [projects, tasks, documents, notes, studies, agents, translations, conversations] =
      queries;
    return [
      ...(projects.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? "Project",
        path: "/projects",
        category: "Projects" as const,
        occurredAt: item.updated_at,
      })),
      ...(tasks.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? "Task",
        path: "/productivity",
        category: "Tasks" as const,
        occurredAt: item.updated_at,
      })),
      ...(documents.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled document",
        description: item.type ?? "Document",
        path: item.type === "draft" ? `/content/${item.id}` : `/documents/${item.id}`,
        category: "Documents" as const,
        occurredAt: item.updated_at,
      })),
      ...(notes.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled note",
        description: "Note",
        path: "/documents",
        category: "Notes" as const,
        occurredAt: item.updated_at,
      })),
      ...(studies.data ?? []).map((item) => ({
        id: item.id,
        title: item.name ?? "Untitled subject",
        description: "Study subject",
        path: `/studies/${item.id}`,
        category: "Studies" as const,
        occurredAt: item.created_at,
      })),
      ...(agents.data ?? []).map((item) => ({
        id: item.id,
        title: item.name ?? "Untitled agent",
        description: item.description ?? "Agent",
        path: "/agents",
        category: "Agents" as const,
        occurredAt: item.created_at,
      })),
      ...(translations.data ?? []).map((item) => ({
        id: item.id,
        title: (item.original_text ?? "Translation").slice(0, 80),
        description: (item.translated_text ?? "Saved translation").slice(0, 100),
        path: "/translate",
        category: "Translations" as const,
        occurredAt: item.created_at,
      })),
      ...(conversations.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled conversation",
        description: "AI conversation",
        path: "/assistant",
        category: "Conversations" as const,
        occurredAt: item.updated_at,
      })),
    ].sort((a, b) => Date.parse(b.occurredAt ?? "") - Date.parse(a.occurredAt ?? ""));
  },
};
