import type { LocalChatAttachment } from "@/lib/chat-attachments";

export type AssistantPickerAsset = {
  uri?: string | null;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  size?: number | null;
};

export type AssistantQuickAction =
  | { label: string; type: "prompt"; value: string }
  | { label: string; type: "gallery" | "document" };

export const ASSISTANT_QUICK_ACTIONS: readonly AssistantQuickAction[] = [
  {
    label: "Organizar meu dia",
    type: "prompt",
    value: "Organize meu dia com base nas minhas tarefas e prioridades.",
  },
  {
    label: "Revisar minhas tarefas",
    type: "prompt",
    value: "Revise minhas tarefas e sugira a melhor ordem de execução.",
  },
  {
    label: "Planejar meu projeto",
    type: "prompt",
    value: "Ajude a planejar meu projeto com próximos passos objetivos.",
  },
  { label: "Analisar uma imagem", type: "gallery" },
  { label: "Resumir um arquivo", type: "document" },
] as const;

export function canSendAssistantMessage(
  draft: string,
  attachment: LocalChatAttachment | null,
  busy: boolean,
) {
  return !busy && (draft.trim().length > 0 || attachment !== null);
}

export function attachmentFromPickerAsset(
  asset: AssistantPickerAsset | undefined,
  kind: LocalChatAttachment["kind"],
  id: string,
): LocalChatAttachment | null {
  if (!asset?.uri) return null;
  const fallbackMime = kind === "image" ? "image/jpeg" : "text/plain";
  return {
    id,
    uri: asset.uri,
    kind,
    name: asset.fileName || asset.name || (kind === "image" ? "imagem.jpg" : "arquivo.txt"),
    mimeType: asset.mimeType || fallbackMime,
    size: asset.fileSize ?? asset.size ?? 0,
  };
}

export function removeAssistantAttachment() {
  return null;
}

export function resolveQuickAction(action: AssistantQuickAction) {
  return action.type === "prompt"
    ? { draft: action.value, picker: null }
    : { draft: "", picker: action.type };
}
