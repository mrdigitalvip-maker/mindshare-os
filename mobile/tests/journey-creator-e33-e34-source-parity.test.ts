import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const journey = source("../../supabase/migrations/202609180009_e33_journey_pack_rpc_security.sql");
const creator = source("../../supabase/migrations/202609180010_e34_creator_fk_indexes.sql");
const creatorRls = source("../../supabase/migrations/202609180011_e34_creator_rls_initplan.sql");
const journeyService = source("../services/journey-pack-service.ts");
const packs = source("../app/(app)/packs/index.tsx");
const detail = source("../app/(app)/packs/[slug].tsx");

describe("E33 + E34 Journey security and Creator indexes", () => {
  test("E33 Android keeps the same authenticated Journey Pack RPC contract", () => {
    expect(journeyService).toContain('"get_journey_packs"');
    expect(journeyService).toContain('"get_journey_pack_detail"');
    expect(packs).toContain("useJourneyPacks");
    expect(detail).toContain("useJourneyPack");
  });

  test("E33 Journey catalog RPCs are invoker and auth-only", () => {
    expect(journey).toContain("security invoker");
    expect(journey).toContain("from public, anon");
    expect(journey).toContain("to authenticated");
    expect(journey.toLowerCase()).not.toContain("security definer");
  });

  test("E34 Creator owner RLS keeps the same scope with initplan-safe auth", () => {
    expect(creatorRls).toContain("creator_analytics_content_owner_select");
    expect(creatorRls).toContain("creator_analytics_owner_select");
    expect(creatorRls).toContain("creator_country_owner_select");
    expect(creatorRls).toContain("creator_clips_owner_select");
    expect(creatorRls).toContain("(select auth.uid()) = user_id");
  });

  test("E34 Creator indexes are additive only", () => {
    expect(creator).toContain("creator_analytics_content_user_id_idx");
    expect(creator).toContain("creator_analytics_snapshots_user_id_idx");
    expect(creator).toContain("creator_country_observations_user_id_idx");
    expect(creator).toContain("creator_clips_job_project_user_idx");
    expect(creator).toContain("creator_clips_project_user_idx");
    expect(creator).toContain("creator_clips_replaces_clip_id_idx");
    expect(creator.toLowerCase()).not.toContain("drop index");
  });
});
