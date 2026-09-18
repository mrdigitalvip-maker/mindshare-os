import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/202609180005_e29_premium_runtime_authority.sql");
const rlsHardening = read("supabase/migrations/202609180006_e29_e30_rls_hardening.sql");
const webSubscription = read("src/services/subscription-status-service.ts");
const mobileSubscription = read("mobile/services/subscription-service.ts");
const integrationStatus = read("supabase/functions/integration-status/index.ts");
const registry = read("supabase/functions/_shared/kivryn-integration-registry.ts");
const webSettings = read("src/routes/_shell.settings.tsx");
const mobileSettings = read("mobile/app/(app)/settings.tsx");

test("E29 centralizes Premium entitlement by provider on the backend", () => {
  assert.match(migration, /create or replace function public\.has_premium/);
  assert.match(migration, /s\.provider = 'google_play'/);
  assert.match(migration, /'active','grace_period','canceled'/);
  assert.match(migration, /s\.provider = 'stripe'/);
  assert.match(migration, /'active','trialing'/);
  assert.match(migration, /s\.provider = 'manual'/);
  assert.match(migration, /create or replace function public\.get_subscription_runtime/);
  assert.match(migration, /public\.has_internal_full_access\(uid\)/);
});

test("E29 Web and Android consume canonical subscription runtime instead of reinterpreting rows", () => {
  assert.match(webSubscription, /get_subscription_runtime/);
  assert.match(mobileSubscription, /get_subscription_runtime/);
  assert.doesNotMatch(webSubscription, /\.from\(["']subscriptions["']\)/);
  assert.doesNotMatch(mobileSubscription, /\.from\(["']subscriptions["']\)/);
});

test("E30 integration status is authenticated, registry-driven and owner scoped", () => {
  assert.match(integrationStatus, /KIVRYN_INTEGRATION_PROVIDERS/);
  assert.match(integrationStatus, /client\.auth\.getUser\(\)/);
  assert.match(integrationStatus, /\.eq\("user_id", user\.id\)/);
  assert.match(integrationStatus, /creator_platform_connections/);
  assert.doesNotMatch(integrationStatus, /access_token|refresh_token|provider_credentials/);
});

test("E30 keeps future providers fail-closed", () => {
  for (const provider of ["gmail", "google_calendar", "google_drive", "slack", "whatsapp"]) {
    const block = registry.match(new RegExp(`${provider}: \\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? "";
    assert.match(block, /implemented: false/, provider);
    assert.match(block, /readiness: "coming_soon"/, provider);
    assert.match(block, /authMode: "unconfigured"/, provider);
  }
});

test("E30 Settings surfaces truthful readiness without adding fake provider actions", () => {
  assert.match(webSettings, /listIntegrationReadiness/);
  assert.match(webSettings, /provider\.readiness === "coming_soon"/);
  assert.match(webSettings, /to="\/creator"/);
  assert.match(mobileSettings, /listIntegrationReadiness/);
  assert.match(mobileSettings, /provider\.readiness === "coming_soon"/);
  assert.match(mobileSettings, /router\.push\("\/creator"\)/);
  assert.doesNotMatch(webSettings, /connectGmail|connectSlack|connectWhatsApp/);
  assert.doesNotMatch(mobileSettings, /connectGmail|connectSlack|connectWhatsApp/);
});

test("E30 preserves approval-required external mutations in the integration registry", () => {
  for (const capability of ["source.import", "mail.send", "calendar.write", "files.write", "messages.send"]) {
    assert.match(
      registry,
      new RegExp(`"${capability}": \\{ risk: "external_mutation", requiresApproval: true \\}`),
    );
  }
});


test("E29/E30 keeps subscription writes server-only and owner reads optimized", () => {
  assert.match(rlsHardening, /drop policy if exists subscriptions_all/);
  assert.match(rlsHardening, /for select\s+to authenticated\s+using \(user_id = \(select auth\.uid\(\)\)\)/s);
  assert.match(rlsHardening, /creator_connections_owner_select/);
  assert.doesNotMatch(rlsHardening, /for (?:insert|update|delete|all)\s+to authenticated/i);
});
