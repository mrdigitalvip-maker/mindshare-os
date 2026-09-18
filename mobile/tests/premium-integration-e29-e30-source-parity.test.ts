import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const migration = source("../../supabase/migrations/202609180005_e29_premium_runtime_authority.sql");
const rlsHardening = source("../../supabase/migrations/202609180006_e29_e30_rls_hardening.sql");
const subscription = source("../services/subscription-service.ts");
const settings = source("../app/(app)/settings.tsx");
const integrationService = source("../services/integration-status-service.ts");
const integrationEdge = source("../../supabase/functions/integration-status/index.ts");
const registry = source("../../supabase/functions/_shared/kivryn-integration-registry.ts");
const playBilling = source("../services/play-billing-service.ts");

describe("E29 + E30 Premium runtime and integration gate", () => {
  test("E29 Android consumes the canonical Premium RPC", () => {
    expect(subscription).toContain('"get_subscription_runtime"');
    expect(subscription).not.toMatch(/from\(["']subscriptions["']\)/);
    expect(migration).toContain("public.has_internal_full_access(uid)");
  });

  test("E29 provider semantics remain server authoritative", () => {
    expect(migration).toContain("s.provider = 'google_play'");
    expect(migration).toContain("'active','grace_period','canceled'");
    expect(migration).toContain("s.provider = 'stripe'");
    expect(migration).toContain("'active','trialing'");
  });

  test("E30 Settings reads integration readiness from the authenticated server function", () => {
    expect(settings).toContain("listIntegrationReadiness");
    expect(integrationService).toContain('"integration-status"');
    expect(integrationEdge).toContain("client.auth.getUser()");
    expect(integrationEdge).toContain('.eq("user_id", user.id)');
    expect(integrationEdge).not.toMatch(/access_token|refresh_token|provider_credentials/);
  });

  test("E30 still-unimplemented future providers remain visibly unavailable", () => {
    for (const provider of ["slack", "whatsapp"]) {
      const block = registry.match(new RegExp(`${provider}: \\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? "";
      expect(block).toContain("implemented: false");
      expect(block).toContain('readiness: "coming_soon"');
      expect(block).toContain('authMode: "unconfigured"');
    }
    expect(settings).not.toMatch(/connectSlack|connectWhatsApp/);
  });

  test("E29/E30 keeps billing writes server-only and owner reads canonical", () => {
    expect(rlsHardening).toContain("drop policy if exists subscriptions_all");
    expect(rlsHardening).toContain("using (user_id = (select auth.uid()))");
    expect(rlsHardening).toContain("creator_connections_owner_select");
  });

  test("E30 does not silently turn on unfinished Android billing", () => {
    expect(playBilling).toContain("PLAY_BILLING_UNAVAILABLE_FOR_TESTER_BUILD");
    expect(playBilling).toContain("return unavailable()");
  });
});
