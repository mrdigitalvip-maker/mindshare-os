import { createId, readMockDatabase, updateMockDatabase } from "./local-store";
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
    await delay();
    return readMockDatabase().projects;
  },
  async create(title?: string): Promise<Project> {
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
};

export const ProductivityService = {
  async listTasks(): Promise<Task[]> {
    await delay();
    return readMockDatabase().tasks;
  },
  async createTask(): Promise<Task> {
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
    await delay();
    return updateMockDatabase((db) => ({
      ...db,
      tasks: db.tasks.map((task) =>
        task.id === id ? { ...task, status: task.status === "open" ? "done" : "open" } : task,
      ),
    })).tasks;
  },
};

export const DocumentService = {
  async list(): Promise<Document[]> {
    await delay();
    return readMockDatabase().documents;
  },
  async createUploadRecord(): Promise<Document> {
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
};

export const ContentService = {
  async listDrafts(): Promise<ContentDraft[]> {
    await delay();
    return readMockDatabase().drafts;
  },
  async createDraft(): Promise<ContentDraft> {
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
    await delay();
    return readMockDatabase().studies;
  },
  async createPlan(): Promise<StudyPlan> {
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
    await delay();
    return readMockDatabase().financeGoals;
  },
  async createGoal(): Promise<FinanceGoal> {
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
    await delay();
    return readMockDatabase().agents;
  },
  async createDraft(): Promise<Agent> {
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
