export interface VoiceProvider {
  readonly id: string;
  isAvailable(): boolean;
  speak(text: string): Promise<void>;
  stop(): void;
}

export class FallbackVoiceProvider implements VoiceProvider {
  readonly id = "browser";
  isAvailable() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  async speak(text: string) {
    if (!this.isAvailable()) return;
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

/** Backend-only adapter contract. It intentionally contains no API key. */
export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly id = "elevenlabs";
  constructor(
    private readonly endpoint?: string,
    private readonly voiceId?: string,
  ) {}
  isAvailable() {
    return Boolean(this.endpoint && this.voiceId);
  }
  async speak(_text: string) {
    throw new Error("ElevenLabs voice streaming is not configured.");
  }
  stop() {}
}

type SpeechRecognitionResultEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
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
