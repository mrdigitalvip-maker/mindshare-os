export type ActionErrorKind =
  | "confirmation"
  | "unsupported"
  | "idempotency"
  | "in_progress"
  | "conversation"
  | "invalid"
  | "not_found"
  | "stale"
  | "auth"
  | "permission"
  | "free_limit"
  | "network"
  | "unexpected";

export type ActionErrorCopy = { kind: ActionErrorKind; message: string; retry: boolean };

/** Converts backend failures to safe copy; raw database text must never reach normal UI. */
export function mapNexoraActionError(error: unknown): ActionErrorCopy {
  const raw = [
    (error as { code?: unknown } | null)?.code,
    (error as { message?: unknown } | null)?.message,
    (error as { details?: unknown } | null)?.details,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (raw.includes("confirmation_required"))
    return { kind: "confirmation", message: "Confirme a alteração para continuar.", retry: false };
  if (raw.includes("unsupported_action"))
    return {
      kind: "unsupported",
      message: "Essa alteração não é compatível com a NEXORA.",
      retry: false,
    };
  if (raw.includes("idempotency_conflict"))
    return {
      kind: "idempotency",
      message: "Esta solicitação não corresponde mais à alteração preparada.",
      retry: false,
    };
  if (raw.includes("action_in_progress"))
    return {
      kind: "in_progress",
      message: "Essa alteração já está sendo processada. Aguarde um instante.",
      retry: true,
    };
  if (raw.includes("conversation_not_found"))
    return {
      kind: "conversation",
      message: "Esta proposta não pertence mais à conversa atual.",
      retry: false,
    };
  if (raw.includes("invalid_payload") || raw.includes("invalid result"))
    return {
      kind: "invalid",
      message: "A proposta está incompleta. Peça à NEXORA para prepará-la novamente.",
      retry: false,
    };
  if (raw.includes("stale_or_not_found"))
    return {
      kind: "stale",
      message: "Esse item mudou desde que a NEXORA preparou a alteração.",
      retry: false,
    };
  if (raw.includes("project_not_found") || raw.includes("subject_not_found"))
    return {
      kind: "not_found",
      message: "Não foi possível localizar esse item no seu espaço de trabalho.",
      retry: false,
    };
  if (raw.includes("unauthorized") || raw.includes("jwt") || raw.includes("session"))
    return {
      kind: "auth",
      message: "Sua sessão expirou. Entre novamente para continuar.",
      retry: false,
    };
  if (
    raw.includes("permission") ||
    raw.includes("row-level") ||
    raw.includes("rls") ||
    raw.includes("42501")
  )
    return {
      kind: "permission",
      message: "Você não tem permissão para alterar esse item.",
      retry: false,
    };
  if (raw.includes("free") && (raw.includes("limit") || raw.includes("quota")))
    return {
      kind: "free_limit",
      message: "Você atingiu o limite de criações do plano gratuito.",
      retry: false,
    };
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("unavailable") || !raw)
    return { kind: "network", message: "Sem conexão com a NEXORA. Tente novamente.", retry: true };
  return {
    kind: "unexpected",
    message: "Não foi possível aplicar a alteração. Tente novamente.",
    retry: true,
  };
}
