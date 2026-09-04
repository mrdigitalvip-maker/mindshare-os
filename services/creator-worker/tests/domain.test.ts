import { describe, expect, test } from "bun:test";
import {
  captionSegments,
  candidates,
  diversify,
  hookStrength,
  normalizeScenes,
  parseProbe,
  retryable,
  safeOutputPath,
  scoreCandidate,
} from "../src/domain";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractAudio, probe, render, renderArgs } from "../src/media";
const seg = [
  { startMs: 0, endMs: 7000, text: "Why does this matter?" },
  { startMs: 7500, endMs: 15000, text: "It gives you a complete answer." },
  { startMs: 15500, endMs: 30000, text: "Now you can use it." },
  { startMs: 31000, endMs: 45000, text: "This is the ending." },
];
describe("creator domain", () => {
  test("parses ffprobe and rejects non-video", () => {
    expect(
      parseProbe(
        JSON.stringify({
          format: { duration: "2.1", format_name: "mov,mp4" },
          streams: [
            {
              codec_type: "video",
              width: 10,
              height: 20,
              codec_name: "h264",
              avg_frame_rate: "30/1",
            },
            { codec_type: "audio" },
          ],
        }),
      ),
    ).toMatchObject({ durationMs: 2100, width: 10, height: 20, fps: 30, hasAudio: true });
    expect(() => parseProbe('{"streams":[]}')).toThrow();
  });
  test("normalizes real scene times", () =>
    expect(normalizeScenes([2, 1, 2, -1, 99], 5000)).toEqual([1000, 2000]));
  test("uses sentence boundaries for candidates", () =>
    expect(candidates(seg, [16000], 45000, 15).length).toBeGreaterThan(0));
  test("removes excessive overlap", () =>
    expect(
      diversify(
        [
          { startMs: 0, endMs: 30000, text: "a", score: 90 },
          { startMs: 1000, endMs: 31000, text: "b", score: 89 },
          { startMs: 32000, endMs: 45000, text: "c", score: 70 },
        ],
        3,
      ),
    ).toHaveLength(2));
  test("score deterministic and bounded", () => {
    const c = { startMs: 0, endMs: 15000, text: "x" };
    const a = scoreCandidate(c, seg, [], "en");
    expect(a).toEqual(scoreCandidate(c, seg, [], "en"));
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });
  test("PT and EN hook signals", () => {
    expect(hookStrength("Como você faz isso?", "pt-BR")).toBeGreaterThan(50);
    expect(hookStrength("Why does this work?", "en")).toBeGreaterThan(50);
  });
  test("captions preserve actual timing", () =>
    expect(captionSegments(seg, 5000, 16000)[0]).toEqual({
      startMs: 0,
      endMs: 2000,
      text: seg[0].text,
    }));
  test("render preserves ratio via scale and crop", () => {
    const a = renderArgs("in", "out", 0, 1000, "9:16");
    expect(a.join(" ")).toContain("force_original_aspect_ratio=increase");
    expect(a).toContain("libx264");
  });
  test("safe owner output paths", () =>
    expect(safeOutputPath("aaaaaaaa-aaaa", "bbbbbbbb-bbbb", "cccccccc-cccc", "dddddddd-dddd")).toBe(
      "aaaaaaaa-aaaa/bbbbbbbb-bbbb/cccccccc-cccc/dddddddd-dddd.mp4",
    ));
  test("bounded retry classification", () => {
    expect(retryable("STORAGE_UPLOAD_FAILED")).toBe(true);
    expect(retryable("INVALID_MEDIA_NO_VIDEO")).toBe(false);
  });
  test("abort is cancellation", async () => {
    const c = new AbortController();
    c.abort();
    expect(c.signal.aborted).toBe(true);
  });
  test("temporary cleanup", async () => {
    const d = await mkdtemp(join(tmpdir(), "nx-clean-"));
    await rm(d, { recursive: true, force: true });
    expect(stat(d)).rejects.toThrow();
  });
});
const hasFfmpeg = () => {
  try {
    return Bun.spawnSync(["ffmpeg", "-version"]).exitCode === 0;
  } catch {
    return false;
  }
};
(hasFfmpeg() ? test : test.skip)("FFmpeg integration: probe, audio and render", async () => {
  const d = await mkdtemp(join(tmpdir(), "nx-media-"));
  try {
    const source = join(d, "source.mp4"),
      audio = join(d, "audio.mp3"),
      out = join(d, "clip.mp4");
    const made = Bun.spawnSync([
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=24",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1000:sample_rate=16000",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      source,
    ]);
    expect(made.exitCode).toBe(0);
    expect(parseProbe((await probe(source)).stdout).durationMs).toBeGreaterThan(1500);
    await extractAudio(source, audio);
    await render(source, out, 0, 1000, "1:1");
    expect((await stat(out)).size).toBeGreaterThan(0);
  } finally {
    await rm(d, { recursive: true, force: true });
  }
});
