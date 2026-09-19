import { File } from "expo-file-system";

import { supabase } from "@/lib/supabase";

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

export async function transcribeAssistantRecording(
  uri: string,
  locale: "pt-BR" | "en",
): Promise<string> {
  const audio = new File(uri);
  if (!audio.exists || !audio.size || audio.size > MAX_AUDIO_BYTES) {
    throw new Error("A gravação precisa ter até 6 MB.");
  }

  const form = new FormData();
  form.append("action", "transcribe");
  form.append("language", locale === "pt-BR" ? "pt" : "en");
  form.append("audio", audio as unknown as Blob, audio.name || "kivryn-voice.m4a");

  const { data, error } = await supabase.functions.invoke<{ text?: string }>("nexora-voice", {
    body: form,
  });
  const text = data?.text?.trim();
  if (error || !text) throw new Error("Não foi possível transcrever o áudio.");
  return text;
}
