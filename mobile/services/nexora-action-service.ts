import { supabase } from "@/lib/supabase";
import type { NexoraAction } from "@/lib/nexora-actions";

export async function applyNexoraAction(input: {
  actionId: string;
  requestId: string;
  conversationId: string | null;
  confirmed: true;
  action: NexoraAction;
}) {
  if (!input.confirmed) throw new Error("confirmation_required");
  const { data, error } = await supabase.rpc("apply_nexora_action", {
    p_action_id: input.actionId,
    p_request_id: input.requestId,
    p_conversation_id: input.conversationId,
    p_confirmed: true,
    p_action: input.action,
  } as never);
  if (error) throw error;
  return data as { status: "applied"; resourceId: string; idempotent: boolean };
}
