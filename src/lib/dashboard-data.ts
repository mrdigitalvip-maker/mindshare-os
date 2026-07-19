import {
  Target,
  CalendarDays,
  Zap,
  Brain,
  FolderKanban,
  GraduationCap,
  FileText,
  PenLine,
  Wallet,
  Languages,
  Bot,
  type LucideIcon,
} from "lucide-react";

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export type DashboardSuggestion = {
  id: string;
  title: string;
  description: string;
  action: string;
};

export type DashboardQuickAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
};

export type DashboardProject = {
  id: string;
  title: string;
  progress: number;
  color: string;
};

export type DashboardDocument = {
  id: string;
  title: string;
  type: string;
  updatedAt: string;
};

export type DashboardActivity = {
  id: string;
  title: string;
  time: string;
};

export const DASHBOARD_STATS: DashboardStat[] = [
  {
    id: "focus",
    label: "Focus Today",
    value: "3 Blocks",
    hint: "Next session • 10:00",
    icon: Target,
  },
  {
    id: "calendar",
    label: "Agenda",
    value: "2 Events",
    hint: "Design Meeting",
    icon: CalendarDays,
  },
  {
    id: "streak",
    label: "Momentum",
    value: "4 Days",
    hint: "Current streak",
    icon: Zap,
  },
  {
    id: "ai",
    label: "AI Usage",
    value: "72%",
    hint: "Monthly credits",
    icon: Brain,
  },
];

export const DASHBOARD_SUGGESTIONS: DashboardSuggestion[] = [
  {
    id: "1",
    title: "Continue your Productivity workspace",
    description: "You still have unfinished focus sessions.",
    action: "Continue",
  },
  {
    id: "2",
    title: "Summarize your last uploaded document",
    description: "Generate an AI summary instantly.",
    action: "Summarize",
  },
  {
    id: "3",
    title: "Practice yesterday's study session",
    description: "Review your flashcards with AI.",
    action: "Review",
  },
];

export const DASHBOARD_QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    id: "projects",
    title: "Projects",
    description: "Manage your work",
    icon: FolderKanban,
    path: "/projects",
  },
  {
    id: "studies",
    title: "Studies",
    description: "AI learning assistant",
    icon: GraduationCap,
    path: "/studies",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Read and summarize",
    icon: FileText,
    path: "/documents",
  },
  {
    id: "content",
    title: "Content",
    description: "Create with AI",
    icon: PenLine,
    path: "/content",
  },
  {
    id: "finance",
    title: "Finance",
    description: "Money management",
    icon: Wallet,
    path: "/finance",
  },
  {
    id: "translate",
    title: "Translate",
    description: "Translate instantly",
    icon: Languages,
    path: "/translate",
  },
  {
    id: "assistant",
    title: "Assistant",
    description: "Chat with NEXORA",
    icon: Bot,
    path: "/assistant",
  },
];

export const DASHBOARD_PROJECTS: DashboardProject[] = [
  {
    id: "1",
    title: "NEXORA Mobile",
    progress: 82,
    color: "bg-emerald-500",
  },
  {
    id: "2",
    title: "AI Assistant",
    progress: 54,
    color: "bg-sky-500",
  },
  {
    id: "3",
    title: "Dashboard Redesign",
    progress: 36,
    color: "bg-amber-500",
  },
];

export const DASHBOARD_DOCUMENTS: DashboardDocument[] = [
  {
    id: "1",
    title: "Business Strategy.pdf",
    type: "PDF",
    updatedAt: "5 min ago",
  },
  {
    id: "2",
    title: "Marketing Notes.docx",
    type: "DOCX",
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "Startup Pitch.pptx",
    type: "PPTX",
    updatedAt: "2 days ago",
  },
];

export const DASHBOARD_ACTIVITY: DashboardActivity[] = [
  {
    id: "1",
    title: "Finished Focus Session",
    time: "08:30",
  },
  {
    id: "2",
    title: "Uploaded a document",
    time: "09:15",
  },
  {
    id: "3",
    title: "Generated AI summary",
    time: "09:42",
  },
  {
    id: "4",
    title: "Completed onboarding",
    time: "Yesterday",
  },
];

/* ---------------------------------------------------------------- */
/* Compatibility exports (OLD + NEW Dashboard)                      */
/* ---------------------------------------------------------------- */

export const dashboardStats = DASHBOARD_STATS;

export const aiSuggestions = DASHBOARD_SUGGESTIONS;

export const recentProjects = DASHBOARD_PROJECTS;

export const todayAgenda = DASHBOARD_ACTIVITY;

export const quickActions = DASHBOARD_QUICK_ACTIONS;
