import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = async (path) => await readFile(new URL(path, import.meta.url), "utf8");

const intelligence = await source("../supabase/functions/_shared/creator-intelligence.ts");
const start = await source("../supabase/functions/creator-oauth-start/index.ts");
const callback = await source("../supabase/functions/creator-oauth-callback/index.ts");
const compatibility = await source("../supabase/functions/google-oauth-callback/index.ts");
const envExample = await source("../.env.example");

test("Google Workspace accepts the canonical and legacy server-only OAuth secret names", () => {
  assert.match(intelligence, /GOOGLE_WORKSPACE_CLIENT_ID/);
  assert.match(intelligence, /GOOGLE_OAUTH_CLIENT_ID/);
  assert.match(intelligence, /GOOGLE_WORKSPACE_CLIENT_SECRET/);
  assert.match(intelligence, /GOOGLE_OAUTH_CLIENT_SECRET/);
  assert.match(envExample, /GOOGLE_WORKSPACE_CLIENT_ID=/);
  assert.match(envExample, /GOOGLE_OAUTH_CLIENT_ID=/);
});

test("Gmail Calendar and Drive use the existing KIVRYN Backend OAuth callback", () => {
  assert.match(start, /provider === "gmail"/);
  assert.match(start, /provider === "google_calendar"/);
  assert.match(start, /provider === "google_drive"/);
  assert.match(start, /"google-oauth-callback"/);
  assert.match(compatibility, /creator-oauth-callback\/index\.ts/);
});

test("OAuth token exchange uses the same callback endpoint that received the request", () => {
  assert.match(callback, /request\.url/);
  assert.match(callback, /endsWith\("\/google-oauth-callback"\)/);
  assert.match(callback, /\$\{callbackFunction\}/);
  assert.match(callback, /provider !== "gmail"/);
  assert.match(callback, /provider !== "google_calendar"/);
  assert.match(callback, /provider !== "google_drive"/);
});

test("Google login callback remains separate from Workspace connection OAuth", () => {
  assert.match(envExample, /APP_URL=https:\/\/kivryn\.co/);
  assert.doesNotMatch(start, /\/auth\/v1\/callback/);
});
