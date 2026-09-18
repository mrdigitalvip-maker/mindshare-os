import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const billing = read("supabase/migrations/202609180007_e31_billing_durability.sql");
const push = read("supabase/migrations/202609180008_e32_push_rls_hardening.sql");
const checkout = read("supabase/functions/create-checkout-session/index.ts");
const webhook = read("supabase/functions/stripe-webhook/index.ts");

test("E31 keeps trial consumption in a service-only immutable ledger", () => {
  assert.match(billing, /create table if not exists public\.subscription_trial_ledger/);
  assert.match(billing, /user_id uuid primary key/);
  assert.match(billing, /revoke all on table public\.subscription_trial_ledger from public, anon, authenticated/);
  assert.match(billing, /Existing Stripe users must never become first-trial eligible/);
  assert.match(checkout, /\.from\("subscription_trial_ledger"\)/);
  assert.match(checkout, /supabase\.rpc\("get_subscription_runtime"\)/);
  assert.match(checkout, /is_premium\?: boolean/);
  assert.match(checkout, /const trialEligible = !existing\?\.stripe_subscription_id && !trialLedger/);
});

test("E31 records processed Stripe events and prevents replay/out-of-order regression", () => {
  assert.match(billing, /create table if not exists public\.stripe_webhook_events/);
  assert.match(billing, /event_id text primary key/);
  assert.match(billing, /stripe_last_event_created_at/);
  assert.match(billing, /return 'duplicate'/);
  assert.match(billing, /v_outcome := 'stale'/);
  assert.match(webhook, /\.from\("stripe_webhook_events"\)/);
  assert.match(webhook, /persist_stripe_subscription_state/);
  assert.match(webhook, /p_event_id: event\.id/);
  assert.match(webhook, /p_event_created_at: new Date\(event\.created \* 1000\)/);
  assert.doesNotMatch(webhook, /\.from\("subscriptions"\)\.upsert/);
});

test("E31 refreshes authoritative Stripe state for mutable subscription events", () => {
  assert.match(webhook, /case "customer\.subscription\.created"/);
  assert.match(webhook, /case "customer\.subscription\.updated"/);
  assert.match(webhook, /stripe\.subscriptions\.retrieve\(snapshot\.id\)/);
  assert.match(webhook, /case "customer\.subscription\.deleted"/);
  assert.match(webhook, /stripeError\.statusCode !== 404/);
});

test("E31 persistence RPC is service-role only", () => {
  assert.match(billing, /revoke all on function public\.persist_stripe_subscription_state[\s\S]*from public, anon, authenticated/);
  assert.match(billing, /grant execute on function public\.persist_stripe_subscription_state[\s\S]*to service_role/);
});

test("E32 keeps Web Push and native device policies owner-scoped with initplan-safe auth", () => {
  for (const table of ["push_subscriptions", "push_devices"]) {
    const blocks = push
      .split(/create policy /)
      .filter((block) => block.includes(`public.${table}`));
    assert.ok(blocks.length >= 4, `${table} should preserve CRUD owner policies`);
    for (const block of blocks) {
      assert.match(block, /\(select auth\.uid\(\)\)/);
      assert.doesNotMatch(block, /user_id = auth\.uid\(\)/);
    }
  }
});
