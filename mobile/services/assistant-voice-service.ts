import { supabase } from "@/lib/supabase";

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

type VoiceFunctionErrorPayload = { error?: { code?: unknown } };

async function voiceFunctionErrorCode(error: unknown): Promise<string | undefined> {
  if (!error || typeof error !== "object" || !("context" in error)) return undefined;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return undefined;
  const payload = (await context.clone().json().catch(() => null)) as VoiceFunctionErrorPayload | null;
  return typeof payload?.error?.code === "string" ? payload.error.code : undefined;
}

function transcriptionErrorMessage(code?: string): string {
  switch (code) {
    case "premium_required":
      return "Entrada de voz exige Premium ativo.";
    case "provider_unavailable":
      return "A transcrição de voz está temporariamente indisponível.";
    case "provider_rate_limited":
      return "A transcrição atingiu o limite do provedor. Tente novamente em instantes.";
    case "invalid_audio":
      return "O formato da gravação não pôde ser processado. Grave novamente.";
    case "empty_transcription":
      return "Não consegui identificar fala nessa gravação.";
    case "timeout":
      return "A transcrição demorou demais. Tente uma gravação mais curta.";
    case "unauthorized":
      return "Sua sessão expirou. Entre novamente para usar a voz.";
    default:
      return "Não foi possível transcrever o áudio.";
  }
}

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
  if (error) {
    throw new Error(transcriptionErrorMessage(await voiceFunctionErrorCode(error)));
  }
  const text = data?.text?.trim();
  if (!text) throw new Error(transcriptionErrorMessage("empty_transcription"));
  return text;
}

export const transcribeAssistantRecording = transcribeVoiceRecording;
