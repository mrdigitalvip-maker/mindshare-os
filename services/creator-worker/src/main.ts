import { createClient } from "@supabase/supabase-js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  captionSegments,
  candidates,
  diversify,
  normalizeScenes,
  parseProbe,
  retryable,
  safeOutputPath,
  scoreCandidate,
} from "./domain";
import { extractAudio, probe, render, scenes, writeVtt } from "./media";
import { OpenAITranscriptionProvider } from "./transcription";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
  worker = process.env.WORKER_ID ?? randomUUID(),
  lease = Number(process.env.LEASE_SECONDS ?? 120),
  maxAttempts = Number(process.env.MAX_ATTEMPTS ?? 3);
let stopping = false,
  active: AbortController | undefined;
process.on("SIGTERM", () => {
  stopping = true;
  active?.abort();
});
process.on("SIGINT", () => {
  stopping = true;
  active?.abort();
});
const log = (event: string, details: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...details }));
type CreatorJobRow = {
  id: string;
  user_id: string;
  project_id: string;
  source_path: string;
  target_duration_seconds: number;
  aspect_ratio: "9:16" | "1:1" | "16:9";
  captions_enabled: boolean;
  settings?: Record<string, unknown>;
};
async function stage(id: string, status: string) {
  const { error } = await db.rpc("creator_worker_stage", {
    p_job_id: id,
    p_lease_owner: worker,
    p_status: status,
  });
  if (error) throw Object.assign(new Error("stage update failed"), { code: "LEASE_LOST" });
}
async function cancelled(id: string) {
  const { data, error } = await db.rpc("creator_worker_cancel_requested", {
    p_job_id: id,
    p_lease_owner: worker,
  });
  if (error)
    throw Object.assign(new Error("cancel check failed"), { code: "DATABASE_UNAVAILABLE" });
  return data === true;
}
async function processJob(job: CreatorJobRow) {
  const dir = await mkdtemp(join(tmpdir(), "nexora-creator-"));
  active = new AbortController();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    heartbeat = setInterval(
      () =>
        void db.rpc("creator_heartbeat", {
          p_job_id: job.id,
          p_lease_owner: worker,
          p_lease_seconds: lease,
        }),
      Math.max(10000, lease * 400),
    );
    const path = String(job.source_path);
    if (path !== `${job.user_id}/${job.project_id}/source/${path.split("/").at(-1)}`)
      throw Object.assign(new Error("Invalid owner source path"), { code: "INVALID_SOURCE_PATH" });
    const source = join(dir, "source");
    const audio = join(dir, "analysis.mp3");
    const { data, error } = await db.storage.from("creator-sources").download(path);
    if (error || !data)
      throw Object.assign(new Error("Source download failed"), { code: "STORAGE_DOWNLOAD_FAILED" });
    await writeFile(source, Buffer.from(await data.arrayBuffer()));
    await stage(job.id, "analyzing");
    const media = parseProbe((await probe(source)).stdout);
    if (!media.hasAudio)
      throw Object.assign(new Error("Video has no audio"), { code: "INVALID_MEDIA_NO_AUDIO" });
    const sceneCuts = normalizeScenes(await scenes(source, active.signal), media.durationMs);
    await extractAudio(source, audio, active.signal);
    if (await cancelled(job.id)) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    await stage(job.id, "transcribing");
    const transcript = await new OpenAITranscriptionProvider().transcribe(audio);
    await stage(job.id, "selecting_clips");
    const settings = job.settings ?? {};
    const requested = settings.rerender_clip_id
      ? [
          {
            startMs: Number(settings.start_ms),
            endMs: Number(settings.end_ms),
            text: transcript.segments
              .filter(
                (s) => s.endMs > Number(settings.start_ms) && s.startMs < Number(settings.end_ms),
              )
              .map((s) => s.text)
              .join(" "),
          },
        ]
      : candidates(transcript.segments, sceneCuts, media.durationMs, job.target_duration_seconds);
    const scored = requested.map((c) => ({
      ...c,
      ...scoreCandidate(c, transcript.segments, sceneCuts, transcript.language),
    }));
    const selected = settings.rerender_clip_id ? scored : diversify(scored, 3);
    if (!selected.length)
      throw Object.assign(new Error("No complete candidate windows"), {
        code: "NO_CLIP_CANDIDATES",
      });
    await stage(job.id, "rendering");
    let rank = 0;
    for (const c of selected) {
      if (await cancelled(job.id))
        throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
      rank++;
      const clip = randomUUID(),
        out = join(dir, `${clip}.mp4`),
        vtt = join(dir, `${clip}.vtt`),
        caps = captionSegments(transcript.segments, c.startMs, c.endMs);
      if (job.captions_enabled) {
        if (!caps.length)
          throw Object.assign(new Error("Caption timing unavailable"), {
            code: "TRANSCRIPT_TIMING_MISSING",
          });
        await writeVtt(vtt, caps);
      }
      await render(
        source,
        out,
        c.startMs,
        c.endMs,
        job.aspect_ratio,
        job.captions_enabled ? vtt : undefined,
      );
      const outputPath = safeOutputPath(job.user_id, job.project_id, job.id, clip);
      const bytes = await readFile(out);
      const uploaded = await db.storage
        .from("creator-outputs")
        .upload(outputPath, bytes, { contentType: "video/mp4", upsert: false });
      if (uploaded.error)
        throw Object.assign(new Error("Output upload failed"), { code: "STORAGE_UPLOAD_FAILED" });
      const inserted = await db.from("creator_clips").insert({
        id: clip,
        user_id: job.user_id,
        project_id: job.project_id,
        job_id: job.id,
        start_ms: c.startMs,
        end_ms: c.endMs,
        duration_ms: c.endMs - c.startMs,
        rank,
        score: c.score,
        score_reason: c.reason,
        transcript_excerpt: c.text.slice(0, 500),
        render_status: "available",
        output_path: outputPath,
        aspect_ratio: job.aspect_ratio,
        captions_enabled: job.captions_enabled,
        render_version: job.settings?.rerender_clip_id ? 2 : 1,
        replaces_clip_id: job.settings?.rerender_clip_id ?? null,
      });
      if (inserted.error)
        throw Object.assign(new Error("Result persistence failed"), {
          code: "DATABASE_UNAVAILABLE",
        });
    }
    await db.rpc("creator_worker_complete", {
      p_job_id: job.id,
      p_lease_owner: worker,
      p_media: { ...media, sceneCuts },
      p_transcript_language: transcript.language,
      p_clip_count: selected.length,
    });
    log("job_completed", { jobId: job.id, clips: selected.length });
  } catch (error: unknown) {
    const code = String(
      typeof error === "object" && error && "code" in error ? error.code : "WORKER_FAILURE",
    );
    await db.rpc("creator_worker_fail", {
      p_job_id: job.id,
      p_lease_owner: worker,
      p_error_code: code,
      p_retryable: retryable(code),
      p_max_attempts: maxAttempts,
    });
    log("job_failed", { jobId: job.id, errorCode: code });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    active = undefined;
    await rm(dir, { recursive: true, force: true });
  }
}
log("worker_started", { worker });
while (!stopping) {
  const { data, error } = await db.rpc("creator_claim_job", {
    p_lease_owner: worker,
    p_lease_seconds: lease,
    p_max_attempts: maxAttempts,
  });
  if (error) {
    log("claim_failed", { errorCode: "DATABASE_UNAVAILABLE" });
    await Bun.sleep(5000);
    continue;
  }
  if (data?.length) await processJob(data[0]);
  else await Bun.sleep(Number(process.env.POLL_INTERVAL_MS ?? 3000));
}
log("worker_stopped");
