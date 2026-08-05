export type WorkspaceProject = {
  id: string;
  title: string;
  progress: number;
  color: string;
  updatedAt: string;
};
export type WorkspaceTask = {
  id: string;
  title: string;
  status: "open" | "done";
  due: string;
  focusMinutes: number;
};
export type WorkspaceDocument = {
  id: string;
  title: string;
  type: string;
  summary: string;
  updatedAt: string;
};
export type WorkspaceAgent = {
  id: string;
  title: string;
  cadence: string;
  status: "draft" | "ready";
};
export type WorkspaceDraft = { id: string; title: string; format: string; body: string };
export type WorkspaceStudy = { id: string; title: string; progress: number; nextSession: string };
export type WorkspaceFinanceGoal = { id: string; title: string; saved: number; target: number };

export type WorkspaceState = {
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
  documents: WorkspaceDocument[];
  agents: WorkspaceAgent[];
  drafts: WorkspaceDraft[];
  studies: WorkspaceStudy[];
  financeGoals: WorkspaceFinanceGoal[];
};

const KEY = "nexora.workspace.v1";
const colors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500"];

export const defaultWorkspaceState: WorkspaceState = {
  projects: [
    {
      id: "project-launch",
      title: "NEXORA Launch Plan",
      progress: 72,
      color: "bg-emerald-500",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "project-study",
      title: "Q3 Study Roadmap",
      progress: 45,
      color: "bg-sky-500",
      updatedAt: new Date().toISOString(),
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
      updatedAt: new Date().toISOString(),
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
};

function cloneDefault(): WorkspaceState {
  return JSON.parse(JSON.stringify(defaultWorkspaceState));
}
export function loadWorkspaceState(): WorkspaceState {
  if (typeof localStorage === "undefined") return cloneDefault();
  try {
    return { ...cloneDefault(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return cloneDefault();
  }
}
export function saveWorkspaceState(state: WorkspaceState) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
}
export function makeWorkspaceId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
export function nextProjectColor(index: number) {
  return colors[index % colors.length];
}

export function translateText(text: string, source: string, target: string) {
  if (!text.trim()) return "";
  if (source === target) return text;
  return `[${source.toUpperCase()} → ${target.toUpperCase()}] ${text.trim()}`;
}
