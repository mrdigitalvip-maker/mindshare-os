import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { createId, readMockDatabase, updateMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";
import type {
  Agent,
  ContentDraft,
  Document,
  FinanceGoal,
  Project,
  StudyPlan,
  Task,
} from "./mock-data";
import type { Database } from "@/integrations/supabase/types";
import { AIService } from "./ai-service";

type StudySubjectRow = Database["public"]["Tables"]["study_subjects"]["Row"];
type StudySubjectInsert = Database["public"]["Tables"]["study_subjects"]["Insert"];
type StudySubjectUpdate = Database["public"]["Tables"]["study_subjects"]["Update"];
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
type StudySessionInsert = Database["public"]["Tables"]["study_sessions"]["Insert"];
type FinanceAccountRow = Database["public"]["Tables"]["finance_accounts"]["Row"];
type FinanceAccountInsert = Database["public"]["Tables"]["finance_accounts"]["Insert"];
type FinanceAccountUpdate = Database["public"]["Tables"]["finance_accounts"]["Update"];
type FinanceTransactionRow = Database["public"]["Tables"]["finance_transactions"]["Row"];
type FinanceTransactionInsert = Database["public"]["Tables"]["finance_transactions"]["Insert"];
type FinanceTransactionUpdate = Database["public"]["Tables"]["finance_transactions"]["Update"];
type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];
type AgentRunRow = Database["public"]["Tables"]["agent_runs"]["Row"];
type TranslationRow = Database["public"]["Tables"]["translations"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type FileRow = Database["public"]["Tables"]["files"]["Row"];
type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];
type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"];

const colors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500"];
const delay = () => new Promise((resolve) => setTimeout(resolve, 120));

export const ProjectService = {
  async list(): Promise<Project[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().projects;
    }
    const userId = await getRequiredUserId();
    const [{ data, error }, { data: tasks, error: tasksError }] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, title, description, status, objective, priority, start_date, due_date, updated_at",
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase.from("tasks").select("project_id, completed").eq("user_id", userId),
    ]);
    if (error) throw error;
    if (tasksError) throw tasksError;
    return (data ?? []).map((row, index) => ({
      id: row.id,
      title: row.title ?? "Untitled project",
      progress: (() => {
        const projectTasks = (tasks ?? []).filter((task) => task.project_id === row.id);
        return projectTasks.length
          ? Math.round(
              (projectTasks.filter((task) => task.completed).length / projectTasks.length) * 100,
            )
          : row.status === "completed"
            ? 100
            : 0;
      })(),
      color: colors[index % colors.length],
      updatedAt: row.updated_at ?? new Date(0).toISOString(),
      description: row.description ?? "",
      status: row.status ?? "active",
      objective: row.objective ?? "",
      priority: row.priority,
      startDate: row.start_date,
      dueDate: row.due_date,
      totalTasks: (tasks ?? []).filter((task) => task.project_id === row.id).length,
      completedTasks: (tasks ?? []).filter((task) => task.project_id === row.id && task.completed)
        .length,
    }));
  },
  async create(
    input?:
      | string
      | {
          title: string;
          description?: string;
          status?: string;
          objective?: string;
          priority?: string;
          startDate?: string | null;
          dueDate?: string | null;
        },
  ): Promise<Project> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const cleanTitle =
        (typeof input === "string" ? input : input?.title)?.trim() || "New project";
      const description = typeof input === "object" ? input.description?.trim() || null : null;
      const status = typeof input === "object" ? input.status || "active" : "active";
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title: cleanTitle,
          description,
          status,
          objective: typeof input === "object" ? input.objective : undefined,
          priority: typeof input === "object" ? input.priority : undefined,
          start_date: typeof input === "object" ? input.startDate : undefined,
          due_date: typeof input === "object" ? input.dueDate : undefined,
        })
        .select(
          "id, title, description, status, objective, priority, start_date, due_date, updated_at",
        )
        .single();
      if (error) throw error;
      return {
        id: data.id,
        title: data.title ?? cleanTitle,
        progress: 0,
        color: colors[0],
        updatedAt: data.updated_at ?? new Date().toISOString(),
        description: data.description ?? "",
        status: data.status ?? "active",
        objective: data.objective ?? "",
        priority: data.priority,
        startDate: data.start_date,
        dueDate: data.due_date,
        totalTasks: 0,
        completedTasks: 0,
      };
    }
    await delay();
    let created!: Project;
    updateMockDatabase((db) => {
      created = {
        id: createId("project"),
        title:
          (typeof input === "string" ? input : input?.title) ??
          `New project ${db.projects.length + 1}`,
        progress: 0,
        color: colors[db.projects.length % colors.length],
        updatedAt: new Date().toISOString(),
      };
      return { ...db, projects: [created, ...db.projects] };
    });
    return created;
  },
  async update(
    id: string,
    patch: {
      title?: string;
      description?: string;
      status?: string;
      objective?: string;
      priority?: string;
      startDate?: string | null;
      dueDate?: string | null;
      progress?: number;
    },
  ): Promise<void> {
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
    const update = {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.objective !== undefined ? { objective: patch.objective } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
      ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
      ...(patch.progress !== undefined
        ? { status: patch.progress >= 100 ? "completed" : "active" }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("projects")
      .update(update)
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
  async get(id: string): Promise<Project | null> {
    return (await this.list()).find((project) => project.id === id) ?? null;
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
      .select("id, title, description, priority, project_id, completed, due_date")
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
      description: row.description ?? "",
      priority: row.priority ?? "medium",
      dueDate: row.due_date,
      projectId: row.project_id,
    }));
  },
  async createTask(
    input?:
      | string
      | {
          title: string;
          description?: string;
          priority?: string;
          dueDate?: string | null;
          projectId?: string | null;
        },
  ): Promise<Task> {
    if (!DEMO_MODE) {
      const userId = await getRequiredUserId();
      const cleanTitle =
        (typeof input === "string" ? input : input?.title)?.trim() || "New focus task";
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: cleanTitle,
          completed: false,
          description: typeof input === "object" ? input.description : undefined,
          priority: typeof input === "object" ? input.priority : undefined,
          due_date: typeof input === "object" ? input.dueDate : undefined,
          project_id: typeof input === "object" ? input.projectId : undefined,
        })
        .select("id, title, description, priority, project_id, completed, due_date")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        title: data.title ?? cleanTitle,
        status: data.completed ? "done" : "open",
        due: data.due_date ? new Date(data.due_date).toLocaleDateString() : "No due date",
        focusMinutes: 25,
        description: data.description ?? "",
        priority: data.priority ?? "medium",
        dueDate: data.due_date,
        projectId: data.project_id,
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
    patch: {
      title?: string;
      description?: string;
      priority?: string;
      completed?: boolean;
      due_date?: string | null;
      project_id?: string | null;
    },
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

