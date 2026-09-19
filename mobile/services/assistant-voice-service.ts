import { supabase } from "@/lib/supabase";

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

function transcriptionLanguage(locale: string) {
  const normalized = locale.trim().toLowerCase();
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  return "en";
}

export async function transcribeVoiceRecording(
  uri: string,
  locale: string,
): Promise<string> {
  if (!uri) throw new Error("Nenhuma gravação foi encontrada.");

  const form = new FormData();
  form.append("action", "transcribe");
  form.append("language", transcriptionLanguage(locale));
  const audio: ReactNativeFormFile = {
    uri,
    name: "kivryn-voice.m4a",
    type: "audio/m4a",
  };
  form.append("audio", audio as unknown as Blob);

  const { data, error } = await supabase.functions.invoke<{ text?: string }>("nexora-voice", {
    body: form,
  });
  const text = data?.text?.trim();
  if (error || !text) throw new Error("Não foi possível transcrever o áudio.");
  return text;
}

export const transcribeAssistantRecording = transcribeVoiceRecording;
