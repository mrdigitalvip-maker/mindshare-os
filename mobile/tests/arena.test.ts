import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  arenaProgressLabel,
  isCurrentArenaChallenge,
  resolveArenaChallenge,
  type ArenaChallenge,
} from "../lib/arena";
const base: ArenaChallenge = {
  id: "challenge",
  slug: "verified",
  title: "Execução",
  description: null,
  type: "mission_completions",
  targetValue: 5,
  rewardPoints: 100,
  startsAt: "2026-08-01T00:00:00Z",
  endsAt: "2026-09-01T00:00:00Z",
  active: true,
  progress: 2,
  joinedAt: null,
  completedAt: null,
};
const sql = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/202608290001_arena_v1.sql", import.meta.url)),
  "utf8",
).toLowerCase();
const hardened = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/202608270003_journeys_momentum_challenges_hardening.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).toLowerCase();
describe("Arena truthful domain", () => {
  test("empty backend stays empty with no fake count", () => {
    expect(([] as ArenaChallenge[]).filter((item) => isCurrentArenaChallenge(item))).toEqual([]);
    expect(sql).not.toContain("participant_count");
  });
  test("interprets half-open challenge periods", () => {
    expect(resolveArenaChallenge(base, new Date("2026-07-31T23:59:59Z")).state).toBe("upcoming");
    expect(resolveArenaChallenge(base, new Date("2026-08-01T00:00:00Z")).state).toBe("joinable");
    expect(resolveArenaChallenge(base, new Date("2026-09-01T00:00:00Z")).state).toBe("ended");
  });
  test("caps progress without altering truth", () => {
    expect(resolveArenaChallenge({ ...base, progress: 99 }).progress).toBe(5);
    expect(resolveArenaChallenge({ ...base, progress: -2 }).progress).toBe(0);
    expect(arenaProgressLabel(base)).toContain("missões verificadas");
  });
  test("join is authenticated, idempotent, and period-safe", () => {
    expect(sql).toContain("uid uuid := auth.uid()");
    expect(sql).toContain("on conflict (user_id, challenge_id) do nothing");
    expect(sql).toContain("raise exception 'challenge_not_joinable'");
    expect(sql).toContain("statement_timestamp() < c.ends_at");
  });
  test("verified event is the retry-safe progress boundary", () => {
    expect(hardened).toContain("if inserted_event is null then return; end if");
    expect(hardened).toContain(
      "on conflict (user_id, source_type, source_id, event_type) do nothing",
    );
    expect(hardened).toContain("p_mission.momentum_value");
  });
  test("read model is deterministic, private, and handles empty ranking by omission", () => {
    expect(sql).toContain("uc.user_id = uid");
    expect(sql).toContain("c.ends_at asc, c.id asc");
    expect(sql).not.toContain("email");
    expect(sql).not.toContain("display_name");
  });
  test("reads, refreshes, and free access cannot mutate progress", () => {
    expect(sql).not.toContain("is_premium");
    expect(sql.match(/insert into public.user_challenges/g)?.length).toBe(1);
  });
});
