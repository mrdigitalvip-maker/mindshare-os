import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  challengeLevel,
  challengeMetricLabel,
  resolvePersonalChallenge,
  type PersonalChallenge,
} from "../lib/arena";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const foundation = read("../../supabase/migrations/202609130005_challenges_ranking_v1.sql").toLowerCase();
const hardening = read("../../supabase/migrations/202609130006_challenges_ranking_hardening.sql").toLowerCase();
const actionMigration = read("../../supabase/migrations/202609130007_challenges_action_engine.sql").toLowerCase();
const scheduler = read("../../supabase/functions/scheduled-reminders/index.ts");
const sharedActions = read("../../supabase/functions/_shared/nexora-actions.js");
const screen = read("../app/(app)/challenges.tsx");
const more = read("../app/(app)/(tabs)/more.tsx");

const challenge: PersonalChallenge = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Sprint",
  description: null,
  category: "execution",
  period: "weekly",
  metric: "task_completions",
  evidenceMode: "verified",
  targetValue: 5,
  progress: 2,
  rewardPoints: 300,
  source: "manual",
  status: "active",
  startsAt: "2026-09-07T00:00:00Z",
  endsAt: "2026-09-14T00:00:00Z",
  completedAt: null,
  createdAt: "2026-09-07T00:00:00Z",
};

describe("KIVRYN Challenges & Ranking", () => {
  test("personal progress stays bounded and level derives from Momentum", () => {
    expect(resolvePersonalChallenge(challenge)).toEqual({ progress: 2, target: 5, ratio: 0.4, remaining: 3 });
    expect(resolvePersonalChallenge({ ...challenge, progress: 99 }).progress).toBe(5);
    expect(challengeLevel(0)).toBe(1);
    expect(challengeLevel(1000)).toBeGreaterThan(1);
    expect(challengeMetricLabel("study_minutes", 90)).toBe("90 min");
  });

  test("server owns evidence mode and rewards", () => {
    expect(foundation).toContain("do not let a client label self-reported behavior as verified");
    expect(foundation).toContain("case when p_metric = 'self_checkins' then 'self_reported' else 'verified' end");
    expect(foundation).toContain("public.kivryn_challenge_reward(p_period,evidence)");
    expect(foundation).toContain("revoke all on public.personal_challenges");
  });

  test("verified app events advance challenges without client progress writes", () => {
    expect(foundation).toContain("kivryn_task_challenge_progress");
    expect(foundation).toContain("kivryn_study_challenge_progress");
    expect(foundation).toContain("kivryn_journey_challenge_progress");
    expect(foundation).toContain("unique(challenge_id, source_type, source_id)");
    expect(foundation).toContain("apply_personal_challenge_progress");
  });

  test("self check-ins are one per local day and cannot masquerade as verified", () => {
    expect(foundation).toContain("personal_challenge_one_self_checkin_per_day");
    expect(hardening).toContain("already_checked_in_today");
    expect(hardening).toContain("challenge.evidence_mode <> 'self_reported'");
    expect(hardening).toContain("if tg_op = 'insert' then");
  });

  test("ranking is explicit opt-in and competitive score excludes self-reported Momentum", () => {
    expect(foundation).toContain("ranking_opt_in boolean not null default false");
    expect(foundation).toContain("community_profile_required");
    expect(hardening).toContain("pc.evidence_mode = 'verified'");
    expect(hardening).toContain("'score_basis','verified_momentum'");
    expect(hardening).toContain("public.community_public_user_id(r.user_id)");
    expect(hardening).not.toContain("'email'");
  });

  test("assistant uses preview-confirm-apply instead of direct model mutation", () => {
    expect(sharedActions).toContain('"create_personal_challenge"');
    expect(sharedActions).toContain("challenge_period");
    expect(sharedActions).toContain("challenge_category");
    expect(actionMigration).toContain("if p_confirmed is not true then raise exception 'confirmation_required'");
    expect(actionMigration).toContain("'create_personal_challenge'");
    expect(actionMigration).toContain("'assistant'");
  });

  test("reminders respect quiet-hours coordinator and daily dedupe", () => {
    expect(scheduler).toContain("insideQuietHours");
    expect(scheduler).toContain("pref.challenges_enabled !== false");
    expect(scheduler).toContain("challenge-reminder:");
    expect(scheduler).toContain('url: "/challenges"');
    expect(scheduler).toContain("36 * 60 * 60 * 1000");
  });

  test("screen exposes accept customize replace create ranking and evidence labels", () => {
    for (const token of ["Accept", "Customize", "Replace", "AUTODECLARADO", "VERIFICADO", "RANKING"]) {
      expect(screen).toContain(token);
    }
    expect(screen).toContain('pathname: "/assistant-chat"');
    expect(more).toContain('href="/challenges"');
  });
});
