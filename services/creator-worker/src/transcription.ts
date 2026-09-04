import { readFile } from "node:fs/promises";
import type { Segment } from "./domain";
export interface Transcript {
  language: string;
  text: string;
  segments: Segment[];
  words?: Segment[];
}
export interface TranscriptionProvider {
  transcribe(path: string): Promise<Transcript>;
}
export class OpenAITranscriptionProvider implements TranscriptionProvider {
  constructor(
    private key = process.env.OPENAI_API_KEY,
    private model = process.env.TRANSCRIPTION_MODEL ?? "whisper-1",
  ) {}
  async transcribe(path: string) {
    if (!this.key)
      throw Object.assign(new Error("Transcription provider is not configured"), {
        code: "TRANSCRIPTION_PROVIDER_NOT_CONFIGURED",
      });
    const form = new FormData();
    form.set("model", this.model);
    form.set("response_format", "verbose_json");
    form.set("timestamp_granularities[]", "segment");
    form.set("file", new Blob([await readFile(path)]), "analysis.mp3");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}` },
      body: form,
    });
    if (!r.ok)
      throw Object.assign(new Error("Transcription provider rejected request"), {
        code: r.status >= 500 ? "TRANSCRIPTION_PROVIDER_UNAVAILABLE" : "TRANSCRIPTION_FAILED",
      });
    const x: any = await r.json();
    const segments = (x.segments ?? []).map((s: any) => ({
      startMs: Math.round(Number(s.start) * 1000),
      endMs: Math.round(Number(s.end) * 1000),
      text: String(s.text ?? "").trim(),
    }));
    if (!segments.length)
      throw Object.assign(new Error("Transcript has no timing"), {
        code: "TRANSCRIPT_TIMING_MISSING",
      });
    return { language: String(x.language ?? "und"), text: String(x.text ?? ""), segments };
  }
}
