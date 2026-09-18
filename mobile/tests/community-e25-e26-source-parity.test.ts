import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(path.startsWith("mobile/") ? path.slice(7) : `../${path}`, "utf8");

describe("E25 + E26 Community Profile and Squads", () => {
  const home = read("mobile/app/(app)/community/index.tsx");
  const squad = read("mobile/app/(app)/community/squads/[squadId].tsx");
  const service = read("mobile/services/community-service.ts");
  const domain = read("mobile/lib/community.ts");
  const web = read("src/routes/_shell.community.tsx");
  const migration = read("supabase/migrations/202609180001_community_e25_e26_hardening.sql");
  const indexes = read("supabase/migrations/202609180002_community_e26_indexes.sql");

  test("E25 profile is the gate on Android and Web", () => {
    expect(home).toContain("profileReady && !editingProfile");
    expect(home).not.toContain("label={c.streak}");
    expect(web).toContain("isCommunityProfileReady");
    expect(migration).toContain("not public.community_profile_ready(uid)");
  });

  test("E25 validation stays canonical and server-authoritative", () => {
    expect(domain).toContain("profile_invalid");
    expect(service).toContain("profileValidation");
    expect(migration).toContain("p_visibility = 'community'");
    expect(migration).toContain("username_taken");
  });

  test("E26 create and invite flows enter the actual Squad", () => {
    expect(home).toContain("router.push(\`/community/squads/\${squadId}\`)");
    expect(service).toContain('"create_squad_invite_v2"');
    expect(service).toContain("expires_at");
    expect(migration).toContain("raise exception 'already_member'");
  });

  test("E26 count, capacity and invite expiry come from persisted backend truth", () => {
    expect(squad).toContain("s.memberCount");
    expect(service).toContain("memberCount: Number(s.member_count");
    expect(squad).toContain("new Date(invite.expiresAt)");
    expect(migration).toContain("'member_count'");
    expect(migration).toContain("'expires_at'");
    expect(migration).toContain("for update");
  });

  test("E26 destructive actions are confirmed", () => {
    expect(squad).toContain('"Remover membro"');
    expect(squad).toContain('"Sair do Squad"');
    expect(squad).toContain('"Encerrar Squad"');
    expect(squad).toContain('style: "destructive"');
  });

  test("E26 indexes ownership and invite actor lookups", () => {
    expect(indexes).toContain("squads_owner_id_idx");
    expect(indexes).toContain("squad_invites_invited_by_idx");
    expect(indexes).toContain("squad_invites_accepted_by_idx");
  });

  test("clients remain on RPCs rather than direct Squad table mutations", () => {
    expect(service).not.toMatch(/from\\(["'](?:squads|squad_members|squad_invites)["']\\)\\.(?:insert|update|delete)/);
    expect(web).not.toMatch(/from\\(["'](?:squads|squad_members|squad_invites)["']\\)\\.(?:insert|update|delete)/);
  });
});
