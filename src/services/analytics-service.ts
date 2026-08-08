import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { readMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";

export type DashboardActivity = {
  id: string;
  title: string;
  module: string;
  occurredAt: string;
};

export type DashboardProject = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  dueAt: string;
  projectId: string | null;
  overdue: boolean;
};

export type DashboardContinuation = {
  id: string;
  title: string;
  detail: string;
  path: string;
  occurredAt: string;
};

export type DashboardSnapshot = {
  projects: { total: number; active: number; completed: number };
  tasks: { pending: number; completed: number };
  documents: number;
  notes: number;
  studies: { subjects: number; completedSessions: number; minutes: number };
  finance: { accounts: number; income: number; expenses: number; balance: number };
  agents: { total: number; active: number };
  translations: number;
  ai: { conversations: number; messages: number };
  notifications: { unread: number };
  recentProjects: DashboardProject[];
  recentActivity: DashboardActivity[];
  todayTasks: DashboardTask[];
  continuations: DashboardContinuation[];
};

const emptySnapshot = (): DashboardSnapshot => ({
  projects: { total: 0, active: 0, completed: 0 },
  tasks: { pending: 0, completed: 0 },
  documents: 0,
  notes: 0,
  studies: { subjects: 0, completedSessions: 0, minutes: 0 },
  finance: { accounts: 0, income: 0, expenses: 0, balance: 0 },
  agents: { total: 0, active: 0 },
  translations: 0,
  ai: { conversations: 0, messages: 0 },
  notifications: { unread: 0 },
  recentProjects: [],
  recentActivity: [],
  todayTasks: [],
  continuations: [],
});

function demoSnapshot(): DashboardSnapshot {
  const database = readMockDatabase();
  const snapshot = emptySnapshot();
  snapshot.projects.total = database.projects.length;
  snapshot.projects.active = database.projects.length;
  snapshot.tasks.pending = database.tasks.filter((task) => task.status === "open").length;
  snapshot.tasks.completed = database.tasks.length - snapshot.tasks.pending;
  snapshot.documents = database.documents.length;
  snapshot.studies.subjects = database.studies.length;
  snapshot.finance.accounts = database.financeGoals.length;
  snapshot.agents.total = database.agents.length;
  snapshot.agents.active = database.agents.length;
  return snapshot;
}

