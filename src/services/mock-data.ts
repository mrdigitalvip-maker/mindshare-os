export type Project = {
  id: string;
  title: string;
  progress: number;
  color: string;
  updatedAt: string;
  description?: string;
  status?: string;
  objective?: string;
  priority?: string;
  startDate?: string | null;
  dueDate?: string | null;
  totalTasks?: number;
  completedTasks?: number;
};
export type Task = {
  id: string;
  title: string;
  status: "open" | "done";
  due: string;
  focusMinutes: number;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  projectId?: string | null;
};
export type Document = {
  id: string;
  title: string;
  type: string;
  summary: string;
  updatedAt: string;
};
export type Agent = { id: string; title: string; cadence: string; status: "draft" | "ready" };
export type ContentDraft = {
  id: string;
  title: string;
  format: string;
  body: string;
  updatedAt?: string;
};
export type StudyPlan = { id: string; title: string; progress: number; nextSession: string };
export type FinanceGoal = { id: string; title: string; saved: number; target: number };
export type Notification = { id: string; title: string; body: string; read: boolean };

export type MockDatabase = {
  projects: Project[];
  tasks: Task[];
  documents: Document[];
  agents: Agent[];
  drafts: ContentDraft[];
  studies: StudyPlan[];
  financeGoals: FinanceGoal[];
  notifications: Notification[];
};

export const mockDatabase: MockDatabase = {
  projects: [
    {
      id: "project-launch",
      title: "NEXORA Launch Plan",
      progress: 72,
      color: "bg-emerald-500",
      updatedAt: "2026-08-05T09:00:00.000Z",
    },
    {
      id: "project-study",
      title: "Q3 Study Roadmap",
      progress: 45,
      color: "bg-sky-500",
      updatedAt: "2026-08-05T08:30:00.000Z",
    },
  ],
  tasks: [
    {
      id: "task-brief",
      title: "Outline launch checklist",
      status: "open",
      due: "Today",
      focusMinutes: 25,
    },
    {
      id: "task-review",
      title: "Review Product Brief v2",
      status: "open",
      due: "Tomorrow",
      focusMinutes: 45,
    },
    {
      id: "task-email",
      title: "Draft onboarding email",
      status: "done",
      due: "Yesterday",
      focusMinutes: 20,
    },
  ],
  documents: [
    {
      id: "doc-product-brief",
      title: "Product Brief v2",
      type: "Brief",
      summary:
        "NEXORA unifies projects, study, finance, content, translation, and AI assistance into one workspace.",
      updatedAt: "2026-08-05T07:15:00.000Z",
    },
  ],
  agents: [
    {
      id: "agent-briefing",
      title: "Daily briefing agent",
      cadence: "Weekdays at 08:00",
      status: "draft",
    },
  ],
  drafts: [
    {
      id: "draft-welcome",
      title: "Welcome email",
      format: "Email",
      body: "Hi there — welcome to NEXORA. Here are three ways to start your workspace today...",
    },
  ],
  studies: [
    {
      id: "study-spanish",
      title: "Spanish conversation practice",
      progress: 38,
      nextSession: "Today, 18:00",
    },
  ],
  financeGoals: [{ id: "goal-emergency", title: "Emergency fund", saved: 1800, target: 5000 }],
  notifications: [
    {
      id: "notification-briefing",
      title: "Daily briefing ready",
      body: "Your top three priorities are ready on the dashboard.",
      read: false,
    },
  ],
};
