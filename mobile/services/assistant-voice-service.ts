import { supabase } from "@/lib/supabase";

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

export async function transcribeAssistantRecording(
  uri: string,
  locale: "pt-BR" | "en",
): Promise<string> {
  if (!uri) throw new Error("Nenhuma gravação foi encontrada.");

  const form = new FormData();
  form.append("action", "transcribe");
  form.append("language", locale === "pt-BR" ? "pt" : "en");
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
