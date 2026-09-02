type BackendError = { message?: string; details?: string; code?: string; hint?: string };
export type MutationErrorKind =
  "free-limit" | "invalid-date" | "authentication" | "permission" | "network" | "unexpected";
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
  tasks: "O plano gratuito permite até 30 tarefas abertas.",
  study_subjects: "O plano gratuito permite até 3 matérias ativas.",
  journeys: "O plano gratuito permite apenas 1 Journey ativa.",
};
export function workspaceMutationError(error: unknown): Error {
  const backend = error as BackendError;
  if (backend?.message === "TASK_STATE_CONFLICT")
    return new WorkspaceMutationError(
      "Não foi possível salvar: o estado da tarefa é inconsistente.",
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
  const text = `${backend?.message ?? ""} ${backend?.details ?? ""}`.toLowerCase();
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
      "Sua sessão não tem permissão para alterar esta Jornada.",
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