/** Shared task repository used by both Projects and Productivity. */
export const TaskService = ProductivityService;

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    type: row.type ?? "Document",
    summary: row.content ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
  };
}

export const DocumentService = {
  async list(): Promise<Document[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().documents;
    }
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, type, created_at, updated_at, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDocument);
  },
  async createUploadRecord(title?: string, fileType?: string): Promise<Document> {
    if (DEMO_MODE) {
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
    }
    const userId = await getRequiredUserId();
    const cleanTitle = title?.trim() || "Uploaded note";
    const { data, error } = await supabase
      .from("documents")
      .insert({ user_id: userId, title: cleanTitle, type: fileType ?? "Note" })
      .select("id, title, content, type, created_at, updated_at, user_id")
      .single();
    if (error) throw error;
    return mapDocument(data);
  },
  async update(id: string, patch: { title?: string; file_type?: string }): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        documents: db.documents.map((item) =>
          item.id === id
            ? { ...item, title: patch.title ?? item.title, type: patch.file_type ?? item.type }
            : item,
        ),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("documents")
      .update({ title: patch.title, type: patch.file_type, updated_at: new Date().toISOString() })
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
  async listFiles(): Promise<FileRow[]> {
    if (DEMO_MODE) return [];
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("files")
      .select("id, bucket, created_at, mime_type, name, path, size, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async analyze(id: string, instruction = "Summarize this document") {
    return AIService.execute("document_analysis", { documentId: id, instruction });
  },
  async analyzePhysicalFile(): Promise<never> {
    throw new Error("Physical file analysis is unavailable until Storage is configured.");
  },
};

