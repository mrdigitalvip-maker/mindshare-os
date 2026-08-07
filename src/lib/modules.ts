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
  Search,
  type LucideIcon,
} from "lucide-react";

export type NexoraModule = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
  group: "core" | "modules" | "system";
  category: "main" | "workspace" | "growth" | "intelligence" | "money" | "account";
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
    category: "main",
  },
  {
    id: "assistant",
    label: "Assistant",
    path: "/assistant",
    icon: Sparkles,
    description: "Talk to your AI",
    group: "core",
    category: "main",
  },
  {
    id: "search",
    label: "Search",
    path: "/search",
    icon: Search,
    description: "Search across your workspace",
    group: "core",
    category: "main",
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    description: "Plan and ship your work",
    group: "modules",
    category: "workspace",
  },
  {
    id: "productivity",
    label: "Productivity",
    path: "/productivity",
    icon: ListChecks,
    description: "Tasks, focus, calendar",
    group: "modules",
    category: "workspace",
  },
  {
    id: "studies",
    label: "Studies",
    path: "/studies",
    icon: GraduationCap,
    description: "Learn faster with AI",
    group: "modules",
    category: "growth",
  },
  {
    id: "finance",
    label: "Finance",
    path: "/finance",
    icon: Wallet,
    description: "Track and plan money",
    group: "modules",
    category: "money",
  },
  {
    id: "content",
    label: "Content",
    path: "/content",
    icon: PenLine,
    description: "Write, edit, publish",
    group: "modules",
    category: "workspace",
  },
  {
    id: "translate",
    label: "Translate",
    path: "/translate",
    icon: Languages,
    description: "Multilingual, instant",
    group: "modules",
    category: "growth",
  },
  {
    id: "documents",
    label: "Documents",
    path: "/documents",
    icon: FileText,
    description: "Read, summarize, ask",
    group: "modules",
    category: "workspace",
  },
  {
    id: "agents",
    label: "Agents",
    path: "/agents",
    icon: Bot,
    description: "Custom AI agents",
    group: "modules",
    category: "intelligence",
    premium: true,
  },
  {
    id: "premium",
    label: "Premium",
    path: "/premium",
    icon: Crown,
    description: "Unlock everything",
    group: "system",
    category: "account",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences & account",
    group: "system",
    category: "account",
  },
];
