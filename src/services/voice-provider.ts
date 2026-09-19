import { supabase } from "@/lib/supabase";

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

export type VoiceProviderState = "idle" | "speaking" | "error";
export type VoiceAvailability = {
  available: boolean;
  speechAvailable?: boolean;
  transcriptionAvailable?: boolean;
  premiumOnly?: boolean;
};

export interface VoiceProvider {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  speak(text: string): Promise<void>;
  stop(): void;
}

export class FallbackVoiceProvider implements VoiceProvider {
  readonly id = "browser";

  async isAvailable() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  async speak(text: string) {
    if (!(await this.isAvailable())) throw new Error("Voz do navegador indisponível.");
    this.stop();
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Não foi possível reproduzir a resposta."));
      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }
}

/** Calls only the authenticated Edge Function; provider credentials never enter the bundle. */
export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly id = "elevenlabs";
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;

  async availability(): Promise<VoiceAvailability> {
    const { data, error } = await supabase.functions.invoke<VoiceAvailability>("nexora-voice", {
      body: { action: "availability" },
    });
    if (error) return { available: false };
    return data ?? { available: false };
  }

  async isAvailable() {
    const availability = await this.availability();
    return availability.speechAvailable ?? availability.available;
  }

  async speak(text: string) {
    this.stop();
    const { data, error } = await supabase.functions.invoke<Blob>("nexora-voice", {
      body: { action: "speak", text },
    });
    if (error || !(data instanceof Blob)) throw new Error("Voz avançada indisponível.");
    this.objectUrl = URL.createObjectURL(data);
    this.audio = new Audio(this.objectUrl);
    await new Promise<void>((resolve, reject) => {
      if (!this.audio) return reject(new Error("Áudio indisponível."));
      this.audio.onended = () => {
        this.stop();
        resolve();
      };
      this.audio.onerror = () => {
        this.stop();
        reject(new Error("Falha ao reproduzir voz."));
      };
      void this.audio.play().catch(reject);
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}

function recordingFilename(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes("webm")) return "kivryn-voice.webm";
  if (type.includes("ogg")) return "kivryn-voice.ogg";
  if (type.includes("wav")) return "kivryn-voice.wav";
  if (type.includes("mp4") || type.includes("m4a")) return "kivryn-voice.m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "kivryn-voice.mp3";
  return "kivryn-voice.webm";
}

export async function transcribeVoiceAudio(
  audio: Blob,
  locale: "pt-BR" | "en" | "en-US",
): Promise<string> {
  if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
    throw new Error("A gravação precisa ter até 6 MB.");
  }

  const form = new FormData();
  form.append("action", "transcribe");
  form.append("language", locale === "pt-BR" ? "pt" : "en");
  form.append("audio", audio, recordingFilename(audio));

  const { data, error } = await supabase.functions.invoke<{ text?: string }>("nexora-voice", {
    body: form,
  });
  const text = data?.text?.trim();
  if (error || !text) throw new Error("Não foi possível transcrever o áudio.");
  return text;
}

type SpeechRecognitionResultEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function createSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}