export const ContentService = {
  async generate(input: {
    operation: "draft" | "rewrite" | "summarize" | "expand" | "tone" | "title";
    text: string;
    tone?: string;
    title?: string;
  }) {
    return AIService.execute("content_generation", input);
  },
  async listNotes(): Promise<NoteRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("notes")
      .select("id, content, created_at, pinned, title, updated_at, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async createNote(input: Omit<NoteInsert, "id" | "user_id">): Promise<NoteRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async updateNote(id: string, patch: NoteUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("notes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async removeNote(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  },
  async listDrafts(): Promise<ContentDraft[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().drafts;
    }
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, type")
      .eq("user_id", userId)
      .eq("type", "draft")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled draft",
      format: row.type ?? "draft",
      body: row.content ?? "",
    }));
  },
  async createDraft(): Promise<ContentDraft> {
    if (DEMO_MODE) {
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
    }
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("documents")
      .insert({ user_id: userId, title: "New draft", type: "draft", content: "" })
      .select("id, title, content, type")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      title: data.title ?? "New draft",
      format: data.type ?? "draft",
      body: data.content ?? "",
    };
  },
  async updateDraft(id: string, patch: { title?: string; body?: string }): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({
        ...db,
        drafts: db.drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
      }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("documents")
      .update({ title: patch.title, content: patch.body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("type", "draft");
    if (error) throw error;
  },
  async removeDraft(id: string): Promise<void> {
    if (DEMO_MODE) {
      updateMockDatabase((db) => ({ ...db, drafts: db.drafts.filter((draft) => draft.id !== id) }));
      return;
    }
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("type", "draft");
    if (error) throw error;
  },
};

function mapStudyPlan(subject: StudySubjectRow, sessions: StudySessionRow[]): StudyPlan {
  const subjectSessions = sessions.filter((session) => session.subject_id === subject.id);
  const completed = subjectSessions.filter((session) => session.completed).length;
  return {
    id: subject.id,
    title: subject.name ?? "Untitled subject",
    progress: subjectSessions.length ? Math.round((completed / subjectSessions.length) * 100) : 0,
    nextSession: "Not scheduled",
  };
}

export const StudyService = {
  async assist(input: {
    operation: "explain" | "summarize" | "questions" | "flashcards" | "study_plan";
    text: string;
  }) {
    return AIService.execute("study_assistance", input);
  },
  async listSubjects(): Promise<StudySubjectRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("study_subjects")
      .select("id, color, created_at, name, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async listPlans(): Promise<StudyPlan[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().studies;
    }
    const [subjects, sessions] = await Promise.all([this.listSubjects(), this.listHistory()]);
    return subjects.map((subject) => mapStudyPlan(subject, sessions));
  },
  async createSubject(input: Omit<StudySubjectInsert, "id" | "user_id">): Promise<StudySubjectRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("study_subjects")
      .insert({ ...input, user_id: userId })
      .select("id, color, created_at, name, user_id")
      .single();
    if (error) throw error;
    return data;
  },
  async createPlan(): Promise<StudyPlan> {
    if (DEMO_MODE) {
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
    }
    const subject = await this.createSubject({ name: "New study plan", color: colors[0] });
    return mapStudyPlan(subject, []);
  },
  async updateSubject(id: string, patch: StudySubjectUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("study_subjects")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async removeSubject(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("study_subjects")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async recordSession(input: Omit<StudySessionInsert, "id" | "user_id">): Promise<StudySessionRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({ ...input, user_id: userId })
      .select("id, completed, created_at, duration, subject_id, user_id")
      .single();
    if (error) throw error;
    return data;
  },
  async finishSession(id: string, duration: number): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("study_sessions")
      .update({ completed: true, duration })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async listHistory(): Promise<StudySessionRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("study_sessions")
      .select("id, completed, created_at, duration, subject_id, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async getSummary(): Promise<{ totalMinutes: number; completedSessions: number }> {
    const sessions = await this.listHistory();
    return {
      totalMinutes: sessions.reduce((total, session) => total + (session.duration ?? 0), 0),
      completedSessions: sessions.filter((session) => session.completed).length,
    };
  },
};

function accountAsGoal(account: FinanceAccountRow): FinanceGoal {
  const balance = account.balance ?? 0;
  return { id: account.id, title: account.name, saved: balance, target: balance };
}

