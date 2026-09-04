import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import type { Segment } from "./domain";
export async function run(bin: string, args: string[], signal?: AbortSignal) {
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "",
      stderr = "";
    p.stdout.on("data", (d) => {
      stdout += String(d);
    });
    p.stderr.on("data", (d) => {
      stderr += String(d);
    });
    const abort = () => p.kill("SIGTERM");
    signal?.addEventListener("abort", abort, { once: true });
    p.on("error", reject);
    p.on("close", (c) => {
      signal?.removeEventListener("abort", abort);
      if (c === 0) resolve({ stdout, stderr });
      else
        reject(
          Object.assign(new Error(`${bin} exited ${c}`), {
            code: signal?.aborted ? "CANCELLED" : "MEDIA_COMMAND_FAILED",
          }),
        );
    });
  });
}
export const probe = async (path: string) =>
  run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]);
export const extractAudio = (input: string, output: string, signal?: AbortSignal) =>
  run(
    "ffmpeg",
    [
      "-nostdin",
      "-y",
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      output,
    ],
    signal,
  );
export async function scenes(input: string, signal?: AbortSignal) {
  const r = await run(
    "ffmpeg",
    ["-nostdin", "-i", input, "-vf", "select='gt(scene,0.32)',showinfo", "-an", "-f", "null", "-"],
    signal,
  );
  return [...r.stderr.matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]));
}
const escapeAss = (s: string) =>
  s.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
export function renderArgs(
  input: string,
  output: string,
  startMs: number,
  endMs: number,
  aspect: "9:16" | "1:1" | "16:9",
  captions?: string,
) {
  const size = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] }[aspect];
  let vf = `scale=${size[0]}:${size[1]}:force_original_aspect_ratio=increase,crop=${size[0]}:${size[1]}`;
  if (captions) vf += `,subtitles='${escapeAss(captions)}'`;
  return [
    "-nostdin",
    "-y",
    "-ss",
    (startMs / 1000).toFixed(3),
    "-i",
    input,
    "-t",
    ((endMs - startMs) / 1000).toFixed(3),
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    output,
  ];
}
export const render = (...x: Parameters<typeof renderArgs>) => run("ffmpeg", renderArgs(...x));
const stamp = (ms: number) => {
  const h = Math.floor(ms / 3600000),
    m = Math.floor((ms % 3600000) / 60000),
    s = Math.floor((ms % 60000) / 1000),
    x = ms % 1000;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(x).padStart(3, "0")}`;
};
export async function writeVtt(path: string, segments: Segment[]) {
  await writeFile(
    path,
    "WEBVTT\n\n" +
      segments
        .map(
          (s, i) =>
            `${i + 1}\n${stamp(s.startMs)} --> ${stamp(s.endMs)}\n${s.text.replaceAll("\n", " ")}\n`,
        )
        .join("\n"),
  );
}
