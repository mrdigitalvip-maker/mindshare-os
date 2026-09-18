import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("E22→E23 integration foundation is provider-agnostic and future providers stay fail-closed", async () => {
  const registry = await read("supabase/functions/_shared/kivryn-integration-registry.ts");

  for (const provider of [
    "youtube",
    "tiktok",
    "instagram",
    "gmail",
    "google_calendar",
    "google_drive",
    "slack",
    "whatsapp",
  ]) {
    assert.match(registry, new RegExp(`\\b${provider}: \\{`), provider);
  }

  for (const provider of ["slack", "whatsapp"]) {
    const block = registry.match(new RegExp(`${provider}: \\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? "";
    assert.match(block, /implemented: false/, `${provider} must not pretend to be implemented`);
    assert.match(block, /readiness: "coming_soon"/, `${provider} must be truthfully unavailable`);
    assert.match(block, /authMode: "unconfigured"/, `${provider} auth must remain unconfigured`);
    assert.match(block, /capabilityScopes: \\{\\}/, `${provider} must not invent provider scopes`);
  }

  for (const provider of ["gmail", "google_calendar", "google_drive"]) {
    const block = registry.match(new RegExp(`${provider}: \\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? "";
    assert.match(block, /implemented: true/, `${provider} is activated by E59`);
    assert.match(block, /readiness: "configuration_required"/, `${provider} remains runtime-gated`);
    assert.match(block, /authMode: "oauth"/, `${provider} uses real OAuth`);
  }

  assert.match(registry, /credentialBoundary: "server_only"/);
  assert.match(registry, /!definition\.implemented/);
  assert.match(registry, /!input\.runtimeConfigured/);
  assert.match(registry, /input\.connectionStatus !== "connected"/);
  assert.match(registry, /requiredScopes\.length === 0\) return false/);
  assert.match(registry, /requiredScopes\.every\(\(scope\) => granted\.has\(scope\)\)/);
});

test("E22→E23 external mutations are approval-required while reads remain scope-gated", async () => {
  const registry = await read("supabase/functions/_shared/kivryn-integration-registry.ts");

  for (const capability of [
    "source.import",
    "mail.send",
    "calendar.write",
    "files.write",
    "messages.send",
  ]) {
    assert.match(
      registry,
      new RegExp(`"${capability}": \\{ risk: "external_mutation", requiresApproval: true \\}`),
      capability,
    );
  }

  for (const capability of ["mail.read", "calendar.read", "files.read", "messages.read"]) {
    assert.match(
      registry,
      new RegExp(`"${capability}": \\{ risk: "read", requiresApproval: false \\}`),
      capability,
    );
  }
});

test("E22→E23 keeps OAuth scopes and credentials server-side without weakening the Action Registry", async () => {
  const [registry, creatorIntelligence, oauthStart, oauthCallback, actionRegistry, actionService, env, migration] =
    await Promise.all([
      read("supabase/functions/_shared/kivryn-integration-registry.ts"),
      read("supabase/functions/_shared/creator-intelligence.ts"),
      read("supabase/functions/creator-oauth-start/index.ts"),
      read("supabase/functions/creator-oauth-callback/index.ts"),
      read("supabase/functions/_shared/kivryn-action-registry.ts"),
      read("src/services/nexora-action-service.ts"),
      read(".env.example"),
      read("supabase/migrations/202609040005_creator_intelligence.sql"),
    ]);

  assert.match(creatorIntelligence, /KIVRYN_INTEGRATION_PROVIDERS/);
  assert.doesNotMatch(creatorIntelligence, /https:\/\/www\.googleapis\.com\/auth\/youtube\.readonly/);
  assert.match(registry, /https:\/\/www\.googleapis\.com\/auth\/youtube\.readonly/);
  assert.match(oauthStart, /providerClientId\(provider\)/);
  assert.match(oauthStart, /isGoogleOAuthProvider\(provider\)/);
  assert.match(oauthCallback, /encryptServerSecret\(accessToken\)/);
  assert.match(oauthCallback, /encryptServerSecret\(String\(token\.refresh_token\)\)/);
  assert.doesNotMatch(env, /^VITE_.*(?:SECRET|PRIVATE|SERVICE_ROLE|TOKEN)/m);

  assert.match(migration, /create table public\.creator_provider_credentials/);
  assert.match(migration, /alter table public\.creator_provider_credentials enable row level security/);
  assert.match(migration, /No client policy is permitted/);

  assert.doesNotMatch(actionRegistry, /send_email|send_message|publish_content|delete_external_resource/);
  assert.match(actionService, /confirmed:\s*true/);
  assert.match(actionService, /if \(!input\.confirmed\) throw new Error\("confirmation_required"\)/);
});
