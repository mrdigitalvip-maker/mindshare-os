import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const leaderboard = read("supabase/migrations/202609190330_e81_leaderboard_server_timezone.sql");
const reward = read("supabase/migrations/202609190340_e82_90_day_premium_reward.sql");
const webRanking = read("src/services/challenges-web-service.ts");
const mobileRanking = read("mobile/services/arena-service.ts");
const webSubscription = read("src/services/subscription-status-service.ts");
const mobileSubscription = read("mobile/services/subscription-service.ts");
const webPremium = read("src/routes/_shell.premium.tsx");
const mobilePremium = read("mobile/app/(app)/premium.tsx");

test("E81 keeps leaderboard opt-in/private and moves period boundaries to server account timezone", () => {
  assert.match(leaderboard, /create or replace function public\.get_challenge_ranking/);
  assert.match(leaderboard, /notification_preferences/);
  assert.match(leaderboard, /profiles/);
  assert.match(leaderboard, /account_timezone := public\.kivryn_challenge_timezone/);
  assert.match(
    leaderboard,
    /kivryn_challenge_period_bounds\(\s*p_period,\s*account_timezone,/s,
  );
  assert.doesNotMatch(
    leaderboard,
    /kivryn_challenge_period_bounds\(\s*p_period,\s*p_timezone,/s,
  );
  assert.match(leaderboard, /p\.ranking_opt_in = true/);
  assert.match(leaderboard, /p\.visibility = 'community'/);
  assert.match(leaderboard, /public\.community_public_user_id\(r\.user_id\)/);
  assert.doesNotMatch(leaderboard, /email/);
});

test("E81 Web and Android stop supplying a competitive timezone from the client", () => {
  const webCall = webRanking.match(/get_challenge_ranking[\s\S]*?if \(error\)/)?.[0] ?? "";
  const mobileCall = mobileRanking.match(/get_challenge_ranking[\s\S]*?if \(error\)/)?.[0] ?? "";
  assert.doesNotMatch(webCall, /p_timezone/);
  assert.doesNotMatch(mobileCall, /p_timezone/);
  assert.match(webCall, /p_period: period/);
  assert.match(mobileCall, /p_period: period/);
});

test("E82 records at most one server-owned valid activity day and excludes self-report farming", () => {
  assert.match(reward, /create table if not exists public\.premium_reward_activity_days/);
  assert.match(reward, /primary key \(user_id, activity_date\)/);
  assert.match(reward, /record_premium_reward_activity/);
  for (const source of [
    "task_completion",
    "study_session",
    "journey_mission",
    "studio_learning",
    "passport_vocabulary",
    "passport_roleplay",
  ]) {
    assert.match(reward, new RegExp(source));
  }
  assert.doesNotMatch(reward, /self_checkin/);
  assert.match(reward, /revoke all on public\.premium_reward_activity_days from anon, authenticated/);
  assert.match(reward, /revoke all on public\.premium_activity_rewards from anon, authenticated/);
});

test("E82 grants one non-renewing 30-day reward only after a real 90-day streak", () => {
  assert.match(reward, /reward_key = 'activity_90_day_v1'/);
  assert.match(reward, /unique \(user_id, reward_key\)/);
  assert.match(reward, /running_streak >= 90/);
  assert.match(reward, /eligibility_days integer not null default 90/);
  assert.match(reward, /granted_at \+ interval '30 days'/);
  assert.match(reward, /'billing_created',false/);
  assert.match(reward, /'auto_renews',false/);
  assert.match(reward, /public\.has_subscription_premium\(uid,granted_at\)/);
  assert.match(reward, /public\.has_internal_full_access\(uid\)/);
  assert.doesNotMatch(reward, /insert into public\.subscriptions/i);
  assert.doesNotMatch(reward, /update public\.subscriptions/i);
});

test("E82 Premium runtime recognizes the reward without changing paid provider rows", () => {
  assert.match(reward, /create or replace function public\.has_subscription_premium/);
  assert.match(reward, /create or replace function public\.has_premium/);
  assert.match(reward, /from public\.premium_activity_rewards r/);
  assert.match(reward, /activity_reward_premium/);
  assert.match(reward, /effective_source := 'activity_reward'/);
  assert.match(reward, /'provider',effective_provider/);
  assert.match(webSubscription, /claim_premium_activity_reward/);
  assert.match(mobileSubscription, /claim_premium_activity_reward/);
});

test("E82 Web and Android explain progress, claim, expiry and no automatic renewal", () => {
  assert.match(webPremium, /90 valid activity days → 30 days Premium/);
  assert.match(webPremium, /Claim 30 days Premium/);
  assert.match(webPremium, /reward\?\.eligible \? 90/);
  assert.match(mobilePremium, /reward\?\.eligible \? 90/);

  assert.match(webPremium, /no automatic renewal/i);
  assert.match(webPremium, /subscription\.source === "subscriptions"/);
  assert.match(webPremium, /subscription\.provider === "stripe"/);
  assert.match(mobilePremium, /90 valid activity days → 30 days Premium/);
  assert.match(mobilePremium, /Claim 30 days Premium/);
  assert.match(mobilePremium, /No automatic renewal/);
});
