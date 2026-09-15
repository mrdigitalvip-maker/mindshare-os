export type WebAgentSkill = {
  id: string;
  capability: string;
  name: string;
  description: string;
};

export const WEB_AGENT_SKILLS: readonly WebAgentSkill[] = [
  {
    id: "writing.v1",
    capability: "writing",
    name: "Writing Specialist",
    description: "Escrita e revisão com foco em público, tom e resultado.",
  },
  {
    id: "planning.v1",
    capability: "planning",
    name: "Planning Specialist",
    description: "Transforma objetivos em etapas, dependências e próximas ações.",
  },
  {
    id: "summarization.v1",
    capability: "summarization",
    name: "Summarization Specialist",
    description: "Resume preservando decisões, riscos e pontos em aberto.",
  },
  {
    id: "study.v1",
    capability: "study",
    name: "Study Coach",
    description: "Orienta estudos usando contexto permitido de Studies e Passport.",
  },
  {
    id: "productivity.v1",
    capability: "productivity",
    name: "Productivity Operator",
    description: "Prioriza Tasks e Projects e destaca bloqueios e próximos passos.",
  },
] as const;

export function resolveWebAgentSkills(capabilities: readonly string[] | null | undefined) {
  const allowed = new Set(capabilities ?? []);
  return WEB_AGENT_SKILLS.filter((skill) => allowed.has(skill.capability));
}
