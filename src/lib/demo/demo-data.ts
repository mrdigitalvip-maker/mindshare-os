/**
 * TEMPORARY DEMO DATASET — NEXORA OS
 * Coherent, product-accurate sample data used only while the real APIs are
 * unavailable. See `src/lib/demo/config.ts` for how to disable/remove.
 */

export type DemoCounters = {
  openTasks: number;
  dueSoon: number;
  projectCount: number;
  completionRate: number;
  conversationCount: number;
};

export const demoCounters: DemoCounters = {
  openTasks: 5,
  dueSoon: 3,
  projectCount: 4,
  completionRate: 62,
  conversationCount: 12,
};

export const demoProjects = [
  { id: "demo-project-1", title: "NEXORA Launch Plan", progress: 72, color: "bg-emerald-500" },
  { id: "demo-project-2", title: "Q3 Study Roadmap", progress: 45, color: "bg-sky-500" },
  { id: "demo-project-3", title: "Personal Finance Reset", progress: 28, color: "bg-amber-500" },
];

export const demoSuggestions = [
  {
    id: "demo-suggestion-1",
    title: "Continue your active workspace",
    description: "Pick up NEXORA Launch Plan and move it closer to completion.",
    action: "Continue",
  },
  {
    id: "demo-suggestion-2",
    title: "Review your recent document",
    description: "Open Product Brief v2 and turn it into an AI-ready summary.",
    action: "Summarize",
  },
  {
    id: "demo-suggestion-3",
    title: "Close the next action item",
    description: "Move Draft the onboarding email forward with a focused session.",
    action: "Review",
  },
];

function clockOffset(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const demoActivity = [
  { id: "demo-activity-1", title: "Assistant summarized Product Brief v2", time: clockOffset(12) },
  {
    id: "demo-activity-2",
    title: "Task completed: Outline launch checklist",
    time: clockOffset(75),
  },
  { id: "demo-activity-3", title: "Project updated: NEXORA Launch Plan", time: clockOffset(180) },
  { id: "demo-activity-4", title: "New note added to Q3 Study Roadmap", time: clockOffset(320) },
];

export const demoProfile = {
  id: "demo-user",
  full_name: "Alex Nexora",
  username: "alex",
  avatar_url: null,
  bio: "Building with NEXORA OS.",
  language: "pt-BR",
  country: "BR",
  timezone: "America/Sao_Paulo",
  primary_goal: "Ship faster with an AI operating system",
  preferences: {},
  plan: "free",
  onboarded: true,
  email_notifications: true,
  push_notifications: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Context-aware canned assistant reply used when the AI backend is offline. */
export function demoAssistantReply(prompt: string): string {
  const text = prompt.toLowerCase();

  if (text.includes("semana") || text.includes("week") || text.includes("plan")) {
    return [
      "Here's a focused week built around 3 goals:",
      "",
      "1. Ship the NEXORA launch checklist — 2 deep-work blocks (Mon, Wed).",
      "2. Advance the Q3 Study Roadmap — 45 min daily review.",
      "3. Reset personal finance — one 60 min planning block on Friday.",
      "",
      "(Demo mode: this is a simulated response — the real model answers once the AI service is enabled.)",
    ].join("\n");
  }

  if (text.includes("resum") || text.includes("summar") || text.includes("document")) {
    return [
      "Summary of your latest document:",
      "",
      "• Core idea: NEXORA is a personal AI operating system unifying projects, study, finance and content.",
      "• Next step: validate onboarding flow with 5 users.",
      "• Risk: scope creep across modules — prioritise Dashboard and Assistant first.",
      "",
      "(Demo mode: simulated response.)",
    ].join("\n");
  }

  if (text.includes("email") || text.includes("client") || text.includes("cliente")) {
    return [
      "Draft (EN):",
      "Hi Marina, quick update — the NEXORA workspace is ready for your review...",
      "",
      "Rascunho (PT):",
      "Olá Marina, uma atualização rápida — o workspace NEXORA está pronto para revisão...",
      "",
      "(Demo mode: simulated response.)",
    ].join("\n");
  }

  return [
    `Got it — here's how I'd approach "${prompt.trim()}":`,
    "",
    "1. Clarify the outcome you want in one sentence.",
    "2. Break it into 3 concrete next actions.",
    "3. Schedule the first action as a 25 min focus block today.",
    "",
    "(Demo mode: simulated response — connect the AI service for live answers.)",
  ].join("\n");
}
