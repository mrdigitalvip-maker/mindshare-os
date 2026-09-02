import { supabase } from "@/lib/supabase";
import type { NexoraAction } from "@/lib/nexora-actions";
import { mapNexoraActionError } from "@/lib/nexora-action-errors";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class NexoraActionError extends Error {
  constructor(
    public readonly safe: ReturnType<typeof mapNexoraActionError>,
    cause?: unknown,
  ) {
    super(safe.message, { cause });
    this.name = "NexoraActionError";
  }
}

export async function applyNexoraAction(input: {
  actionId: string;
  requestId: string;
  conversationId: string | null;
  confirmed: true;
  action: NexoraAction;
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
    )
      throw new Error("invalid result");
    return result as { status: "applied"; resourceId: string; idempotent: boolean };
  } catch (error) {
    if (error instanceof NexoraActionError) throw error;
    throw new NexoraActionError(mapNexoraActionError(error), error);
  }
}