export const FinanceService = {
  async listAccounts(): Promise<FinanceAccountRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("id, balance, created_at, currency, name, type, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async listGoals(): Promise<FinanceGoal[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().financeGoals;
    }
    return (await this.listAccounts()).map(accountAsGoal);
  },
  async createAccount(
    input: Omit<FinanceAccountInsert, "id" | "user_id">,
  ): Promise<FinanceAccountRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("finance_accounts")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async createGoal(): Promise<FinanceGoal> {
    if (DEMO_MODE) {
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
    }
    return accountAsGoal(
      await this.createAccount({
        name: "New account",
        balance: 0,
        currency: "USD",
        type: "savings",
      }),
    );
  },
  async updateAccount(id: string, patch: FinanceAccountUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("finance_accounts")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async removeAccount(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("finance_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async listTransactions(): Promise<FinanceTransactionRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("finance_transactions")
      .select()
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async createTransaction(
    input: Omit<FinanceTransactionInsert, "id" | "user_id">,
  ): Promise<FinanceTransactionRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async updateTransaction(id: string, patch: FinanceTransactionUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("finance_transactions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async removeTransaction(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("finance_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async getSummary(): Promise<{ balance: number; income: number; expenses: number }> {
    const [accounts, transactions] = await Promise.all([
      this.listAccounts(),
      this.listTransactions(),
    ]);
    return {
      balance: accounts.reduce((total, account) => total + (account.balance ?? 0), 0),
      income: transactions
        .filter((item) => item.type === "income")
        .reduce((total, item) => total + (item.amount ?? 0), 0),
      expenses: transactions
        .filter((item) => item.type === "expense")
        .reduce((total, item) => total + (item.amount ?? 0), 0),
    };
  },
};

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    title: row.name ?? "Untitled agent",
    cadence: "Manual trigger",
    status: row.active ? "ready" : "draft",
  };
}

export const AgentService = {
  async listRows(): Promise<AgentRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("agents")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async list(): Promise<Agent[]> {
    if (DEMO_MODE) {
      await delay();
      return readMockDatabase().agents;
    }
    return (await this.listRows()).map(mapAgent);
  },
  async create(input: Omit<AgentInsert, "id" | "user_id">): Promise<AgentRow> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("agents")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async createDraft(): Promise<Agent> {
    if (DEMO_MODE) {
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
    }
    return mapAgent(await this.create({ name: "New agent", active: false }));
  },
  async update(id: string, patch: AgentUpdate): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("agents")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase.from("agents").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  },
  async setActive(id: string, active: boolean): Promise<void> {
    return this.update(id, { active });
  },
  async listRuns(agentId?: string): Promise<AgentRunRow[]> {
    const agents = await this.listRows();
    const ownedIds = agents.map((agent) => agent.id);
    if (agentId && !ownedIds.includes(agentId))
      throw new Error("Agent not found for the authenticated user.");
    const ids = agentId ? [agentId] : ownedIds;
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("agent_runs")
      .select()
      .in("agent_id", ids)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async run(agentId: string, input: string) {
    await getRequiredUserId();
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      data?: { runId: string; output: string };
      error?: { code: string; message: string };
    }>("agent-run", { body: { agentId, input } });
    if (error) throw error;
    if (!data?.ok || !data.data) throw new Error(data?.error?.message ?? "A execução falhou.");
    return data.data;
  },
};

export const TranslationService = {
  async listHistory(): Promise<TranslationRow[]> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("translations")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async get(id: string): Promise<TranslationRow | null> {
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("translations")
      .select()
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    if (!text.trim()) return "";
    const result = await AIService.execute("translation", {
      text,
      sourceLanguage,
      targetLanguage,
    });
    return result.content;
  },
  async saveProviderResult(input: {
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    provider: string;
  }): Promise<TranslationRow> {
    const userId = await getRequiredUserId();
    if (!input.provider.trim() || !input.translatedText.trim())
      throw new Error("A real provider result is required.");
    const { data, error } = await supabase
      .from("translations")
      .insert({
        user_id: userId,
        original_text: input.originalText,
        translated_text: input.translatedText,
        source_language: input.sourceLanguage,
        target_language: input.targetLanguage,
        provider: input.provider,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("translations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
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
  async createPortalUrl(): Promise<string | null> {
    const { DEMO_MODE } = await import("@/lib/demo/config");
    if (DEMO_MODE) return null;
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.functions.invoke<{ url: string }>(
      "create-portal-session",
    );
    if (error) throw error;
    if (!data?.url) throw new Error("Portal URL was not returned");
    return data.url;
  },
};
