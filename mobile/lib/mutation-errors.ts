type BackendError = { message?: string; details?: string; code?: string; hint?: string };
export type MutationErrorKind =
  | "free-limit"
  | "invalid-date"
  | "invalid-input"
  | "not-found"
  | "active-session"
  | "authentication"
  | "permission"
  | "delete-restricted"
  | "stale"
  | "network"
  | "unexpected";
export class WorkspaceMutationError extends Error {
  constructor(
    message: string,
    public readonly kind: MutationErrorKind,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "WorkspaceMutationError";
  }
}
const messages: Record<string, string> = {
  projects: "O plano gratuito permite até 3 projetos ativos.",
  tasks: "O plano gratuito permite até 30 tarefas em aberto.",
  study_subjects: "O plano gratuito permite até 3 matérias ativas.",
  journeys: "O plano gratuito permite apenas 1 Journey ativa.",
};
export function workspaceMutationError(error: unknown): Error {
  const backend = error as BackendError;
  const text = `${backend?.message ?? ""} ${backend?.details ?? ""}`.toLowerCase();
  if (
    backend?.message === "STUDY_ACTIVE_SESSION_CONFLICT" ||
    `${backend?.message ?? ""} ${backend?.details ?? ""}`.includes(
      "study_sessions_one_active_per_user",
    )
  )
    return new WorkspaceMutationError(
      "Já existe uma sessão de estudo em andamento. Encerre ou retome essa sessão primeiro.",
      "active-session",
      error,
    );
  if (backend?.message === "TASK_STATE_CONFLICT")
    return new WorkspaceMutationError(
      "Não foi possível salvar: o estado da tarefa é inconsistente.",
      "unexpected",
      error,
    );
  if (text.includes("task_stale_or_not_found"))
    return new WorkspaceMutationError(
      "Esta tarefa mudou em outro lugar ou não está mais disponível. Atualize a tela.",
      "stale",
      error,
    );
  if (text.includes("mission_not_confirmable") || text.includes("mission_already_completed"))
    return new WorkspaceMutationError(
      "Esta missão já foi concluída ou não está mais disponível. Atualize a tela.",
      "stale",
      error,
    );
  if (text.includes("pack_step_not_found"))
    return new WorkspaceMutationError(
      "A etapa deste programa não está mais disponível. Atualize a Jornada.",
      "not-found",
      error,
    );
  if (text.includes("journey_not_found"))
    return new WorkspaceMutationError("Jornada não encontrada.", "not-found", error);
  if (
    text.includes("ensure_daily_journey_mission") ||
    text.includes("could not find the function") ||
    backend?.code === "PGRST202"
  )
    return new WorkspaceMutationError(
      "Não foi possível atualizar a missão de hoje. Tente novamente.",
      "unexpected",
      error,
    );
  if (backend?.message === "FREE_CREATION_LIMIT_REACHED") {
    const resource = Object.keys(messages).find(
      (key) =>
        backend.details?.includes(`\"resource\": \"${key}\"`) ||
        backend.details?.includes(`\"resource\":\"${key}\"`),
    );
    return new WorkspaceMutationError(
      resource ? messages[resource] : "Você atingiu o limite do plano gratuito.",
      "free-limit",
      error,
    );
  }
  if (backend?.code === "23503" || text.includes("foreign key constraint"))
    return new WorkspaceMutationError(
      "Este projeto possui tarefas e não pode ser excluído até que elas sejam movidas ou removidas.",
      "delete-restricted",
      error,
    );
  if (text.includes("project_stale_or_not_found") || text.includes("stale"))
    return new WorkspaceMutationError(
      "Este projeto mudou em outro lugar. Atualize a tela antes de tentar novamente.",
      "stale",
      error,
    );
  if (text.includes("project not found") || text.includes("project_not_found"))
    return new WorkspaceMutationError("Projeto não encontrado.", "not-found", error);
  if (text.includes("weekly_target_minutes") || text.includes("planned_minutes"))
    return new WorkspaceMutationError(
      "Revise os minutos informados e tente novamente.",
      "invalid-input",
      error,
    );
  if (text.includes("not found") || text.includes("não encontrada"))
    return new WorkspaceMutationError("O item não foi encontrado.", "not-found", error);
  if (
    text.includes("journey_invalid_date") ||
    backend?.code === "23514" ||
    text.includes("target_date")
  )
    return new WorkspaceMutationError(
      "Escolha uma data-alvo válida, a partir de hoje.",
      "invalid-date",
      error,
    );
  if (
    text.includes("authenticated user required") ||
    text.includes("jwt") ||
    text.includes("not authenticated")
  )
    return new WorkspaceMutationError(
      "Sua sessão expirou. Entre novamente para continuar.",
      "authentication",
      error,
    );
  if (
    backend?.code === "42501" ||
    text.includes("row-level security") ||
    text.includes("permission denied")
  )
    return new WorkspaceMutationError(
      "Sua sessão não tem permissão para alterar este item.",
      "permission",
      error,
    );
  if (
    text.includes("network") ||
    text.includes("fetch") ||
    text.includes("offline") ||
    text.includes("timeout")
  )
    return new WorkspaceMutationError(
      "Não foi possível conectar. Verifique sua internet e tente novamente.",
      "network",
      error,
    );
  return new WorkspaceMutationError(
    "Não foi possível salvar agora. Tente novamente.",
    "unexpected",
    error,
  );
}
