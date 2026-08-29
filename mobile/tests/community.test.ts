import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { communityErrorMessage } from "../lib/community";
const sql = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/202608290002_community_v1.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();
describe("Community V1 production contract", () => {
  test("profiles are private and never expose private identity", () => {
    expect(sql).toContain("default 'private'");
    expect(sql).toContain("p.visibility='community'");
    expect(sql).not.toContain("select email");
    expect(sql).not.toContain("phone");
    expect(sql).toContain("community_profiles_username_ci_idx");
    expect(sql).toContain("community_username_reserved");
  });
  test("tables use RLS and closed grants", () => {
    for (const table of [
      "community_profiles",
      "squads",
      "squad_members",
      "squad_invites",
      "community_activity",
      "activity_reactions",
      "community_blocks",
      "community_reports",
    ])
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain("revoke all on public.community_profiles");
  });
  test("squads enforce cap, roles and lifecycle", () => {
    expect(sql).toContain("primary key(squad_id,user_id)");
    expect(sql).toContain("for update");
    expect(sql).toContain("if current_count>=cap");
    expect(sql).toContain("owner_cannot_leave");
    expect(sql).toContain("on delete cascade");
  });
  test("invites are hashed, retry-safe and block-aware", () => {
    expect(sql).toContain("digest(token,'sha256')");
    expect(sql).toContain("inv.status='accepted' and inv.accepted_by=uid");
    expect(sql).toContain("invite_expired");
    expect(sql).toContain("community_is_blocked(uid,inv.invited_by)");
  });
  test("only canonical verified momentum inserts unique activity", () => {
    expect(sql).toContain("after insert on public.momentum_events");
    expect(sql).toContain("new.event_type='mission_completed'");
    expect(sql).toContain("unique(actor_user_id,source_type,source_id,event_type)");
    expect(sql).not.toContain("app_open");
  });
  test("reactions persist singularly and enforce visibility", () => {
    expect(sql).toContain("primary key(activity_id,user_id)");
    expect(sql).toContain("on conflict(activity_id,user_id) do update");
    expect(sql).toContain("delete from public.activity_reactions");
    expect(sql).toContain("activity_not_visible");
  });
  test("blocks filter reads and reports stay pending", () => {
    expect(sql).toContain("not public.community_is_blocked(auth.uid(),a.actor_user_id)");
    expect(sql).toContain("status text not null default 'pending'");
    expect(sql).toContain("if not valid then raise exception 'invalid_target'");
  });
  test("definers fix search_path and revoke public", () => {
    expect(
      (sql.match(/security definer set search_path=pg_catalog,public/g) ?? []).length,
    ).toBeGreaterThan(10);
    expect(sql).toContain("uid uuid:=auth.uid()");
    expect(sql).toContain("revoke all on function");
    expect(sql).toContain("grant execute on function");
  });
  test("errors map to honest UX", () => {
    expect(communityErrorMessage(new Error("username_taken"))).toContain("username");
    expect(communityErrorMessage(new Error("squad_full"))).toContain("completo");
    expect(communityErrorMessage(new Error("blocked"))).toContain("não está disponível");
  });
});
