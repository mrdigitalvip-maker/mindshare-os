export type AssistantQuotaFeature = "assistant_standard" | "assistant_attachment";

export type AssistantQuotaClaim = {
  allowed: boolean;
  replay: boolean;
  deniedFeature?: AssistantQuotaFeature;
  entitlement: "free" | "premium";
  assistant: { used: number; limit: number };
  attachment?: { used: number; limit: number };
};

export function parseAssistantQuotaClaim(value: unknown): AssistantQuotaClaim | null {
  if (!value || typeof value !== "object") return null;
  const claim = value as Record<string, unknown>;
  const meter = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return null;
    const row = candidate as Record<string, unknown>;
    return Number.isInteger(row.used) && Number.isInteger(row.limit)
      ? { used: row.used as number, limit: row.limit as number }
      : null;
  };
  const assistant = meter(claim.assistant);
  const attachment = claim.attachment === undefined ? undefined : meter(claim.attachment);
  if (
    typeof claim.allowed !== "boolean" ||
    typeof claim.replay !== "boolean" ||
    (claim.entitlement !== "free" && claim.entitlement !== "premium") ||
    !assistant ||
    (claim.attachment !== undefined && !attachment) ||
    (claim.deniedFeature !== undefined &&
      claim.deniedFeature !== "assistant_standard" &&
      claim.deniedFeature !== "assistant_attachment")
  )
    return null;
  return {
    allowed: claim.allowed,
    replay: claim.replay,
    entitlement: claim.entitlement,
    assistant,
    ...(attachment ? { attachment } : {}),
    ...(claim.deniedFeature ? { deniedFeature: claim.deniedFeature as AssistantQuotaFeature } : {}),
  };
}

export async function assistantRequestFingerprint(input: {
  message: string;
  conversationId: string | null;
  attachments: Array<{
    id: string;
    kind: string;
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }>;
}): Promise<string> {
  const canonical = JSON.stringify({
    message: input.message,
    conversationId: input.conversationId,
    attachments: input.attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      storagePath: attachment.storagePath,
    })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
