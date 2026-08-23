export type AssistantErrorCategory =
  | "AUTH"
  | "NETWORK"
  | "FUNCTION"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "AI_PROVIDER"
  | "PERSISTENCE"
  | "ATTACHMENT_UPLOAD"
  | "ATTACHMENT_TYPE"
  | "ATTACHMENT_SIZE"
  | "ATTACHMENT_OWNERSHIP"
  | "PERMISSION"
  | "CAMERA"
  | "TTS"
  | "UNKNOWN";

export type AssistantWireMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
  attachments?: Array<{
    id: string;
    kind: "image" | "document";
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }>;
};

export type AssistantSendPayload = {
  action: "send";
  message: string;
  conversationId: string | null;
  requestId: string;
  attachments?: AssistantWireMessage["attachments"];
};

export function createAssistantRequestId(random = Math.random): string {
  // ai_messages.id is a UUID. The old `mobile-...` identifier made every native insert fail.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.floor(random() * 16);
    return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export function isAssistantRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function buildAssistantSendPayload(
  message: string,
  conversationId: string | null,
  requestId: string,
  attachments: AssistantWireMessage["attachments"] = [],
): AssistantSendPayload {
  const content = message.trim();
  if (!content) throw new Error("invalid_request");
  if (!isAssistantRequestId(requestId)) throw new Error("invalid_request_id");
  return {
    action: "send",
    message: content,
    conversationId: conversationId?.trim() || null,
    requestId,
    ...(attachments.length ? { attachments } : {}),
  };
}

function isWireMessage(value: unknown, role: "user" | "assistant"): value is AssistantWireMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    message.id.length > 0 &&
    message.role === role &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

export function parseWireAttachments(
  value: unknown,
): NonNullable<AssistantWireMessage["attachments"]> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is NonNullable<AssistantWireMessage["attachments"]>[number] => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return (
      typeof row.id === "string" &&
      (row.kind === "image" || row.kind === "document") &&
      typeof row.name === "string" &&
      typeof row.mimeType === "string" &&
      typeof row.size === "number" &&
      typeof row.storagePath === "string" &&
      !row.storagePath.startsWith("http")
    );
  });
}

export function validateAssistantSendData(value: unknown): {
  conversationId: string;
  userMessage: AssistantWireMessage;
  assistantMessage: AssistantWireMessage;
} {
  if (!value || typeof value !== "object") throw new Error("invalid_response");
  const data = value as Record<string, unknown>;
  if (
    typeof data.conversationId !== "string" ||
    !data.conversationId.trim() ||
    !isWireMessage(data.userMessage, "user") ||
    !isWireMessage(data.assistantMessage, "assistant")
  ) {
    throw new Error("invalid_response");
  }
  return {
    conversationId: data.conversationId,
    userMessage: data.userMessage,
    assistantMessage: data.assistantMessage,
  };
}

export function classifyAssistantError(code?: string): AssistantErrorCategory {
  if (code === "attachment_type") return "ATTACHMENT_TYPE";
  if (code === "attachment_size") return "ATTACHMENT_SIZE";
  if (code === "attachment_upload") return "ATTACHMENT_UPLOAD";
  if (code === "attachment_ownership") return "ATTACHMENT_OWNERSHIP";
  if (code === "permission") return "PERMISSION";
  if (code === "camera") return "CAMERA";
  if (code === "tts") return "TTS";
  if (["unauthorized", "forbidden"].includes(code ?? "")) return "AUTH";
  if (["free_limit_reached", "premium_limit_reached", "provider_rate_limited"].includes(code ?? ""))
    return "RATE_LIMIT";
  if (
    ["invalid_request", "invalid_request_id", "input_too_large", "invalid_response"].includes(
      code ?? "",
    )
  )
    return "VALIDATION";
  if (code === "persistence_error" || code?.includes("history")) return "PERSISTENCE";
  if (
    ["provider_error", "provider_unavailable", "timeout", "configuration_error"].includes(
      code ?? "",
    )
  )
    return "AI_PROVIDER";
  if (["network", "unavailable"].includes(code ?? "")) return "NETWORK";
  if (["server_error", "function_error"].includes(code ?? "")) return "FUNCTION";
  return "UNKNOWN";
}

export function assistantErrorCopy(code?: string): { title: string; detail: string } {
  const category = classifyAssistantError(code);
  if (category === "AUTH")
    return { title: "Sua sessão expirou.", detail: "Entre novamente para continuar." };
  if (category === "RATE_LIMIT")
    return { title: "Limite diário atingido.", detail: "Tente novamente amanhã." };
  return {
    title: "Não foi possível enviar.",
    detail: "Sua mensagem foi preservada. Tente novamente.",
  };
}
