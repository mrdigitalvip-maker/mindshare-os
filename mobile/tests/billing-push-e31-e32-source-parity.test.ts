import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const billing = source("../../supabase/migrations/202609180007_e31_billing_durability.sql");
const push = source("../../supabase/migrations/202609180008_e32_push_rls_hardening.sql");
const checkout = source("../../supabase/functions/create-checkout-session/index.ts");
const webhook = source("../../supabase/functions/stripe-webhook/index.ts");
const playBilling = source("../services/play-billing-service.ts");

describe("E31 + E32 billing durability and notification RLS", () => {
  test("E31 trial eligibility is server-side and durable", () => {
    expect(checkout).toContain('"subscription_trial_ledger"');
    expect(checkout).toContain("!existing?.stripe_subscription_id && !trialLedger");
    expect(billing).toContain("subscription_trial_ledger");
    expect(billing).toContain("revoke all on table public.subscription_trial_ledger");
  });

  test("E31 webhook uses atomic event convergence instead of client-visible subscription writes", () => {
    expect(webhook).toContain('"persist_stripe_subscription_state"');
    expect(webhook).toContain('"stripe_webhook_events"');
    expect(webhook).not.toMatch(/from\(["']subscriptions["']\)\.upsert/);
    expect(billing).toContain("stripe_last_event_created_at");
    expect(billing).toContain("return 'duplicate'");
  });

  test("E32 preserves owner-only push CRUD with optimized auth evaluation", () => {
    expect(push).toContain("public.push_subscriptions");
    expect(push).toContain("public.push_devices");
    expect(push).toContain("(select auth.uid())");
    expect(push).not.toContain("user_id = auth.uid()");
  });

  test("E31/E32 do not enable unfinished Android Play Billing", () => {
    expect(playBilling).toContain("PLAY_BILLING_UNAVAILABLE_FOR_TESTER_BUILD");
    expect(playBilling).toContain("return unavailable()");
  });
});
