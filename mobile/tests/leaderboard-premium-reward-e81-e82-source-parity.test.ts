import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const leaderboard = source("../../supabase/migrations/202609190330_e81_leaderboard_server_timezone.sql");
const reward = source("../../supabase/migrations/202609190340_e82_90_day_premium_reward.sql");
const arena = source("../services/arena-service.ts");
const subscription = source("../services/subscription-service.ts");
const hook = source("../hooks/use-subscription.ts");
const premium = source("../app/(app)/premium.tsx");

describe("E81/E82 leaderboard authority and Premium activity reward", () => {
  test("E81 ranking periods are server-authoritative and remain opt-in", () => {
    expect(leaderboard).toContain("account_timezone := public.kivryn_challenge_timezone");
    expect(leaderboard).toContain("p.ranking_opt_in = true");
    expect(leaderboard).toContain("p.visibility = 'community'");
    expect(leaderboard).toContain("public.community_public_user_id(r.user_id)");
    expect(arena.match(/get_challenge_ranking[\s\S]*?if \(error\)/)?.[0] ?? "")
      .not.toContain("p_timezone");
  });

  test("E82 activity ledger is server-owned and one row per user/day", () => {
    expect(reward).toContain("primary key (user_id, activity_date)");
    expect(reward).toContain("revoke all on public.premium_reward_activity_days from anon, authenticated");
    expect(reward).toContain("revoke all on public.premium_activity_rewards from anon, authenticated");
    expect(reward).not.toContain("self_checkin");
  });

  test("E82 reward is 90 days once, 30 Premium days, and never writes paid subscriptions", () => {
    expect(reward).toContain("running_streak >= 90");
    expect(reward).toContain("unique (user_id, reward_key)");
    expect(reward).toContain("granted_at + interval '30 days'");
    expect(reward).toContain("'auto_renews',false");
    expect(reward).not.toMatch(/insert into public\.subscriptions/i);
    expect(reward).not.toMatch(/update public\.subscriptions/i);
  });

  test("Android consumes canonical runtime and refreshes it after reward claim", () => {
    expect(subscription).toContain('"get_subscription_runtime"');
    expect(subscription).toContain('"claim_premium_activity_reward"');
    expect(subscription).toContain("activityReward");
    expect(hook).toContain("useClaimPremiumActivityReward");
    expect(hook).toContain("invalidateQueries");
  });

  test("Android surfaces transparent reward lifecycle", () => {
    expect(premium).toContain("90 valid activity days → 30 days Premium");
    expect(premium).toContain("Claim 30 days Premium");
    expect(premium).toContain("reward?.eligible ? 90");

    expect(premium).toContain("No automatic renewal");
    expect(premium).toContain("returns to Free automatically");
  });
});
