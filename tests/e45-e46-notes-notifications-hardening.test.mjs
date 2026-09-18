import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const e45 = read("supabase/migrations/202609180023_e45_notes_rls_index.sql");
const e46 = read("supabase/migrations/202609180024_e46_notifications_preferences_rls.sql");
const workspace = read("src/services/workspace-services.ts");
const notifications = read("src/services/notification-service.ts");
const push = read("src/services/push-service.ts");
const settings = read("src/services/settings-service.ts");
const demo = read("src/lib/demo/config.ts");
const localStore = read("src/services/local-store.ts");

test("E45 keeps Notes owner-only CRUD and adds the missing FK index", () => {
  assert.match(workspace, /\.from\("notes"\)/);
  assert.match(workspace, /\.eq\("user_id", userId\)/);
  assert.match(e45, /create index if not exists notes_user_id_idx\s+on public\.notes\(user_id\)/);
  assert.match(e45, /create policy notes_all/);
  assert.match(e45, /for all\s+to public/);
  assert.match(e45, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(e45, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(e45, /drop index/i);
});

test("E46 preserves exact Notifications operation surfaces and roles", () => {
  assert.match(notifications, /\.from\("notifications"\)/);

  assert.match(e46, /create policy notification_select[\s\S]*for select\s+to public/);
  assert.match(e46, /create policy notification_insert[\s\S]*for insert\s+to public/);
  assert.match(e46, /create policy notification_update[\s\S]*for update\s+to public/);
  assert.doesNotMatch(e46, /notification_delete/);

  for (const name of ["owner select","owner insert","owner update","owner delete"]) {
    assert.match(e46, new RegExp(`create policy "${name}"`));
  }
  const prefRoles = e46.match(/to authenticated/g) ?? [];
  assert.equal(prefRoles.length, 4);
  assert.match(e46, /\(select auth\.uid\(\)\)/);
});

test("Settings and Push services are safe when methods are detached", () => {
  assert.doesNotMatch(settings, /\bthis\./);
  assert.doesNotMatch(push, /\bthis\./);
  assert.match(settings, /SettingsService\.list\(\)/);
  assert.match(settings, /SettingsService\.create\(input\)/);
  assert.match(push, /PushService\.preferences\(\)/);
  assert.match(push, /PushService\.save\(\{\}\)/);
  assert.match(push, /PushService\.enable\(\)/);
});

test("mock fallback remains development-only and cannot manufacture production success", () => {
  assert.match(demo, /import\.meta\.env\.DEV && rawFlag === "true"/);
  assert.match(localStore, /if \(!DEMO_MODE\)/);
  assert.match(localStore, /Mock workspace services are available only when VITE_DEMO_MODE=true/);
});
