import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const migration=source("../../supabase/migrations/202609180043_e69_creator_worker_health.sql");
const worker=source("../../services/creator-worker/src/main.ts");
const statusEdge=source("../../supabase/functions/creator-worker-status/index.ts");
const service=source("../services/creator-service.ts");
const creator=source("../app/(app)/creator/index.tsx");

describe("E69/E70 Creator worker runtime source parity",()=>{
  test("worker health remains server-owned",()=>{
    expect(migration).toContain("creator_worker_instances");
    expect(migration).toContain("revoke all privileges on table public.creator_worker_instances from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.creator_worker_instances to service_role");
  });

  test("worker exposes real health only after heartbeat",()=>{
    expect(worker).toContain("Bun.serve");
    expect(worker).toContain('"/healthz"');
    expect(worker).toContain("lastDbHeartbeatAt");
    expect(worker).toContain("creator_worker_instances");
  });

  test("status endpoint is authenticated and owner-scopes queue counts",()=>{
    expect(statusEdge).toContain("auth.getUser()");
    expect(statusEdge).toContain('.eq("user_id", user.id)');
    expect(statusEdge).toContain("activeWorkers");
    expect(statusEdge).not.toContain("worker_id:");
  });

  test("Android surfaces worker offline/online truth",()=>{
    expect(service).toContain("getCreatorWorkerStatus");
    expect(service).toContain("creator-worker-status");
    expect(creator).toContain("workerStatus");
    expect(creator).toContain("workerOfflineCopy");
  });
});
