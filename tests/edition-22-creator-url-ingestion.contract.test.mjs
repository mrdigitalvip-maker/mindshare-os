import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const creatorPath = new URL("../src/routes/_shell.creator.tsx", import.meta.url);
const servicePath = new URL("../src/services/creator-service.ts", import.meta.url);
const importerPath = new URL(
  "../supabase/functions/creator-source-import/index.ts",
  import.meta.url,
);
const youtubePath = new URL(
  "../supabase/functions/creator-youtube-metadata/index.ts",
  import.meta.url,
);

test("E22 keeps YouTube truthful and routes it through metadata plus original upload", async () => {
  const [creator, service, youtube] = await Promise.all([
    readFile(creatorPath, "utf8"),
    readFile(servicePath, "utf8"),
    readFile(youtubePath, "utf8"),
  ]);
  assert.match(service, /"creator-youtube-metadata"/);
  assert.match(creator, /Analyze YouTube link/);
  assert.match(creator, /Original upload required before clipping\./);
  assert.match(youtube, /downloadAvailable:\s*false/);
  assert.match(youtube, /originalUploadRequired:\s*true/);
  assert.doesNotMatch(youtube, /youtube-dl|yt-dlp|download.*youtube/i);
});

test("E22 direct URL import requires explicit rights and public HTTPS video sources", async () => {
  const [creator, service, importer] = await Promise.all([
    readFile(creatorPath, "utf8"),
    readFile(servicePath, "utf8"),
    readFile(importerPath, "utf8"),
  ]);
  assert.match(creator, /I own this video or have permission to process it/);
  assert.match(creator, /if \(!sourceAuthorized\)/);
  assert.match(service, /confirmedRights/);
  assert.match(importer, /input\.confirmedRights !== true/);
  assert.match(importer, /rights_confirmation_required/);
  assert.match(importer, /url\.protocol !== "https:"/);
  assert.match(importer, /Deno\.resolveDns/);
  assert.match(importer, /unsafe_source_host/);
  assert.match(importer, /MAX_REDIRECTS = 3/);
});

test("E22 streams bounded real media into private Creator storage then reuses canonical queue", async () => {
  const importer = await readFile(importerPath, "utf8");
  assert.match(importer, /MAX_SOURCE_BYTES = 200 \* 1024 \* 1024/);
  assert.match(importer, /VIDEO_TYPES = new Set/);
  assert.match(importer, /source_too_large/);
  assert.match(importer, /source_size_unknown/);
  assert.match(importer, /body:\s*fetched\.response\.body/);
  assert.match(importer, /storage\/v1\/object\/creator-sources/);
  assert.match(importer, /source_type:\s*"authorized_direct"/);
  assert.match(importer, /const path = `\$\{user\.id\}\/\$\{project\.id\}\/source\/\$\{fileName\}`/);
  assert.match(importer, /auth\.rpc\("enqueue_creator_job"/);
  assert.match(importer, /storage_upload_timeout/);
});
