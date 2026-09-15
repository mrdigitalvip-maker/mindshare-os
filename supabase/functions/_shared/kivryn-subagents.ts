import type { KivrynAgentSkill } from "./kivryn-agent-skills.ts";

export const KIVRYN_SUBAGENT_REGISTRY_VERSION = 1 as const;
export const KIVRYN_MAX_SUBAGENTS_PER_RUN = 3 as const;

export type KivrynSubagentId =
  | "editor.v1"
  | "planner.v1"
  | "analyst.v1"
  | "tutor.v1"
  | "operator.v1";

export type KivrynSubagent = {
  id: KivrynSubagentId;
  name: string;
  version: 1;
  purpose: string;
  skillIds: readonly string[];
  canDelegate: false;
  canMutate: false;
};

const REGISTRY: readonly KivrynSubagent[] = [
  {
    id: "editor.v1",
    name: "Editor",
    version: 1,
    purpose: "Draft, rewrite and improve supplied material without inventing facts.",
    skillIds: ["writing.v1", "summarization.v1"],
    canDelegate: false,
    canMutate: false,
  },
  {
    id: "planner.v1",
    name: "Planner",
    version: 1,
    purpose: "Break goals into ordered, bounded plans using only the context KIVRYN supplied.",
    skillIds: ["planning.v1"],
    canDelegate: false,
    canMutate: false,
  },
  {
    id: "analyst.v1",
    name: "Analyst",
    version: 1,
    purpose: "Synthesize context, surface constraints and compare options without taking actions.",
    skillIds: ["summarization.v1", "planning.v1"],
    canDelegate: false,
    canMutate: false,
  },
  {
    id: "tutor.v1",
    name: "Tutor",
    version: 1,
    purpose: "Explain and coach with active recall using only the user's allowed study context.",
    skillIds: ["study.v1"],
    canDelegate: false,
    canMutate: false,
  },
  {
    id: "operator.v1",
    name: "Productivity Operator",
    version: 1,
    purpose: "Prioritize next actions and blockers; workspace mutations remain proposal-only.",
    skillIds: ["productivity.v1", "planning.v1"],
    canDelegate: false,
    canMutate: false,
  },
];

export function resolveKivrynSubagents(skills: readonly KivrynAgentSkill[]) {
  const allowedSkills = new Set(skills.map((skill) => skill.id));
  return REGISTRY.filter((subagent) => subagent.skillIds.some((id) => allowedSkills.has(id))).slice(
    0,
    KIVRYN_MAX_SUBAGENTS_PER_RUN,
  );
}

export function getKivrynSubagent(
  id: unknown,
  allowed: readonly KivrynSubagent[],
): KivrynSubagent | null {
  if (typeof id !== "string") return null;
  return allowed.find((subagent) => subagent.id === id) ?? null;
}

export function serializeKivrynSubagents(subagents: readonly KivrynSubagent[]) {
  return JSON.stringify({
    registryVersion: KIVRYN_SUBAGENT_REGISTRY_VERSION,
    subagents: subagents.map(({ id, name, purpose, skillIds }) => ({
      id,
      name,
      purpose,
      skillIds,
      canDelegate: false,
      canMutate: false,
    })),
  }).slice(0, 3500);
}
