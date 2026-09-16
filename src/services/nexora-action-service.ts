import { supabase } from "@/lib/supabase";
import type { NexoraMutationAction } from "@/lib/nexora-actions";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NexoraActionErrorCopy = {
  message: string;
  retry: boolean;
};

function mapNexoraActionError(error: unknown): NexoraActionErrorCopy {
  const raw = [
    (error as { code?: unknown } | null)?.code,
    (error as { message?: unknown } | null)?.message,
    (error as { details?: unknown } | null)?.details,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (raw.includes("confirmation_required"))
    return { message: "Confirme a alteração para continuar.", retry: false };
  if (raw.includes("unsupported_action"))
    return { message: "Essa alteração não é compatível com a KIVRYN.", retry: false };
  if (raw.includes("idempotency_conflict"))
    return { message: "Esta solicitação não corresponde mais à alteração preparada.", retry: false };
  if (raw.includes("action_in_progress"))
    return { message: "Essa alteração já está sendo processada. Aguarde um instante.", retry: true };
  if (raw.includes("conversation_not_found"))
    return { message: "Esta proposta não pertence mais à conversa atual.", retry: false };
  if (raw.includes("invalid_payload") || raw.includes("invalid result"))
    return { message: "A proposta está incompleta. Peça à KIVRYN para prepará-la novamente.", retry: false };
  if (raw.includes("stale_or_not_found"))
    return { message: "Esse item mudou desde que a KIVRYN preparou a alteração.", retry: false };
  if (raw.includes("project_not_found") || raw.includes("subject_not_found"))
    return { message: "Não foi possível localizar esse item no seu espaço de trabalho.", retry: false };
  if (raw.includes("unauthorized") || raw.includes("jwt") || raw.includes("session"))
    return { message: "Sua sessão expirou. Entre novamente para continuar.", retry: false };
  if (
    raw.includes("permission") ||
    raw.includes("row-level") ||
    raw.includes("rls") ||
    raw.includes("42501")
  )
    return { message: "Você não tem permissão para alterar esse item.", retry: false };
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("unavailable") || !raw)
    return { message: "Sem conexão com a KIVRYN. Tente novamente.", retry: true };
  return { message: "Não foi possível aplicar a alteração. Tente novamente.", retry: true };
}

export class NexoraActionError extends Error {
  constructor(
    public readonly safe: NexoraActionErrorCopy,
    cause?: unknown,
  ) {
    super(safe.message, { cause });
    this.name = "NexoraActionError";
  }
}

/** Applies a proposal only after explicit UI confirmation, through the authenticated audited RPC. */
export async function applyNexoraAction(input: {
  actionId: string;
  requestId: string;
  conversationId: string | null;
  confirmed: true;
  action: NexoraMutationAction;
}) {
  if (!input.confirmed) throw new Error("confirmation_required");
  try {
    const { data, error } = await supabase.rpc("apply_nexora_action", {
      p_action_id: input.actionId,
      p_request_id: input.requestId,
      p_conversation_id: input.conversationId,
      p_confirmed: true,
      p_action: input.action,
    } as never);
    if (error) throw error;
    const result = data as { status?: unknown; resourceId?: unknown; idempotent?: unknown } | null;
    if (
      result?.status !== "applied" ||
      typeof result.resourceId !== "string" ||
      !uuid.test(result.resourceId) ||
      typeof result.idempotent !== "boolean"
    ) {
      throw new Error("invalid result");
    }
    return result as { status: "applied"; resourceId: string; idempotent: boolean };
  } catch (error) {
    if (error instanceof NexoraActionError) throw error;
    throw new NexoraActionError(mapNexoraActionError(error), error);
  }
}
