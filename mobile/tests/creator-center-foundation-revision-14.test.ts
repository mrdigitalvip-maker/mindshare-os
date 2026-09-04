import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  canTransitionCreatorJob,
  CREATOR_ACCESS_MODE,
  CREATOR_ASPECT_RATIOS,
  CREATOR_CAPTION_MODES,
  CREATOR_CLIP_DURATIONS,
  decideCreatorAccess,
  recognizeCreatorUrl,
} from "../lib/creator";
const read = (p: string) => readFileSync(p.startsWith("mobile/") ? p.slice(7) : `../${p}`, "utf8");
describe("NXR-037A Creator Center foundation", () => {
  test("closed testers are unlocked but signed-out users are denied", () => {
    expect(CREATOR_ACCESS_MODE).toBe("closed_test_unlocked");
    expect(
      decideCreatorAccess({
        authenticated: true,
        mode: CREATOR_ACCESS_MODE,
        premium: false,
        trialUsed: true,
      }).allowed,
    ).toBe(true);
    expect(
      decideCreatorAccess({
        authenticated: false,
        mode: CREATOR_ACCESS_MODE,
        premium: true,
        trialUsed: false,
      }).allowed,
    ).toBe(false);
  });
  test("future Premium and one-trial decisions remain pure", () => {
    expect(
      decideCreatorAccess({
        authenticated: true,
        mode: "premium_with_trial",
        premium: false,
        trialUsed: false,
      }).reason,
    ).toBe("trial");
    expect(
      decideCreatorAccess({
        authenticated: true,
        mode: "premium_with_trial",
        premium: false,
        trialUsed: true,
      }).reason,
    ).toBe("upgrade_required");
  });
  test("settings are constrained", () => {
    expect(CREATOR_ASPECT_RATIOS).toEqual(["9:16", "1:1", "16:9"]);
    expect(CREATOR_CLIP_DURATIONS).toEqual([15, 20, 30, 45, 60]);
    expect(CREATOR_CAPTION_MODES).toEqual(["automatic", "off"]);
  });
  test("URLs identify metadata only and never download", () => {
    const y = recognizeCreatorUrl("https://youtu.be/test");
    expect(y.youtube).toBe(true);
    expect(y.canDownload).toBe(false);
    expect(y.requiresOriginalUpload).toBe(true);
    expect(recognizeCreatorUrl("ftp://bad").valid).toBe(false);
  });
  test("state machine rejects fake jumps", () => {
    expect(canTransitionCreatorJob("draft", "uploading")).toBe(true);
    expect(canTransitionCreatorJob("draft", "completed")).toBe(false);
    expect(canTransitionCreatorJob("completed", "rendering")).toBe(false);
  });
  test("UI is honest and contains no seeded clips, random scores, or timers", () => {
    const ui = read("mobile/app/(app)/creator/index.tsx");
    expect(ui).toContain('t("creator.empty")');
    expect(ui).not.toContain("Math.random");
    expect(ui).not.toContain("setInterval");
  });
  test("migration provides ownership, private storage, RLS, and read-only worker results", () => {
    const sql = read("supabase/migrations/202609040001_creator_center_foundation.sql");
    for (const table of ["creator_projects", "creator_jobs", "creator_clips", "creator_usage"])
      expect(sql).toContain(table);
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.uid()=user_id");
    expect(sql).toContain("'creator-sources','creator-sources',false");
    expect(sql).toContain("'creator-outputs','creator-outputs',false");
    expect(sql).not.toMatch(/creator_jobs_owner_(insert|all)/);
  });
  test("no billing dependency was introduced", () =>
    expect(read("mobile/package.json")).not.toContain("react-native-iap"));
});
