import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const migration=read("supabase/migrations/202609180043_e69_creator_worker_health.sql");
const worker=read("services/creator-worker/src/main.ts");
const runtime=read("services/creator-worker/src/runtime.d.ts");
const readme=read("services/creator-worker/README.md");
const statusEdge=read("supabase/functions/creator-worker-status/index.ts");
const service=read("src/services/creator-service.ts");
const route=read("src/routes/_shell.creator.tsx");

test("E69 keeps Creator worker health server-owned",()=>{
  assert.match(migration,/create table if not exists public\.creator_worker_instances/);
  assert.match(migration,/enable row level security/);
  assert.match(migration,/revoke all privileges on table public\.creator_worker_instances from anon, authenticated/);
  assert.match(migration,/grant select, insert, update, delete on table public\.creator_worker_instances to service_role/);
  assert.doesNotMatch(migration,/create policy/);
});

test("E69 worker reports a database-backed healthcheck on Railway PORT",()=>{
  assert.match(worker,/creator_worker_instances/);
  assert.match(worker,/Bun\.serve/);
  assert.match(worker,/process\.env\.PORT/);
  assert.match(worker,/pathname !== "\/healthz"/);
  assert.match(worker,/lastDbHeartbeatAt > 0/);
  assert.match(worker,/heartbeatAgeMs <= Math\.max\(60_000, heartbeatEveryMs \* 3\)/);
  assert.match(runtime,/serve\(options/);
  assert.match(readme,/Root Directory:\*\* `services\/creator-worker`/);
  assert.match(readme,/Healthcheck Path:\*\* `\/healthz`/);
});

test("E70 exposes only aggregate authenticated worker health",()=>{
  assert.match(statusEdge,/auth\.getUser\(\)/);
  assert.match(statusEdge,/creator_worker_instances/);
  assert.match(statusEdge,/last_heartbeat_at/);
  assert.match(statusEdge,/\.eq\("user_id", user\.id\)/);
  assert.match(statusEdge,/ownQueue/);
  assert.doesNotMatch(statusEdge,/worker_id/);
  assert.doesNotMatch(statusEdge,/deployment_id/);
  assert.doesNotMatch(statusEdge,/commit_sha/);
});

test("E70 Web surfaces worker truth instead of inventing processing health",()=>{
  assert.match(service,/export async function getCreatorWorkerStatus/);
  assert.match(service,/creator-worker-status/);
  assert.match(route,/getCreatorWorkerStatus/);
  assert.match(route,/workerStatus\?\.state === "offline"/);
  assert.match(route,/pipeline pesado do Creator está offline/);
});
