import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { calculateStreak } from "../lib/journeys";

const sql = readFileSync(
  new URL(
    "../../supabase/migrations/202608270003_journeys_momentum_challenges_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);
const docs = readFileSync(
  new URL("../../docs/journeys-momentum-challenges-hardening.md", import.meta.url),
  "utf8",
);

describe("Journeys 2D structural security contract", () => {
  test("missions can only be completed for a verified owner/source", () => {
    expect(sql).toContain("where user_id = new.user_id");
    expect(sql).toContain("and source_id = verified_source_id");
    expect(sql).toContain("and m.user_id = uid");
    expect(sql).toContain("and j.user_id = uid");
  });
  test("completion and completed_at are server-controlled", () => {
    expect(sql).toContain('drop policy if exists "owners update mission state"');
    expect(sql).toContain("revoke insert, update, delete on public.journey_missions");
    expect(sql).toContain("completed_at = statement_timestamp()");
  });
  test("retry cannot duplicate mission Momentum", () => {
    expect(sql).toContain("on conflict (user_id, source_type, source_id, event_type) do nothing");
    expect(sql).toContain("if inserted_event is null then return; end if");
    expect(sql).toContain("if result.status = 'completed' then return result; end if");
  });
  test("clients cannot choose reward, timestamp or fake source", () => {
    expect(sql).toContain("p_mission.momentum_value");
    expect(sql).not.toContain("p_points");
    expect(sql).not.toContain("p_reward");
    expect(sql).toContain("verified_source_id := new.subject_id");
    expect(sql).toContain("verified_source_id := new.id");
    expect(sql).toContain("revoke insert, update, delete on public.momentum_events");
  });
  test("challenge definition and progress are not client writable", () => {
    expect(sql).toContain("revoke insert, update, delete on public.challenges");
    expect(sql).toContain("revoke insert, update, delete on public.user_challenges");
  });
  test("verified events alone advance active, in-period capped progress", () => {
    expect(sql).toContain("if inserted_event is null then return");
    expect(sql).toContain("and c.type = 'mission_completions'");
    expect(sql).toContain("statement_timestamp() >= c.starts_at");
    expect(sql).toContain("statement_timestamp() < c.ends_at");
    expect(sql).toContain("least(");
    expect(sql).toContain("c2.target_value");
  });
  test("challenge completion reward is retry-safe and server-selected", () => {
    expect(sql).toContain("'weekly_challenge_completed', c.reward_points");
    expect(
      sql.match(/on conflict \(user_id, source_type, source_id, event_type\) do nothing/g),
    ).toHaveLength(2);
  });
  test("RLS and least privilege cover all domain tables", () => {
    for (const table of [
      "journeys",
      "journey_missions",
      "momentum_events",
      "challenges",
      "user_challenges",
    ])
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain("revoke all on function public.complete_verified_missions()");
    expect(sql).toContain("set search_path = pg_catalog, public");
  });
  test("documents NOT VALID findings rather than guessing legacy validity", () => {
    expect(docs).toContain("Journeys Foundation created no `NOT VALID` constraints");
    expect(docs).toContain("They cannot be safely validated from the repository alone");
    expect(sql).not.toContain("validate constraint");
  });
});

describe("verified-event streak", () => {
  test("multiple same-day events count one day", () => {
    expect(
      calculateStreak(
        ["2026-08-26T01:00:00Z", "2026-08-26T22:00:00Z", "2026-08-25T10:00:00Z"],
        new Date(2026, 7, 26),
      ),
    ).toBe(2);
  });
  test("a retry date cannot increase streak", () => {
    const dates = ["2026-08-26", "2026-08-25"];
    expect(calculateStreak([...dates, "2026-08-26"], new Date(2026, 7, 26))).toBe(
      calculateStreak(dates, new Date(2026, 7, 26)),
    );
  });
});