function assertQueries(results: Array<{ error: { message: string } | null }>) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export const AnalyticsService = {
  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    if (DEMO_MODE) return demoSnapshot();
    const userId = await getRequiredUserId();
    const results = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, status, created_at, updated_at")
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("id, title, project_id, due_date, completed, created_at, updated_at")
        .eq("user_id", userId),
      supabase
        .from("documents")
        .select("id, title, type, created_at, updated_at")
        .eq("user_id", userId),
      supabase.from("notes").select("id, title, created_at, updated_at").eq("user_id", userId),
      supabase.from("study_subjects").select("id, name, created_at").eq("user_id", userId),
      supabase
        .from("study_sessions")
        .select("id, completed, duration, created_at")
        .eq("user_id", userId),
      supabase.from("finance_accounts").select("id, balance, created_at").eq("user_id", userId),
      supabase
        .from("finance_transactions")
        .select("id, title, amount, type, created_at")
        .eq("user_id", userId),
      supabase.from("agents").select("id, name, active, created_at").eq("user_id", userId),
      supabase.from("translations").select("id, created_at").eq("user_id", userId),
      supabase
        .from("ai_conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId),
      supabase.from("notifications").select("id, title, is_read, created_at").eq("user_id", userId),
    ]);
    assertQueries(results);
    const [
      projectsResult,
      tasksResult,
      documentsResult,
      notesResult,
      subjectsResult,
      sessionsResult,
      accountsResult,
      transactionsResult,
      agentsResult,
      translationsResult,
      conversationsResult,
      notificationsResult,
    ] = results;
    const conversationIds = (conversationsResult.data ?? []).map((item) => item.id);
    const messagesResult = conversationIds.length
      ? await supabase
          .from("ai_messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
      : { count: 0, error: null };
    if (messagesResult.error) throw messagesResult.error;

    const projects = projectsResult.data ?? [];
    const tasks = tasksResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const accounts = accountsResult.data ?? [];
    const transactions = transactionsResult.data ?? [];
    const agents = agentsResult.data ?? [];
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Math.abs(item.amount ?? 0), 0);
    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Math.abs(item.amount ?? 0), 0);

    const activities: DashboardActivity[] = [
      ...projects.map((item) => ({
        id: `project-${item.id}`,
        title: item.title,
        module: "Project",
        occurredAt: item.updated_at ?? item.created_at ?? "",
      })),
      ...tasks.map((item) => ({
        id: `task-${item.id}`,
        title: item.title,
        module: "Task",
        occurredAt: item.updated_at ?? item.created_at ?? "",
      })),
      ...(documentsResult.data ?? []).map((item) => ({
        id: `document-${item.id}`,
        title: item.title ?? "Untitled document",
        module: "Document",
        occurredAt: item.updated_at ?? item.created_at ?? "",
      })),
      ...(notesResult.data ?? []).map((item) => ({
        id: `note-${item.id}`,
        title: item.title ?? "Untitled note",
        module: "Note",
        occurredAt: item.updated_at ?? item.created_at ?? "",
      })),
      ...(conversationsResult.data ?? []).map((item) => ({
        id: `conversation-${item.id}`,
        title: item.title ?? "Untitled conversation",
        module: "Assistant",
        occurredAt: item.updated_at ?? item.created_at ?? "",
      })),
    ]
      .filter((item) => item.occurredAt)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, 6);

    return {
      projects: {
        total: projects.length,
        active: projects.filter((item) => item.status !== "completed").length,
        completed: projects.filter((item) => item.status === "completed").length,
      },
      tasks: {
        pending: tasks.filter((item) => !item.completed).length,
        completed: tasks.filter((item) => item.completed).length,
      },
      documents: (documentsResult.data ?? []).filter((item) => item.type !== "draft").length,
      notes: (notesResult.data ?? []).length,
      studies: {
        subjects: (subjectsResult.data ?? []).length,
        completedSessions: sessions.filter((item) => item.completed).length,
        minutes: sessions
          .filter((item) => item.completed)
          .reduce((sum, item) => sum + (item.duration ?? 0), 0),
      },
      finance: {
        accounts: accounts.length,
        income,
        expenses,
        balance: accounts.reduce((sum, item) => sum + (item.balance ?? 0), 0),
      },
      agents: { total: agents.length, active: agents.filter((item) => item.active).length },
      translations: (translationsResult.data ?? []).length,
      ai: { conversations: conversationIds.length, messages: messagesResult.count ?? 0 },
      notifications: {
        unread: (notificationsResult.data ?? []).filter((item) => !item.is_read).length,
      },
      recentProjects: projects
        .sort(
          (a, b) =>
            Date.parse(b.updated_at ?? b.created_at ?? "") -
            Date.parse(a.updated_at ?? a.created_at ?? ""),
        )
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status ?? "active",
          updatedAt: item.updated_at ?? item.created_at ?? "",
        })),
      recentActivity: activities,
      todayTasks: tasks
        .filter((item) => !item.completed && item.due_date)
        .filter((item) => new Date(item.due_date as string).getTime() < endOfToday())
        .sort((a, b) => Date.parse(a.due_date as string) - Date.parse(b.due_date as string))
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.due_date as string,
          projectId: item.project_id,
          overdue: Date.parse(item.due_date as string) < startOfToday(),
        })),
      continuations: [
        ...projects.map((item) => ({
          id: `project-${item.id}`,
          title: item.title,
          detail: "Project",
          path: `/projects/${item.id}`,
          occurredAt: item.updated_at ?? item.created_at ?? "",
        })),
        ...(documentsResult.data ?? []).map((item) => ({
          id: `document-${item.id}`,
          title: item.title ?? "Untitled document",
          detail: item.type === "draft" ? "Content draft" : "Document",
          path: item.type === "draft" ? `/content/${item.id}` : `/documents/${item.id}`,
          occurredAt: item.updated_at ?? item.created_at ?? "",
        })),
        ...(conversationsResult.data ?? []).map((item) => ({
          id: `conversation-${item.id}`,
          title: item.title ?? "Untitled conversation",
          detail: "Assistant conversation",
          path: `/assistant?conversation=${item.id}`,
          occurredAt: item.updated_at ?? item.created_at ?? "",
        })),
      ]
        .filter((item) => item.occurredAt)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
        .slice(0, 5),
    };
  },
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function endOfToday() {
  return startOfToday() + 86_400_000;
}
