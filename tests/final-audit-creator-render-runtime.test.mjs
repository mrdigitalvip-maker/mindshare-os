import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const media = read("services/creator-worker/src/media.ts");
const worker = read("services/creator-worker/src/main.ts");
const service = read("src/services/creator-service.ts");
const route = read("src/routes/_shell.creator.tsx");

test("Creator worker proves FFmpeg generation, audio extraction, caption render and output probe before claiming jobs", () => {
  assert.match(media, /export async function selfTestMediaPipeline/);
  assert.match(media, /testsrc2=size=640x360:rate=24/);
  assert.match(media, /sine=frequency=440:sample_rate=16000/);
  assert.match(media, /await extractAudio\(source, audio\)/);
  assert.match(media, /await writeVtt\(captions/);
  assert.match(media, /await render\(source, output, 0, 1800, "9:16", captions\)/);
  assert.match(media, /await probe\(output\)/);
  assert.match(worker, /await selfTestMediaPipeline\(selfTestDir\)/);
  assert.match(worker, /media_self_test_passed/);
  assert.match(worker, /media_self_test_failed/);
  assert.ok(worker.indexOf("media_self_test_passed") < worker.indexOf('creator_claim_job'));
});

test("failed Creator jobs can be requeued from the existing owner-scoped source", () => {
  assert.match(service, /export async function retryCreatorProject/);
  assert.match(service, /rpc\("enqueue_creator_job"/);
  assert.match(route, /handleRetryProject/);
  assert.match(route, /Reprocessar mesma fonte/);
  assert.match(route, /String\(job\.project_id\)/);
});

test("YouTube link flow remains truthful and does not fake platform media download", () => {
  assert.match(route, /Analisar link do YouTube/);
  assert.match(route, /arquivo original é necessário/);
  assert.match(route, /Envio do arquivo original necessário antes dos cortes/);
  assert.doesNotMatch(route, /yt-dlp|youtube-dl/);
});
