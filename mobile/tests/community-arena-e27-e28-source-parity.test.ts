import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const migration = source("../../supabase/migrations/202609180003_community_e27_entitlement_visibility.sql");
const hardening = source("../../supabase/migrations/202609180004_e27_e28_runtime_hardening.sql");
const communityService = source("../services/community-service.ts");
const communityHome = source("../app/(app)/community/index.tsx");
const arena = source("../app/(app)/arena.tsx");
const arenaService = source("../services/arena-service.ts");
const arenaHooks = source("../hooks/use-arena.ts");
const rankingHardening = source("../../supabase/migrations/202609130006_challenges_ranking_hardening.sql");

describe("E27 + E28 Community entitlement and Arena parity", () => {
  test("E27 Free/Premium visibility is decided by the backend, not client spoofing", () => {
    expect(migration).toContain("public.has_premium(auth.uid())");
    expect(migration).toContain("not c.requires_premium or viewer.premium");
    expect(communityService).toContain('"get_official_communities"');
    expect(communityHome).toContain("orderedChannels");
    expect(communityHome).not.toMatch(/filter\([^\n]*premium[^\n]*eligible/i);
  });

  test("E27 Android keeps real Community conversations and explicit official identity", () => {
    expect(communityService).toContain('"get_community_messages"');
    expect(communityService).toContain('"send_community_message"');
    expect(communityService).toContain("subscribeToChannel");
    expect(source("../app/(app)/community/[channelId].tsx")).toContain("KIVRYN • OFICIAL");
  });

  test("E28 Android Arena consumes the existing weekly ranking", () => {
    expect(arena).toContain('useChallengeRanking("weekly")');
    expect(arena).toContain("ranking.data.entries.slice(0, 6)");
    expect(arena).toContain('router.push("/challenges")');
    expect(arenaHooks).toContain("getChallengeRanking");
    expect(arenaService).toContain('"get_challenge_ranking"');
  });

  test("E27 entitlement also gates realtime reactions and message actions", () => {
    expect(hardening).toContain("member realtime messages");
    expect(hardening).toContain("member realtime reactions");
    expect(hardening).toContain("not c.requires_premium or public.has_premium");
    expect(hardening).toContain("set_message_reaction");
    expect(hardening).toContain("report_community_message");
    expect(hardening).toContain("block_community_message_sender");
  });

  test("E28 challenge progress and participation remain server-authoritative", () => {
    expect(arena).toContain("useArena()");
    expect(arena).toContain("useJoinArenaChallenge()");
    expect(arenaService).toContain('"get_arena_challenges"');
    expect(arenaService).toContain('"join_arena_challenge"');
    expect(arenaService).not.toMatch(/from\(["']user_challenges["']\)\.(?:insert|update|delete)/);
    expect(hardening).toContain("user_challenges_challenge_id_idx");
    expect(hardening).toContain("user_id = (select auth.uid())");
  });

  test("E28 ranking remains opt-in and based on verified Momentum", () => {
    expect(rankingHardening).toContain("'score_basis','verified_momentum'");
    expect(rankingHardening).toContain("pc.evidence_mode = 'verified'");
    expect(rankingHardening).toContain("p.ranking_opt_in = true");
  });
});
