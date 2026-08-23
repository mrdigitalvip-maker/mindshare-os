import { supabase } from "@/lib/supabase";
import {
  buildAttachmentStoragePath,
  validateChatAttachment,
  type ChatAttachment,
  type LocalChatAttachment,
} from "@/lib/chat-attachments";
import { ChatServiceError } from "@/services/chat-service";

export async function uploadChatAttachment(
  draft: LocalChatAttachment,
  requestId: string,
): Promise<ChatAttachment> {
  const validation = validateChatAttachment(draft);
  if (validation) throw new ChatServiceError(validation.toLowerCase(), "Arquivo inválido.");
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new ChatServiceError("unauthorized", "Sessão necessária.");
  const path = buildAttachmentStoragePath(data.user.id, requestId, draft.id, draft.mimeType);
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(draft.uri);
    if (!response.ok) throw new Error("read_failed");
    bytes = await response.arrayBuffer();
  } catch {
    throw new ChatServiceError("attachment_upload", "Não foi possível ler o arquivo.");
  }
  if (bytes.byteLength !== draft.size)
    throw new ChatServiceError("attachment_size", "O tamanho do arquivo mudou.");
  const { error } = await supabase.storage
    .from("ai-attachments")
    .upload(path, bytes, { contentType: draft.mimeType, upsert: false });
  if (error) throw new ChatServiceError("attachment_upload", "Falha no envio do arquivo.");
  return { ...draft, storagePath: path, previewUri: draft.uri };
}
