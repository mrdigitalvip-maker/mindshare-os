import { supabase } from "@/lib/supabase";

export type VoiceProviderState = "idle" | "speaking" | "error";

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

  async isAvailable() {
    const { data, error } = await supabase.functions.invoke<{ available: boolean }>(
      "nexora-voice",
      {
        body: { action: "availability" },
      },
    );
    return !error && data?.available === true;
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
