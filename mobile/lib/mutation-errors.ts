type BackendError = { message?: string; details?: string };
const messages: Record<string, string> = {
  projects: "O plano gratuito permite até 3 projetos ativos.",
  tasks: "O plano gratuito permite até 30 tarefas abertas.",
  study_subjects: "O plano gratuito permite até 3 matérias ativas.",
  journeys: "O plano gratuito permite apenas 1 Journey ativa.",
};
export function workspaceMutationError(error: unknown): Error {
  const backend = error as BackendError;
  if (backend?.message === "TASK_STATE_CONFLICT") return new Error("Não foi possível salvar: o estado da tarefa é inconsistente.");
  if (backend?.message === "FREE_CREATION_LIMIT_REACHED") {
    const resource = Object.keys(messages).find((key) => backend.details?.includes(`\"resource\": \"${key}\"`) || backend.details?.includes(`\"resource\":\"${key}\"`));
    return new Error(resource ? messages[resource] : "Você atingiu o limite do plano gratuito.");
  }
  return error instanceof Error ? error : new Error("Não foi possível concluir a operação.");
}
