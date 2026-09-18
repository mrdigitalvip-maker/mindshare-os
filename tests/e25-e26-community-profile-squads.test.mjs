import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const route = read("src/routes/_shell.community.tsx");
const squadRoute = read("src/routes/_shell.community.squads.$squadId.tsx");
const service = read("src/services/parity-service.ts");
const migration = read("supabase/migrations/202609180001_community_e25_e26_hardening.sql");

test("E25 gates Web Community actions behind a complete canonical profile", () => {
  assert.match(route, /isCommunityProfileReady/);
  assert.match(route, /Squads bloqueados até concluir seu perfil/);
  assert.match(route, /visibility: "community"/);
  assert.doesNotMatch(route, /Mostrar sequência/);
  assert.match(service, /COMMUNITY_USERNAME/);
  assert.match(service, /COMMUNITY_RESERVED/);
  assert.match(migration, /p_visibility = 'community'/);
  assert.match(migration, /raise exception 'profile_invalid'/);
});

test("E26 create and accept enter the canonical Squad route", () => {
  assert.match(route, /Squad criado/);
  assert.ok(route.includes('to: "/community/squads/$squadId"'));
  assert.match(route, /Convite aceito/);
  assert.ok(squadRoute.includes("q.data.member_count"));
});

test("E26 invitation expiry and member totals come from the backend", () => {
  assert.match(service, /create_squad_invite_v2/);
  assert.ok(service.includes("result.expires_at"));
  assert.ok(!service.includes("Date.now() + 7 * 864e5"));
  assert.match(service, /member_count: Number/);
  assert.match(migration, /'member_count'/);
  assert.match(migration, /'expires_at'/);
});

test("E26 backend enforces profile, capacity and membership truth", () => {
  assert.ok(migration.includes("not public.community_profile_ready(uid)"));
  assert.match(migration, /raise exception 'already_member'/);
  assert.match(migration, /raise exception 'squad_full'/);
  assert.match(migration, /for update/);
  assert.match(migration, /squad_description_invalid/);
  assert.match(migration, /squad_capacity_invalid/);
});

test("E26 destructive Squad actions require explicit confirmation in Web UI", () => {
  assert.match(squadRoute, /Confirmar encerramento/);
  assert.match(squadRoute, /Confirmar saída/);
  assert.match(squadRoute, /Confirmar remoção/);
});
