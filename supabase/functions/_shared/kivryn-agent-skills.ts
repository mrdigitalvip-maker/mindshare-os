import type { KivrynActionDomain } from "./kivryn-action-registry.ts";
import { resolveAgentActionDomains } from "./kivryn-agent-capabilities.ts";

export const KIVRYN_SKILL_REGISTRY_VERSION = 1 as const;

export type KivrynContextScope =
  | "profile"
  | "preferences"
  | "tasks"
  | "projects"
  | "studies"
  | "passport";

export type KivrynAgentSkill = {
  id: string;
  capability: string;
  name: string;
  version: 1;
  purpose: string;
  method: readonly string[];
  contextScopes: readonly KivrynContextScope[];
  actionDomains: readonly KivrynActionDomain[];
};

const BASE_CONTEXT: readonly KivrynContextScope[] = ["profile", "preferences"];

const DEFINITIONS: Record<string, Omit<KivrynAgentSkill, "actionDomains">> = {
  writing: {
    id: "writing.v1",
    capability: "writing",
    name: "Writing Specialist",
    version: 1,
    purpose: "Create and refine clear writing that matches the requested audience, tone and output.",
    method: [
      "Identify the requested audience, format and outcome before drafting.",
      "Prefer concrete language, useful structure and faithful transformation of supplied facts.",
      "Do not invent research, sources, personal facts or tool results.",
    ],
    contextScopes: BASE_CONTEXT,
  },
  planning: {
    id: "planning.v1",
    capability: "planning",
    name: "Planning Specialist",
    version: 1,
    purpose: "Turn goals into bounded, ordered and realistic plans using the user's active workspace context.",
    method: [
      "Separate goals, constraints, dependencies and next actions.",
      "Prefer a small number of executable steps over vague strategy.",
      "Treat workspace mutations as proposals unless KIVRYN provides explicit approved action authority.",
    ],
    contextScopes: [...BASE_CONTEXT, "tasks", "projects"],
  },
  summarization: {
    id: "summarization.v1",
    capability: "summarization",
    name: "Summarization Specialist",
    version: 1,
    purpose: "Compress supplied information while preserving decisions, constraints, risks and unresolved items.",
    method: [
      "Prioritize material facts over decorative detail.",
      "Distinguish confirmed information from inference or uncertainty.",
      "Never claim access to material that KIVRYN did not include in the current context.",
    ],
    contextScopes: BASE_CONTEXT,
  },
  study: {
    id: "study.v1",
    capability: "study",
    name: "Study Coach",
    version: 1,
    purpose: "Help the user learn, practice and progress using active Studies and Passport context.",
    method: [
      "Adapt explanations to the visible learning goals and current study state.",
      "Use active recall, examples and practical next steps when appropriate.",
      "Do not mark study progress or alter goals without explicit KIVRYN action approval.",
    ],
    contextScopes: [...BASE_CONTEXT, "studies", "passport"],
  },
  productivity: {
    id: "productivity.v1",
    capability: "productivity",
    name: "Productivity Operator",
    version: 1,
    purpose: "Prioritize and organize Tasks and Projects into the clearest useful next actions.",
    method: [
      "Surface blockers, deadlines and high-leverage next actions before low-value work.",
      "Prefer the smallest useful change that moves an active project forward.",
      "Never mutate Tasks or Projects unless KIVRYN supplies explicit approved action authority.",
    ],
    contextScopes: [...BASE_CONTEXT, "tasks", "projects"],
  },
};

export const KIVRYN_AGENT_SKILL_IDS = Object.freeze(
  Object.values(DEFINITIONS).map((definition) => definition.id),
);

export function resolveKivrynAgentSkills(capabilities: unknown): KivrynAgentSkill[] {
  if (!Array.isArray(capabilities)) return [];
  const seen = new Set<string>();
  const resolved: KivrynAgentSkill[] = [];
  const actionDomains = resolveAgentActionDomains(capabilities);

  for (const raw of capabilities) {
    if (typeof raw !== "string" || seen.has(raw)) continue;
    const definition = DEFINITIONS[raw];
    if (!definition) continue;
    seen.add(raw);
    const domains = actionDomains.filter((domain) =>
      raw === "study" ? domain === "studies" : raw === "planning" || raw === "productivity" ? domain !== "studies" : false,
    );
    resolved.push({ ...definition, actionDomains: domains });
  }
  return resolved;
}

export function serializeKivrynAgentSkills(skills: readonly KivrynAgentSkill[]): string {
  const payload = skills.slice(0, 5).map((skill) => ({
    id: skill.id,
    name: skill.name,
    purpose: skill.purpose,
    method: skill.method,
    contextScopes: skill.contextScopes,
    actionDomains: skill.actionDomains,
  }));
  const serialized = JSON.stringify({ registryVersion: KIVRYN_SKILL_REGISTRY_VERSION, skills: payload });
  return serialized.slice(0, 6000);
}
