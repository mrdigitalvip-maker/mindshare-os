export const CHAT_ATTACHMENT_LIMIT = 1;
export const CHAT_ATTACHMENT_MAX_BYTES = 6 * 1024 * 1024;
export const CHAT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CHAT_DOCUMENT_MIMES = ["text/plain"] as const;

export type ChatAttachmentKind = "image" | "document";
export type ChatAttachment = {
  id: string;
  kind: ChatAttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  previewUri?: string;
};

export type LocalChatAttachment = Omit<ChatAttachment, "storagePath"> & { uri: string };
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
};
export function attachmentExtension(mimeType: string) {
  return EXTENSIONS[mimeType.toLowerCase()] ?? null;
}
export function buildAttachmentStoragePath(
  userId: string,
  requestId: string,
  attachmentId: string,
  mimeType: string,
) {
  const extension = attachmentExtension(mimeType);
  const segment = /^[0-9a-f-]{20,}$/i;
  if (
    !segment.test(userId) ||
    !segment.test(requestId) ||
    !segment.test(attachmentId) ||
    !extension
  )
    throw new Error("invalid_attachment_path");
  return `${userId}/${requestId}/${attachmentId}.${extension}`;
}
export function isOwnedAttachmentPath(path: string, userId: string) {
  return path.split("/")[0] === userId && path.split("/").length === 3 && !path.includes("..");
}

export function validateChatAttachment(value: Pick<ChatAttachment, "kind" | "mimeType" | "size">) {
  if (!Number.isFinite(value.size) || value.size <= 0) return "ATTACHMENT_SIZE" as const;
  if (value.size > CHAT_ATTACHMENT_MAX_BYTES) return "ATTACHMENT_SIZE" as const;
  const allowed = value.kind === "image" ? CHAT_IMAGE_MIMES : CHAT_DOCUMENT_MIMES;
  if (!(allowed as readonly string[]).includes(value.mimeType.toLowerCase()))
    return "ATTACHMENT_TYPE" as const;
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const assistantCapabilities = {
  imageUpload: true,
  camera: true,
  documents: true,
  voiceRecording: false,
  speechToText: false,
  textToSpeech: true,
} as const;
