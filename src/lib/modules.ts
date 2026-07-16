import {
  Sparkles,
  FolderKanban,
  ListChecks,
  GraduationCap,
  Wallet,
  PenLine,
  Languages,
  FileText,
  Bot,
  Settings,
  LayoutDashboard,
  Crown,
  type LucideIcon,
} from "lucide-react";

export type NexoraModule = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
  group: "core" | "modules" | "system";
  premium?: boolean;
};

export const MODULES: NexoraModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    description: "Your daily overview",
    group: "core",
  },
  {
    id: "assistant",
    label: "Assistant",
    path: "/assistant",
    icon: Sparkles,
    description: "Talk to your AI",
    group: "core",
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    description: "Plan and ship your work",
    group: "modules",
  },
  {
    id: "productivity",
    label: "Productivity",
    path: "/productivity",
    icon: ListChecks,
    description: "Tasks, focus, calendar",
    group: "modules",
  },
  {
    id: "studies",
    label: "Studies",
    path: "/studies",
    icon: GraduationCap,
    description: "Learn faster with AI",
    group: "modules",
  },
  {
    id: "finance",
    label: "Finance",
    path: "/finance",
    icon: Wallet,
    description: "Track and plan money",
    group: "modules",
    premium: true,
  },
  {
    id: "content",
    label: "Content",
    path: "/content",
    icon: PenLine,
    description: "Write, edit, publish",
    group: "modules",
  },
  {
    id: "translate",
    label: "Translate",
    path: "/translate",
    icon: Languages,
    description: "Multilingual, instant",
    group: "modules",
  },
  {
    id: "documents",
    label: "Documents",
    path: "/documents",
    icon: FileText,
    description: "Read, summarize, ask",
    group: "modules",
  },
  {
    id: "agents",
    label: "Agents",
    path: "/agents",
    icon: Bot,
    description: "Custom AI agents",
    group: "modules",
    premium: true,
  },
  {
    id: "premium",
    label: "Premium",
    path: "/premium",
    icon: Crown,
    description: "Unlock everything",
    group: "system",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences & account",
    group: "system",
  },
];
