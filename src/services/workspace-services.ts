import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { createId, readMockDatabase, updateMockDatabase } from "./local-store";
import { throwUnsyncedSchema, getRequiredUserId } from "./supabase-service";
import type {
  Agent,
  ContentDraft,
  Document,
  FinanceGoal,
  Project,
  StudyPlan,
  Task,
} from "./mock-data";

const colors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500"];
const delay = () => new Promise((resolve) => setTimeout(resolve, 120));

export const ProjectService = {
  async list(): Promise<Project[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().projects;
    }
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, progress, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row, index) => ({
      id: row.id,
      title: row.title ?? "Untitled project",
      progress: Math.round(row.progress ?? 0),
      color: colors[index % colors.length],
      updatedAt: row.updated_at ?? new Date(0).toISOString(),
    }));
  },
  async create(title?: string): Promise<Project> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const cleanTitle = title?.trim() || "New project";
      const { data, error } = await supabase
        .from("projects")
        .insert({ user_id: userId, title: cleanTitle, progress: 0, status: "active" })
        .select("id, title, progress, updated_at")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        title: data.title ?? cleanTitle,
        progress: Math.round(data.progress ?? 0),
        color: colors[0],
        updatedAt: data.updated_at ?? new Date().toISOString(),
      };
    }
    await delay();
    let created!: Project;
    updateMockDatabase((db) => {
      created = {
        id: createId("project"),
        title: title ?? `New project ${db.projects.length + 1}`,
        progress: 0,
        color: colors[db.projects.length % colors.length],
        updatedAt: new Date().toISOString(),
      };
      return { ...db, projects: [created, ...db.projects] };
    });
    return created;
  },
  async update(id: string, patch: { title?: string; progress?: number }): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        projects: db.projects.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
        ),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        projects: db.projects.filter((item) => item.id !== id),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  },
};

export const ProductivityService = {
  async listTasks(filters?: { status?: "open" | "done" }): Promise<Task[]> {
    if (DEMO_MODE) {
      await delay();
      const tasks = readMockDatabase().tasks;
      return filters?.status ? tasks.filter((task) => task.status === filters.status) : tasks;
    }
    const userId = await getRequiredUserId();
    let query = supabase
      .from("tasks")
      .select("id, title, completed, due_date")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (filters?.status) query = query.eq("completed", filters.status === "done");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled task",
      status: row.completed ? "done" : "open",
      due: row.due_date ? new Date(row.due_date).toLocaleDateString() : "No due date",
      focusMinutes: 25,
    }));
  },
  async createTask(title?: string): Promise<Task> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const cleanTitle = title?.trim() || "New focus task";
      const { data, error } = await supabase
        .from("tasks")
        .insert({ user_id: userId, title: cleanTitle, completed: false })
        .select("id, title, completed, due_date")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        title: data.title ?? cleanTitle,
        status: data.completed ? "done" : "open",
        due: data.due_date ? new Date(data.due_date).toLocaleDateString() : "No due date",
        focusMinutes: 25,
      };
    }
    await delay();
    let created!: Task;
    updateMockDatabase((db) => {
      created = {
        id: createId("task"),
        title: `New focus task ${db.tasks.length + 1}`,
        status: "open",
        due: "Today",
        focusMinutes: 25,
      };
      return { ...db, tasks: [created, ...db.tasks] };
    });
    return created;
  },
  async toggleTask(id: string): Promise<Task[]> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const { data: current, error: readError } = await supabase
        .from("tasks")
        .select("completed")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
      if (readError) throw readError;
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !current.completed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      return this.listTasks();
    }
    await delay();
    return updateMockDatabase((db) => ({
      ...db,
      tasks: db.tasks.map((task) =>
        task.id === id ? { ...task, status: task.status === "open" ? "done" : "open" } : task,
      ),
    })).tasks;
  },
  async updateTask(
    id: string,
    patch: { title?: string; completed?: boolean; due_date?: string | null },
  ): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        tasks: db.tasks.map((item) =>
          item.id === id
            ? {
                ...item,
                title: patch.title ?? item.title,
                status:
                  patch.completed === undefined ? item.status : patch.completed ? "done" : "open",
              }
            : item,
        ),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("tasks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async removeTask(id: string): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({ ...db, tasks: db.tasks.filter((item) => item.id !== id) }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  },
};

