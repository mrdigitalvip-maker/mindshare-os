const projectStatusLabels: Record<string, string> = {
  active: "Em andamento",
  open: "Em andamento",
  in_progress: "Em andamento",
  "in progress": "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

const planLabels: Record<string, string> = {
  free: "Gratuito",
  basic: "Gratuito",
  premium: "Premium",
  pro: "Premium",
  advanced: "Premium",
};

const entitlementLabels: Record<string, string> = {
  free: "Gratuito",
  trialing: "Período de teste",
  active: "Ativo",
  expired: "Expirado",
};

function displayValue(value: unknown, labels: Record<string, string>, fallback: string) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const trimmed = value.trim();
  return labels[trimmed.toLowerCase()] ?? trimmed;
}

export function getDisplayProjectStatus(status: unknown) {
  return displayValue(status, projectStatusLabels, "Em andamento");
}

export function getDisplayPlan(plan: unknown) {
  return displayValue(plan, planLabels, "Gratuito");
}

export function getDisplayEntitlement(entitlement: unknown) {
  return displayValue(entitlement, entitlementLabels, "Indisponível");
}
