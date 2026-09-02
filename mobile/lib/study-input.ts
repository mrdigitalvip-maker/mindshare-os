export type SubjectInput = {
  name: string;
  objective?: string;
  weeklyTargetMinutes?: number | null;
};

export function normalizeSubjectInput(input: SubjectInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da matéria.");
  const weeklyTargetMinutes = input.weeklyTargetMinutes ?? null;
  if (
    weeklyTargetMinutes !== null &&
    (!Number.isInteger(weeklyTargetMinutes) ||
      weeklyTargetMinutes < 1 ||
      weeklyTargetMinutes > 10080)
  )
    throw new Error("A meta semanal deve ser um número inteiro entre 1 e 10080 minutos.");
  return {
    name,
    objective: input.objective?.trim() || undefined,
    weeklyTargetMinutes,
  };
}

export function normalizeSessionInput(activity: string, plannedMinutes: number) {
  const normalizedActivity = activity.trim();
  if (!normalizedActivity) throw new Error("Informe o que você vai estudar.");
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 1440)
    throw new Error("A duração deve ser um número inteiro entre 1 e 1440 minutos.");
  return { activity: normalizedActivity, plannedMinutes };
}
