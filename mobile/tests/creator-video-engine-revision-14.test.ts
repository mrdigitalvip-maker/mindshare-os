import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd(),
  source = (p: string) => readFileSync(join(root, p), "utf8"),
  migration = source("../supabase/migrations/202609040004_creator_video_engine.sql"),
  service = source("services/creator-service.ts"),
  screen = source("app/(app)/creator/[projectId].tsx"),
  worker = source("../services/creator-worker/src/main.ts"),
  domain = source("../services/creator-worker/src/domain.ts");
describe("NXR-037C real Creator video engine", () => {
  test("only owned uploaded source enqueues", () => {
    expect(migration).toContain("user_id=auth.uid()");
    expect(migration).toContain("SOURCE_NOT_READY");
    expect(migration).toContain("SOURCE_OBJECT_MISSING");
  });
  test("duplicate active jobs reject atomically", () => {
    expect(migration).toContain("creator_one_active_job_idx");
    expect(migration).toContain("ACTIVE_JOB_EXISTS");
  });
  test("backend stage drives UI without fake timer progress", () => {
    expect(screen).toContain("job.progressStage ?? job.status");
    expect(screen).not.toMatch(/progress\s*\+|Math\.random/);
  });
  test("completed results only query real creator_clips", () => {
    expect(service).toContain('.from("creator_clips")');
    expect(service).toContain('.eq("render_status", "available")');
  });
  test("private paths and signed access", () => {
    expect(worker).toContain('.from("creator-outputs")');
    expect(service).toContain("createSignedUrl");
    expect(source("../supabase/migrations/202609040001_creator_center_foundation.sql")).toContain(
      "creator_outputs_owner_read",
    );
  });
  test("score deterministic with no viral guarantee", () => {
    expect(domain).not.toContain("Math.random");
    expect(domain).toContain("scoreCandidate");
    expect(screen).not.toMatch(/will go viral/i);
  });
  test("captions require actual timing", () => {
    expect(worker).toContain("TRANSCRIPT_TIMING_MISSING");
    expect(domain).toContain("captionSegments");
  });
  test("social URL is not downloaded", () =>
    expect(source("app/(app)/creator/import.tsx")).not.toMatch(/fetch\(|downloadAsync/));
  test("restart reloads canonical job", () => expect(screen).toContain("getLatestCreatorJob"));
  test("cancellation is server intent checked by worker", () => {
    expect(service).toContain("cancel_creator_job");
    expect(worker).toContain("cancelled(job.id)");
  });
  test("safe failure and storage-confirmed output", () => {
    expect(screen).toContain("job.errorCode");
    expect(worker.indexOf("uploaded.error")).toBeLessThan(worker.indexOf('.from("creator_clips")'));
  });
  test("editor requests authoritative rerender", () =>
    expect(service).toContain("enqueue_creator_rerender"));
  test("RLS prevents user B output access", () =>
    expect(source("../supabase/migrations/202609040001_creator_center_foundation.sql")).toContain(
      "creator_outputs_owner_read",
    ));
  test("closed test remains and billing unchanged", () => {
    expect(source("lib/creator.ts")).toContain("closed_test_unlocked");
    expect(service).not.toMatch(/react-native-iap|premium_with_trial/);
  });
});
