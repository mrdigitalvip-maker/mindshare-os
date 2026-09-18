import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [client, edge, scheduled] = await Promise.all([
  readFile(new URL("../src/services/push-service.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/push-send/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/scheduled-agent-runs/index.ts", import.meta.url), "utf8"),
]);

test("Web Push repair uses the backend VAPID public key as the single source of truth", () => {
  assert.match(edge, /input\.action === "config"/);
  assert.match(edge, /configured: true, publicKey/);
  assert.match(client, /body: \{ action: "config" \}/);
  assert.match(client, /subscriptionUsesPublicKey/);
  assert.match(client, /await subscription\.unsubscribe\(\)/);
  assert.match(client, /\.delete\(\)[\s\S]*\.eq\("endpoint", staleEndpoint\)/);
  assert.match(client, /applicationServerKey: decodeVapidPublicKey\(config\.publicKey\)/);
  assert.doesNotMatch(client, /VITE_VAPID_PUBLIC_KEY/);
});

test("Web Push derives its canonical public key from the private VAPID key", () => {
  assert.match(edge, /createECDH\("prime256v1"\)/);
  assert.match(edge, /setPrivateKey\(Buffer\.from\(privateKey, "base64url"\)\)/);
  assert.match(edge, /getPublicKey\(\)\.toString\("base64url"\)/);
  assert.match(edge, /const publicKey = privateKey \? deriveVapidPublicKey\(privateKey\) : null/);
  assert.match(edge, /storedPublicKeyMatchesPrivate/);
  assert.match(edge, /webpush\.setVapidDetails\(subject, publicKey, privateKey\)/);
});

test("Web Push test auto-repairs the browser subscription before delivery", () => {
  const sendTestStart = client.indexOf("async sendTest(): Promise<number>");
  const sendTestEnd = client.indexOf("return accepted;", sendTestStart);
  const sendTestBody = client.slice(sendTestStart, sendTestEnd);
  assert.match(sendTestBody, /await PushService\.enable\(\)/);
  assert.ok(
    sendTestBody.indexOf("await PushService.enable()") < sendTestBody.indexOf('supabase.functions.invoke("push-send"'),
    "sendTest must repair the subscription before invoking push-send",
  );
});

test("Web Push delivery exposes accepted and provider diagnostics", () => {
  assert.match(edge, /webPushConfigured/);
  assert.match(edge, /webSubscriptions/);
  assert.match(edge, /webFailureStatuses/);
  assert.match(client, /result\?\.accepted \?\? result\?\.delivered \?\? 0/);
  assert.match(client, /result\?\.webPushConfigured === false/);
  assert.match(client, /Provider HTTP:/);
  assert.match(client, /return accepted/);
});

test("scheduled Agent notifications expose external push delivery evidence", () => {
  assert.match(scheduled, /const payload = await pushResponse\.json\(\)/);
  assert.match(scheduled, /Number\(payload\.accepted\)/);
  assert.match(scheduled, /Number\(payload\.failed\)/);
  assert.match(scheduled, /pushAttempted,/);
  assert.match(scheduled, /pushAccepted,/);
  assert.match(scheduled, /pushFailed,/);
  assert.match(scheduled, /pushRequestFailed,/);
  assert.match(scheduled, /quietHoursSuppressed,/);
  assert.match(scheduled, /insideQuietHours/);
});
