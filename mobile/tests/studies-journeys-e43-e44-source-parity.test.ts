import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const e43 = source("../../supabase/migrations/202609180021_e43_studies_rls_indexes.sql");
const e44 = source("../../supabase/migrations/202609180022_e44_journeys_rls_indexes.sql");
const studiesIndex = source("../app/(app)/studies/index.tsx");
const studiesDetail = source("../app/(app)/studies/[subjectId].tsx");
const journeyService = source("../services/journey-service.ts");
const packService = source("../services/journey-pack-service.ts");

describe("E43/E44 Studies and Journeys shared-backend parity", () => {
  test("Studies mobile remains on canonical workspace hooks while shared RLS stays owner-only", () => {
    expect(studiesIndex).toContain("useStudyOverview");
    expect(studiesIndex).toContain("useWorkspaceMutations");
    expect(studiesDetail).toContain("useSubject");
    expect(studiesDetail).toContain("useWorkspaceMutations");
    expect(e43).toContain("to authenticated");
    expect(e43).toContain("(select auth.uid()) = user_id");
    expect(e43.toLowerCase()).not.toContain("to public");
  });

  test("Journey mobile keeps direct reads owner-scoped and mutations on canonical RPCs", () => {
    expect(journeyService).toContain('.from("journey_pack_step_instances")');
    expect(journeyService).toContain('supabase.rpc("ensure_daily_journey_mission"');
    expect(journeyService).toContain('supabase.rpc("complete_journey_action"');
    expect(packService).toContain('supabase.rpc("start_journey_pack"');
    expect(e44).toContain("for select");
    expect(e44).toContain("to authenticated");
    expect(e44.toLowerCase()).not.toContain("for insert");
    expect(e44.toLowerCase()).not.toContain("for update");
    expect(e44.toLowerCase()).not.toContain("for delete");
  });

  test("All advisor-reported FK indexes are additive", () => {
    for (const index of [
      "study_goals_subject_id_idx",
      "study_notes_subject_id_idx",
      "study_sessions_subject_id_idx",
      "journey_missions_journey_id_idx",
      "journey_pack_starts_journey_id_idx",
      "journey_pack_starts_pack_id_idx",
      "journey_pack_step_instances_source_step_id_idx",
    ]) {
      expect(e43 + e44).toContain(index);
    }
    expect((e43 + e44).toLowerCase()).not.toContain("drop index");
  });
});
