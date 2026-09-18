export type MobileAgentSkill = {
  id: string;
  capability: string;
  name: string;
  description: string;
};

export const MOBILE_AGENT_SKILLS: readonly MobileAgentSkill[] = [
  {
    id: "writing.v1",
    capability: "writing",
    name: "Writing Specialist",
    description: "Escrita e revisão orientadas a público, tom e resultado.",
  },
  {
    id: "planning.v1",
    capability: "planning",
    name: "Planning Specialist",
    description: "Planos claros com etapas, dependências e próximas ações.",
  },
  {
    id: "summarization.v1",
    capability: "summarization",
    name: "Summarization Specialist",
    description: "Resumos que preservam decisões, riscos e pendências.",
  },
  {
    id: "study.v1",
    capability: "study",
    name: "Study Coach",
    description: "Orientação de estudos usando Studies e Passport permitidos.",
  },
  {
    id: "productivity.v1",
    capability: "productivity",
    name: "Productivity Operator",
    description: "Prioriza Tasks e Projects sem executar mudanças silenciosas.",
  },
  {
    id: "integrations.v1",
    capability: "integrations",
    name: "Integration Operator",
    description: "Prepara ações externas para aprovação em Gmail, Calendar e Drive conectados.",
  },
] as const;

export function resolveMobileAgentSkills(capabilities: readonly string[] | null | undefined) {
  const allowed = new Set(capabilities ?? []);
  return MOBILE_AGENT_SKILLS.filter((skill) => allowed.has(skill.capability));
}
