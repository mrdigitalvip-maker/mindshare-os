import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const e51 = source("../../supabase/migrations/202609180029_e51_activity_logs_rls.sql");
const e52 = source("../../supabase/migrations/202609180030_e52_journeys_residual_rls_indexes.sql");
const journeys = source("../services/journey-service.ts");

describe("E51/E52 Activity and Journeys shared-backend parity", () => {
  test("Activity Logs remain owner-only SELECT + INSERT infrastructure", () => {
    expect(e51).toContain("activity_select");
    expect(e51).toContain("activity_insert");
    expect(e51).toContain("for select");
    expect(e51).toContain("for insert");
    expect(e51.toLowerCase()).not.toContain("for update");
    expect(e51.toLowerCase()).not.toContain("for delete");
  });

  test("Journey mobile continues canonical journey and momentum reads", () => {
    expect(journeys).toContain('.from("journeys")');
    expect(journeys).toContain('.from("momentum_events")');
    expect(e52).toContain("journeys_source_pack_id_idx");
    expect(e52).toContain("momentum_events_journey_id_idx");
    expect(e52).toContain("to authenticated");
  });
});