export const DocumentService = {
  async list(): Promise<Document[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().documents;
    }
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, file_type, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled document",
      type: row.file_type ?? "File",
      summary: "",
      updatedAt: row.updated_at ?? new Date(0).toISOString(),
    }));
  },
  async createUploadRecord(title?: string, fileType?: string): Promise<Document> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const cleanTitle = title?.trim() || "Uploaded note";
      const { data, error } = await supabase
        .from("documents")
        .insert({ user_id: userId, title: cleanTitle, file_type: fileType ?? "Note" })
        .select("id, title, file_type, updated_at")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        title: data.title ?? cleanTitle,
        type: data.file_type ?? "File",
        summary: "",
        updatedAt: data.updated_at ?? new Date().toISOString(),
      };
    }
    await delay();
    let created!: Document;
    updateMockDatabase((db) => {
      created = {
        id: createId("doc"),
        title: `Uploaded note ${db.documents.length + 1}`,
        type: "Note",
        summary: "Document is queued for the future Supabase file-processing pipeline.",
        updatedAt: new Date().toISOString(),
      };
      return { ...db, documents: [created, ...db.documents] };
    });
    return created;
  },
  async update(id: string, patch: { title?: string; file_type?: string }): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        documents: db.documents.map((item) =>
          item.id === id
            ? {
                ...item,
                title: patch.title ?? item.title,
                type: patch.file_type ?? item.type,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("documents")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        documents: db.documents.filter((item) => item.id !== id),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase.from("documents").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  },
};

export const ContentService = {
  async listDrafts(): Promise<ContentDraft[]> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Content", ["content drafts"]);
    await delay();
    return readMockDatabase().drafts;
  },
  async createDraft(): Promise<ContentDraft> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Content", ["content drafts"]);
    await delay();
    let created!: ContentDraft;
    updateMockDatabase((db) => {
      created = {
        id: createId("draft"),
        title: `Draft ${db.drafts.length + 1}`,
        format: "Post",
        body: "A new AI-ready content draft.",
      };
      return { ...db, drafts: [created, ...db.drafts] };
    });
    return created;
  },
};

export const StudyService = {
  async listPlans(): Promise<StudyPlan[]> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Studies", ["study_subjects", "study_sessions"]);
    await delay();
    return readMockDatabase().studies;
  },
  async createPlan(): Promise<StudyPlan> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Studies", ["study_subjects", "study_sessions"]);
    await delay();
    let created!: StudyPlan;
    updateMockDatabase((db) => {
      created = {
        id: createId("study"),
        title: `Study plan ${db.studies.length + 1}`,
        progress: 0,
        nextSession: "Tomorrow, 09:00",
      };
      return { ...db, studies: [created, ...db.studies] };
    });
    return created;
  },
};

export const FinanceService = {
  async listGoals(): Promise<FinanceGoal[]> {
    if (!DEMO_MODE)
      return throwUnsyncedSchema("Finance", ["finance_accounts", "finance_transactions"]);
    await delay();
    return readMockDatabase().financeGoals;
  },
  async createGoal(): Promise<FinanceGoal> {
    if (!DEMO_MODE)
      return throwUnsyncedSchema("Finance", ["finance_accounts", "finance_transactions"]);
    await delay();
    let created!: FinanceGoal;
    updateMockDatabase((db) => {
      created = {
        id: createId("goal"),
        title: `Savings goal ${db.financeGoals.length + 1}`,
        saved: 0,
        target: 1000,
      };
      return { ...db, financeGoals: [created, ...db.financeGoals] };
    });
    return created;
  },
};

export const AgentService = {
  async list(): Promise<Agent[]> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Agents", ["agents", "agent_runs"]);
    await delay();
    return readMockDatabase().agents;
  },
  async createDraft(): Promise<Agent> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Agents", ["agents", "agent_runs"]);
    await delay();
    let created!: Agent;
    updateMockDatabase((db) => {
      created = {
        id: createId("agent"),
        title: `AI agent ${db.agents.length + 1}`,
        cadence: "Manual trigger",
        status: "draft",
      };
      return { ...db, agents: [created, ...db.agents] };
    });
    return created;
  },
};

export const TranslationService = {
  async translate(text: string, source: string, target: string): Promise<string> {
    if (!DEMO_MODE) return throwUnsyncedSchema("Translation provider", ["translations"]);
    await delay();
    if (!text.trim()) return "";
    if (source === target) return text;
    return `[${source.toUpperCase()} → ${target.toUpperCase()}] ${text.trim()}`;
  },
};

export const SubscriptionService = {
  async createCheckoutUrl(): Promise<string | null> {
    const { DEMO_MODE } = await import("@/lib/demo/config");
    if (DEMO_MODE) return null;
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.functions.invoke<{ url: string }>(
      "create-checkout-session",
    );
    if (error) throw error;
    if (!data?.url) throw new Error("Checkout URL was not returned");
    return data.url;
  },
};
