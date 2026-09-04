export type Segment = { startMs: number; endMs: number; text: string };
export type Probe = {
  durationMs: number;
  width: number;
  height: number;
  fps: number | null;
  hasAudio: boolean;
  codec: string;
  format: string;
};
export type Candidate = {
  startMs: number;
  endMs: number;
  text: string;
  score?: number;
  reason?: string;
};
export const ACTIVE_STATES = [
  "queued",
  "analyzing",
  "transcribing",
  "selecting_clips",
  "rendering",
] as const;
export function parseProbe(raw: string): Probe {
  const x = JSON.parse(raw) as {
      streams?: Array<Record<string, unknown>>;
      format?: Record<string, unknown>;
    },
    streams = Array.isArray(x.streams) ? x.streams : [],
    v = streams.find((s) => s.codec_type === "video");
  if (!v)
    throw Object.assign(new Error("No usable video stream"), { code: "INVALID_MEDIA_NO_VIDEO" });
  const duration = Number(v.duration ?? x.format?.duration),
    width = Number(v.width),
    height = Number(v.height);
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  )
    throw Object.assign(new Error("Unreadable media metadata"), { code: "INVALID_MEDIA_METADATA" });
  const rate = String(v.avg_frame_rate ?? "0/0")
    .split("/")
    .map(Number);
  const fps = rate[1] > 0 ? rate[0] / rate[1] : null;
  return {
    durationMs: Math.round(duration * 1000),
    width,
    height,
    fps,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
    codec: String(v.codec_name ?? "unknown"),
    format: String(x.format?.format_name ?? ""),
  };
}
export function normalizeScenes(values: number[], durationMs: number) {
  return [
    ...new Set(values.map((v) => Math.round(v * 1000)).filter((v) => v > 0 && v < durationMs)),
  ].sort((a, b) => a - b);
}
const sentenceEnd = /[.!?…]\s*$/u;
export function boundaries(segments: Segment[], scenes: number[], duration: number) {
  return [
    ...new Set([
      0,
      duration,
      ...scenes,
      ...segments.filter((s) => sentenceEnd.test(s.text)).map((s) => s.endMs),
      ...segments.map((s) => s.startMs),
    ]),
  ].sort((a, b) => a - b);
}
export function hookStrength(text: string, language: string) {
  const t = text.trim().toLowerCase();
  let n = 25;
  if (
    /^(why|how|what|when|where|who|por que|como|o que|quando|onde|quem)\b/.test(t) ||
    t.includes("?")
  )
    n += 30;
  if (/^(you|your|você|vocês|seu|sua)\b/.test(t)) n += 15;
  if (/^(\d+|one|two|three|um|uma|dois|três)\b/.test(t)) n += 15;
  if (/\b(but|however|instead|mas|porém|só que)\b/.test(t)) n += 15;
  return Math.min(100, n);
}
export function scoreCandidate(
  c: Candidate,
  segments: Segment[],
  sceneCuts: number[],
  language: string,
) {
  const hit = segments.filter((s) => s.endMs > c.startMs && s.startMs < c.endMs);
  const duration = c.endMs - c.startMs;
  const spoken = hit.reduce(
    (n, s) => n + Math.max(0, Math.min(c.endMs, s.endMs) - Math.max(c.startMs, s.startMs)),
    0,
  );
  const density = Math.min(100, (spoken / duration) * 100);
  const complete =
    hit.length && hit[0].startMs >= c.startMs - 500 && hit.at(-1)!.endMs <= c.endMs + 500
      ? 100
      : 55;
  const hook = hookStrength(hit[0]?.text ?? "", language);
  const continuity = Math.max(
    35,
    100 - sceneCuts.filter((x) => x > c.startMs && x < c.endMs).length * 12,
  );
  const ending = sentenceEnd.test(hit.at(-1)?.text ?? "") ? 100 : 45;
  const clarity = Math.min(
    100,
    40 +
      (hit
        .map((s) => s.text)
        .join(" ")
        .match(/[\p{L}\p{N}]+/gu)?.length ?? 0),
  );
  const retention = Math.round((hook + density + complete) / 3);
  const score = Math.round(
    hook * 0.22 +
      complete * 0.2 +
      density * 0.18 +
      clarity * 0.12 +
      continuity * 0.1 +
      ending * 0.1 +
      retention * 0.08,
  );
  const reason = language.startsWith("pt")
    ? `${hook >= 55 ? "Começa com um gancho mensurável" : "Apresenta uma abertura clara"} e ${complete >= 90 ? "entrega uma ideia completa" : "mantém boa densidade de fala"} em ${Math.round(duration / 1000)} segundos.`
    : `${hook >= 55 ? "Starts with a measurable hook" : "Presents a clear opening"} and ${complete >= 90 ? "delivers a complete idea" : "maintains useful speech density"} in ${Math.round(duration / 1000)} seconds.`;
  return { score: Math.max(0, Math.min(100, score)), reason };
}
export function candidates(
  segments: Segment[],
  scenes: number[],
  durationMs: number,
  targetSeconds: number,
) {
  const target = targetSeconds * 1000,
    b = boundaries(segments, scenes, durationMs),
    out: Candidate[] = [];
  for (const start of b) {
    const choices = b.filter(
      (x) => x > start && Math.abs(x - start - target) <= Math.min(5000, target * 0.2),
    );
    const end = choices.sort(
      (a, z) => Math.abs(a - start - target) - Math.abs(z - start - target),
    )[0];
    if (end) {
      const text = segments
        .filter((s) => s.endMs > start && s.startMs < end)
        .map((s) => s.text)
        .join(" ")
        .trim();
      if (text) out.push({ startMs: start, endMs: end, text });
    }
  }
  return out;
}
export function overlap(a: Candidate, b: Candidate) {
  const intersection = Math.max(0, Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs));
  return intersection / Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
}
export function diversify(items: Candidate[], limit = 3, threshold = 0.65) {
  const out: Candidate[] = [];
  for (const c of [...items].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.startMs - b.startMs,
  ))
    if (out.every((x) => overlap(x, c) < threshold)) {
      out.push(c);
      if (out.length === limit) break;
    }
  return out;
}
export function captionSegments(segments: Segment[], start: number, end: number) {
  return segments
    .filter((s) => s.endMs > start && s.startMs < end && s.text.trim())
    .map((s) => ({
      startMs: Math.max(0, s.startMs - start),
      endMs: Math.min(end, s.endMs) - start,
      text: s.text.trim(),
    }))
    .filter((s) => s.endMs > s.startMs);
}
export function safeOutputPath(user: string, project: string, job: string, clip: string) {
  for (const v of [user, project, job, clip])
    if (!/^[0-9a-f-]{8,}$/i.test(v)) throw new Error("unsafe_path");
  return `${user}/${project}/${job}/${clip}.mp4`;
}
export function retryable(code: string) {
  return [
    "STORAGE_DOWNLOAD_FAILED",
    "STORAGE_UPLOAD_FAILED",
    "TRANSCRIPTION_PROVIDER_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "LEASE_LOST",
  ].includes(code);
}
